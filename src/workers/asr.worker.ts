// Whisper tiny.en in-browser ASR via @huggingface/transformers (ONNX Runtime
// Web; encoder on WebGPU when available, WASM fallback). Weights are
// FIRST-PARTY assets vendored under public/models/ and served from this
// site — env.allowRemoteModels is disabled so nothing is ever fetched from
// Hugging Face or any CDN at runtime.
import type { AsrWorkerRequest, AsrWorkerResponse, TranscriptWord } from '../types';
import { splitIntoChunks } from '../utils/transcript';
import { env, pipeline } from '@huggingface/transformers';
// The ort build transformers.js loads (onnxruntime-web/webgpu) resolves the
// *asyncify* wasm pair — see ort.webgpu.bundle.min.mjs; the jsep pair would
// never be fetched and wasmPaths would fall back to their CDN default.
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

// tsconfig includes only the DOM lib (no webworker) to avoid identifier
// collisions — cast self to a minimal worker shape instead of /// <reference>.
interface WorkerScope {
  postMessage(msg: AsrWorkerResponse, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (ev: MessageEvent<AsrWorkerRequest>) => void): void;
}
const ctx = self as unknown as WorkerScope;
const post = (msg: AsrWorkerResponse, transfer?: Transferable[]) => ctx.postMessage(msg, transfer);

// Privacy invariant: models load only from this origin (GitHub Pages serves
// them like any other app asset). NEVER re-enable remote model loading.
env.allowRemoteModels = false;
env.allowLocalModels = true;
// MUST be an origin-relative path (not an absolute URL): transformers'
// get_file_metadata only probes local files when localPath is NOT a URL
// (`if (!isURL)`), so a URL-style value silently reports every file missing
// (no processor/tokenizer → "feature_extractor of null" at first transcribe).
env.localModelPath = `${import.meta.env.BASE_URL}models/`;

// Point ort at LOCAL wasm assets (no CDN) and pin one thread: GitHub Pages
// cannot set COOP/COEP, so crossOriginIsolated is false and threaded WASM is
// unavailable. `env.backends.onnx` is a shallow copy exposing transformers'
// live ort env — mutate the shared `wasm` object's properties in place;
// replacing the object would never reach the real ort instance (and their
// module init has already written a cdn.jsdelivr default by this point).
const ortWasm = env.backends.onnx.wasm;
if (ortWasm) {
  ortWasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
  ortWasm.numThreads = 1;
}

interface AsrOutput {
  text?: string;
  chunks?: { text?: string; timestamp?: [number | null, number | null] }[];
}
type AsrPipeline = (audio: Float32Array, kwargs?: Record<string, unknown>) => Promise<AsrOutput>;

interface JobFlags {
  canceled: boolean;
}

let asr: AsrPipeline | null = null;
let backend: 'webgpu' | 'wasm' = 'wasm';
let loading = false;
const jobFlags = new Map<string, JobFlags>();
const canceledIds = new Set<string>();
// Serializes transcribe jobs — the pipeline/session is not safe to run
// concurrently, and cancel may arrive while a job is still queued.
let chain: Promise<void> = Promise.resolve();

