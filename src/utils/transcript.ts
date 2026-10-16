import type { TranscriptItem, TranscriptWord } from '../types';

/** PCM sample rate the pipeline normalizes to (Phonon-2 expects 16 kHz mono). */
export const PCM_SAMPLE_RATE = 16000;

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

function readFourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/**
 * Extracts mono float32 PCM from an IEEE-float (format 3) 32-bit WAV buffer.
 * Walks RIFF chunks — mediabunny may prepend LIST/info metadata, so the data
 * chunk cannot be assumed to start at byte 44.
 */
export function wavBufferToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || readFourCC(view, 0) !== 'RIFF' || readFourCC(view, 8) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

  let audioFormat = 0;
  let bitsPerSample = 0;
  let data: { byteOffset: number; byteLength: number } | null = null;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readFourCC(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (body > view.byteLength) break;
    if (id === 'fmt ') {
      if (size >= 16) {
        audioFormat = view.getUint16(body, true);
        bitsPerSample = view.getUint16(body + 14, true);
      }
    } else if (id === 'data') {
      data = { byteOffset: body, byteLength: Math.min(size, view.byteLength - body) };
    }
    offset = body + size + (size % 2); // RIFF chunks are word-aligned
  }

  if (!data) throw new Error('Malformed WAV file (no data chunk)');
  if (audioFormat !== 3 || bitsPerSample !== 32) {
    throw new Error(`Unsupported WAV encoding (format ${audioFormat}, ${bitsPerSample}-bit)`);
  }

  const aligned =
    data.byteOffset % 4 === 0
      ? new Uint8Array(buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(buffer, data.byteOffset, data.byteLength).slice();
  return new Float32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 4).slice();
}

/**
 * Splits PCM into ≤30 s chunks, cutting at the lowest-energy pause so words
 * aren't sliced mid-syllable. Ported from the reference phonon-2-web worker.
 */
export function splitIntoChunks(
  pcm: Float32Array,
  sampleRate = PCM_SAMPLE_RATE
): [number, number][] {
  const max = 30 * sampleRate;
  const out: [number, number][] = [];
  const win = Math.floor(sampleRate / 10); // 0.1 s energy window
  let start = 0;

  while (pcm.length - start > max) {
    const lo = start + max - 5 * sampleRate; // cut zone: last 5 s of the window
    let best = lo;
    let bestE = Infinity;
    for (let s = lo; s + win <= start + max; s += win / 2) {
      let e = 0;
      for (let i = s; i < s + win; i++) e += pcm[i] * pcm[i];
      if (e < bestE) {
        bestE = e;
        best = s + win / 2;
      }
    }
    out.push([start, best]);
    start = best;
  }
  out.push([start, pcm.length]);
  return out;
}

/**
 * Groups words into subtitle-sized segments. Closes a segment on sentence
 * punctuation, 12 words, a >1 s gap, or an >8 s span. WHY: Phonon-2 emits
 * word start-times only, so segment ends are derived from the next start.
 */
export function groupWordsToSegments(
  words: TranscriptWord[],
  duration?: number
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TranscriptWord[] = [];

  const flush = (nextStart?: number) => {
    if (!current.length) return;
    const start = current[0].start;
    const last = current[current.length - 1];
    const end =
      nextStart !== undefined
        ? Math.max(start + 0.2, nextStart - 0.05)
        : Math.max(start + 0.2, duration ?? last.start + 0.8);
    const text = current
      .map((w) => w.text)
      .join(' ')
      .trim();
    if (text) segments.push({ start, end, text });
    current = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const next = words[i + 1];
    current.push(word);
    const close =
      !next ||
      /[.?!]$/.test(word.text) ||
      current.length >= 12 ||
      next.start - word.start > 1.0 ||
      next.start - current[0].start > 8;
    if (close) flush(next?.start);
  }
  flush();
  return segments;
}

export function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.round(Math.max(0, seconds) * 1000);
  const ms = totalMs % 1000;
  const totalS = (totalMs - ms) / 1000;
  const s = totalS % 60;
  const totalM = Math.floor(totalS / 60);
  const m = totalM % 60;
  const h = Math.floor(totalM / 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

export function formatTranscriptTxt(item: Pick<TranscriptItem, 'text'>): string {
  return (item.text ?? '').trim();
}

export function formatTranscriptSrt(item: Pick<TranscriptItem, 'words' | 'duration'>): string {
  const segments = groupWordsToSegments(item.words ?? [], item.duration);
  return segments
    .map(
      (seg, i) =>
        `${i + 1}\n${formatSrtTimestamp(seg.start)} --> ${formatSrtTimestamp(seg.end)}\n${seg.text}\n`
    )
    .join('\n');
}
