import { useCallback, useEffect, useRef } from 'react';
import type { AsrWorkerResponse, TranscriptWord } from '../types';
import { PCM_SAMPLE_RATE, wavBufferToFloat32 } from '../utils/transcript';

export interface LoadProgressUpdate {
  stage: 'fetching' | 'initializing';
  loadedBytes?: number;
  totalBytes?: number;
}

export interface LoadResult {
  backend: 'webgpu' | 'wasm';
}

export interface TranscribeProgress {
  phase: 'preparing' | 'decoding';
  /** 0–1 across the whole pipeline (preparing = 0–0.1, decoding = 0.1–1). */
  progress: number;
}

interface TranscribeCallbacks {
  onProgress?: (p: TranscribeProgress) => void;
  onPartial?: (text: string, chunk: number, totalChunks: number) => void;
  onResult?: (r: { text: string; words: TranscriptWord[]; duration: number }) => void;
  onError?: (message: string, canceled: boolean) => void;
  chunk: number;
  totalChunks: number;
  duration: number;
  settle?: () => void;
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/**
 * Decodes any audio/video file to mono 16 kHz Float32 PCM on the main thread
 * (Web Audio API does not exist in workers). Tries native decodeAudioData first
 * and falls back to mediabunny for containers the browser can't decode (e.g. MKV).
 */
async function prepareAudio(
  file: File,
  opts: { onProgress?: (p: number) => void; signal?: AbortSignal }
): Promise<{ pcm: Float32Array; duration: number }> {
  const { onProgress, signal } = opts;
  try {
    throwIfAborted(signal);
    const ab = await file.arrayBuffer();
    throwIfAborted(signal);
    const decoded = await new OfflineAudioContext(1, 1, PCM_SAMPLE_RATE).decodeAudioData(ab);
    throwIfAborted(signal);

    const frames = Math.ceil(decoded.duration * PCM_SAMPLE_RATE);
    const off = new OfflineAudioContext(1, frames, PCM_SAMPLE_RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    throwIfAborted(signal);
    const pcm = rendered.getChannelData(0).slice();
    onProgress?.(1);
    return { pcm, duration: pcm.length / PCM_SAMPLE_RATE };
  } catch (err) {
    if (signal?.aborted) throw err;
    // Native decode failed — let mediabunny demux/decode/resample instead.
    const { Input, Output, Conversion, BufferTarget, BlobSource, WavOutputFormat, ALL_FORMATS } =
      await import('mediabunny');
    throwIfAborted(signal);

    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const target = new BufferTarget();
    const output = new Output({ format: new WavOutputFormat(), target });
    const conversion = await Conversion.init({
      input,
      output,
      audio: { numberOfChannels: 1, sampleRate: PCM_SAMPLE_RATE, sampleFormat: 'f32' },
    });
    if (!conversion.isValid) throw new Error('No audio track found in this file');
    conversion.onProgress = (p) => onProgress?.(p);

    const onAbort = () => {
      conversion.cancel().catch(() => {});
    };
    signal?.addEventListener('abort', onAbort);
    if (signal?.aborted) onAbort();
    try {
      await conversion.execute();
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }

    const wav = target.buffer;
    if (!wav) throw new Error('Audio extraction failed');
    const pcm = wavBufferToFloat32(wav);
    return { pcm, duration: pcm.length / PCM_SAMPLE_RATE };
  }
}

export function useTranscriber() {
  const workerRef = useRef<Worker | null>(null);
  const jobsRef = useRef(new Map<string, TranscribeCallbacks>());
  const loadRef = useRef<{
    onProgress?: (p: LoadProgressUpdate) => void;
    resolve?: (r: LoadResult) => void;
    reject?: (e: unknown) => void;
  } | null>(null);
  const unloadResolverRef = useRef<(() => void) | null>(null);

  const handleMessage = useCallback((msg: AsrWorkerResponse) => {
    switch (msg.type) {
      case 'load-progress':
        loadRef.current?.onProgress?.({
          stage: 'fetching',
          loadedBytes: msg.loadedBytes,
          totalBytes: msg.totalBytes,
        });
        break;
      case 'load-stage':
        loadRef.current?.onProgress?.({ stage: 'initializing' });
        break;
      case 'load-ready': {
        const load = loadRef.current;
        loadRef.current = null;
        load?.resolve?.({ backend: msg.backend });
        break;
      }
      case 'load-error': {
        const load = loadRef.current;
        loadRef.current = null;
        load?.reject?.(new Error(msg.message));
        break;
      }
      case 'chunk-progress': {
        const job = jobsRef.current.get(msg.id);
        if (job) {
          job.chunk = msg.chunk;
          job.totalChunks = msg.totalChunks;
          job.onProgress?.({
            phase: 'decoding',
            progress: 0.1 + 0.9 * ((msg.chunk - 1) / Math.max(1, msg.totalChunks)),
          });
        }
        break;
      }
      case 'partial': {
        const job = jobsRef.current.get(msg.id);
        if (job) job.onPartial?.(msg.text, job.chunk, job.totalChunks);
        break;
      }
      case 'result': {
        const job = jobsRef.current.get(msg.id);
        jobsRef.current.delete(msg.id);
        job?.onResult?.({ text: msg.text, words: msg.words, duration: job.duration });
        job?.settle?.();
        break;
      }
      case 'error': {
        const job = jobsRef.current.get(msg.id);
        jobsRef.current.delete(msg.id);
        job?.onError?.(msg.message, Boolean(msg.canceled));
        job?.settle?.();
        break;
      }
      case 'unloaded':
        unloadResolverRef.current?.();
        unloadResolverRef.current = null;
        break;
    }
  }, []);

  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('../workers/asr.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (ev: MessageEvent<AsrWorkerResponse>) => handleMessage(ev.data);
      workerRef.current = worker;
    }
    return workerRef.current;
  }, [handleMessage]);