async function load() {
  if (asr) {
    post({ type: 'load-ready', backend });
    return;
  }
  if (loading) return;
  loading = true;

  try {
    const fileProgress = new Map<string, { loaded: number; total: number }>();
    const onnxDone = new Set<string>();
    let initializingPosted = false;

    const progressCallback = (event: {
      status?: string;
      file?: string;
      name?: string;
      loaded?: number;
      total?: number;
    }) => {
      const file = typeof event.file === 'string' ? event.file : '';
      if (event.status === 'progress' && file && typeof event.loaded === 'number') {
        fileProgress.set(file, {
          loaded: event.loaded,
          total:
            typeof event.total === 'number' && event.total > 0
              ? event.total
              : (fileProgress.get(file)?.total ?? 0),
        });
        let loadedBytes = 0;
        let totalBytes = 0;
        for (const slot of fileProgress.values()) {
          loadedBytes += slot.loaded;
          totalBytes += slot.total;
        }
        post({ type: 'load-progress', loadedBytes, totalBytes, fileName: file });
      } else if (event.status === 'done' && file.endsWith('.onnx')) {
        onnxDone.add(file);
        // Both ONNX sessions' bytes are local — session creation begins.
        if (onnxDone.size >= 2 && !initializingPosted) {
          initializingPosted = true;
          post({ type: 'load-stage', stage: 'initializing' });
        }
      }
    };

    const opts = { dtype: 'q8' as const, progress_callback: progressCallback };

    // Probe WebGPU ourselves: headless/GPU-less Chrome still exposes
    // navigator.gpu while requestAdapter() returns null, and transformers'
    // auto-device then picks webgpu and dies with "no available backend".
    // (TS 5.7's DOM lib has no WebGPU types — minimal local shape.)
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    let gpuAvailable = false;
    if (gpu) {
      try {
        gpuAvailable = Boolean(await gpu.requestAdapter());
      } catch {
        gpuAvailable = false;
      }
    }

    let created: AsrPipeline | null = null;
    if (gpuAvailable) {
      try {
        created = (await pipeline('automatic-speech-recognition', 'whisper-tiny.en', {
          ...opts,
          device: 'webgpu',
        })) as unknown as AsrPipeline;
        backend = 'webgpu';
      } catch {
        created = null; // fall back to wasm below
      }
    }
    if (!created) {
      backend = 'wasm';
      // Explicit 'wasm' — never rely on auto-device, it re-picks webgpu.
      created = (await pipeline('automatic-speech-recognition', 'whisper-tiny.en', {
        ...opts,
        device: 'wasm',
      })) as unknown as AsrPipeline;
    }
    asr = created;
    post({ type: 'load-ready', backend });
  } catch (err) {
    post({ type: 'load-error', message: err instanceof Error ? err.message : String(err) });
  } finally {
    loading = false;
  }
}

async function handleTranscribe(
  id: string,
  pcm: Float32Array,
  sampleRate: number,
  flags: JobFlags
) {
  try {
    if (!asr) throw new Error('Model not loaded');

    const chunks = splitIntoChunks(pcm, sampleRate);
    const texts: string[] = [];
    const words: TranscriptWord[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (flags.canceled) throw new Error('Canceled');
      post({ type: 'chunk-progress', id, chunk: i + 1, totalChunks: chunks.length });
      const [a, b] = chunks[i];
      const offset = a / sampleRate;
      // Copy the slice: the pipeline may touch .buffer, which would go past a
      // subarray view's byteOffset.
      const out = await asr(pcm.slice(a, b), { return_timestamps: 'word' });
      texts.push((out.text ?? '').trim());
      for (const chunk of out.chunks ?? []) {
        const start = chunk.timestamp?.[0];
        const word = (chunk.text ?? '').trim();
        if (word && typeof start === 'number' && Number.isFinite(start)) {
          words.push({ text: word, start: offset + start });
        }
      }
      post({ type: 'partial', id, text: texts.filter(Boolean).join(' ') });
    }

    post({ type: 'result', id, text: texts.filter(Boolean).join(' '), words });
  } catch (err) {
    const canceled = flags.canceled;
    post({
      type: 'error',
      id,
      message: canceled ? 'Canceled' : err instanceof Error ? err.message : String(err),
      canceled,
    });
  } finally {
    jobFlags.delete(id);
    canceledIds.delete(id);
  }
}

async function unload() {
  const pipe = asr as (AsrPipeline & { dispose?: () => Promise<void> }) | null;
  asr = null;
  try {
    await pipe?.dispose?.();
  } catch {
    /* releasing sessions is best-effort */
  }
  post({ type: 'unloaded' });
}

ctx.addEventListener('message', ({ data }) => {
  switch (data.type) {
    case 'load':
      void load();
      break;
    case 'transcribe': {
      const flags: JobFlags = { canceled: canceledIds.has(data.id) };
      jobFlags.set(data.id, flags);
      const req = data;
      chain = chain.then(() => handleTranscribe(req.id, req.pcm, req.sampleRate, flags));
      break;
    }
    case 'cancel': {
      const flags = jobFlags.get(data.id);
      if (flags) flags.canceled = true;
      else canceledIds.add(data.id);
      break;
    }
    case 'unload':
      void unload();
      break;
  }
});