  const dispose = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    jobsRef.current.clear();
    loadRef.current = null;
  }, []);

  // Terminate the worker (releases the model's memory) when the app unmounts.
  useEffect(() => dispose, [dispose]);

  const loadModel = useCallback(
    (opts: { onProgress?: (p: LoadProgressUpdate) => void } = {}) =>
      new Promise<LoadResult>((resolve, reject) => {
        getWorker();
        if (loadRef.current) {
          reject(new Error('Model load already in progress'));
          return;
        }
        loadRef.current = { onProgress: opts.onProgress, resolve, reject };
        workerRef.current!.postMessage({ type: 'load' });
      }),
    [getWorker]
  );

  const unloadModel = useCallback((): Promise<void> => {
    if (!workerRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      unloadResolverRef.current = resolve;
      workerRef.current!.postMessage({ type: 'unload' });
    });
  }, []);

  const transcribe = useCallback(
    async (
      id: string,
      file: File,
      opts: {
        onProgress?: (p: TranscribeProgress) => void;
        onPartial?: (text: string, chunk: number, totalChunks: number) => void;
        onResult?: (r: { text: string; words: TranscriptWord[]; duration: number }) => void;
        onError?: (message: string, canceled: boolean) => void;
        signal?: AbortSignal;
      } = {}
    ): Promise<void> => {
      const { onProgress, onPartial, onResult, onError, signal } = opts;

      try {
        throwIfAborted(signal);
        onProgress?.({ phase: 'preparing', progress: 0 });
        const { pcm, duration } = await prepareAudio(file, {
          onProgress: (p) => onProgress?.({ phase: 'preparing', progress: 0.1 * p }),
          signal,
        });
        throwIfAborted(signal);
        if (pcm.length < PCM_SAMPLE_RATE / 10) throw new Error('Audio too short');

        await new Promise<void>((resolve) => {
          const job: TranscribeCallbacks = {
            onProgress,
            onPartial,
            onResult,
            onError,
            chunk: 0,
            totalChunks: 0,
            duration,
            settle: resolve,
          };
          jobsRef.current.set(id, job);
          const worker = getWorker();
          const onAbort = () => worker.postMessage({ type: 'cancel', id });
          signal?.addEventListener('abort', onAbort, { once: true });
          worker.postMessage({ type: 'transcribe', id, pcm, sampleRate: PCM_SAMPLE_RATE }, [
            pcm.buffer,
          ]);
        });
      } catch (err) {
        const canceled =
          signal?.aborted === true || (err instanceof DOMException && err.name === 'AbortError');
        if (canceled) onError?.('Canceled', true);
        else onError?.(err instanceof Error ? err.message : String(err), false);
      }
    },
    [getWorker]
  );

  return { loadModel, unloadModel, transcribe, dispose };
}
