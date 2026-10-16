export type MediaKind = 'image' | 'video';

export interface MediaFile {
  id: string;
  kind: MediaKind;
  file: File;
  /** Object URL of the source file — <img> src for images, <video> src for videos. */
  preview: string;
  /** Poster frame for videos (filmstrip thumbnail); undefined for images. */
  videoThumb?: string;
  name: string;
  originalSize: number;
  dimensions?: { width: number; height: number };
  /** Video duration in seconds. */
  duration?: number;
  processedBlob?: Blob;
  processedPreview?: string;
  processedSize?: number;
  /** 0–1 conversion progress for videos. */
  progress?: number;
  /** Human-readable failure reason shown in the UI. */
  error?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface ConversionSettings {
  format: OutputFormat;
  quality: number;
  width: number | null;
  height: number | null;
  maintainAspectRatio: boolean;
}

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type VideoOutputFormat = 'mp4' | 'webm';

export type VideoQualityTier = 'high' | 'medium' | 'low';

export interface VideoConversionSettings {
  format: VideoOutputFormat;
  quality: VideoQualityTier;
  width: number | null;
  height: number | null;
  maintainAspectRatio: boolean;
}

export function supportsVideoConversion(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

/* ── Transcription ──────────────────────────────────────────────────── */

export type AppView = 'convert' | 'transcribe';

export type TranscriptStatus = 'pending' | 'preparing' | 'processing' | 'done' | 'error';

export interface TranscriptWord {
  text: string;
  /** Start time in seconds, relative to source audio start. */
  start: number;
}

export interface TranscriptItem {
  id: string;
  name: string;
  source: 'file' | 'recording';
  file: File;
  /** Object URL for playable sources (audio files, recordings); revoked on remove. */
  preview?: string;
  /** Audio duration in seconds, known after preparation. */
  duration?: number;
  status: TranscriptStatus;
  /** 0–1: preparing = 0–0.1, decoding = 0.1–1. */
  progress?: number;
  /** Progressive decode output while chunking through the audio. */
  partialText?: string;
  text?: string;
  words?: TranscriptWord[];
  error?: string;
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelState {
  status: ModelStatus;
  loadedBytes: number;
  totalBytes: number;
  /** Sub-phase while status is 'loading'. */
  stage?: 'fetching' | 'initializing';
  backend?: 'webgpu' | 'wasm';
  error?: string;
}

/** Messages main thread → ASR worker. */
export type AsrWorkerRequest =
  | { type: 'load' }
  | { type: 'transcribe'; id: string; pcm: Float32Array; sampleRate: number }
  | { type: 'cancel'; id: string }
  | { type: 'unload' };

/** Messages ASR worker → main thread. */
export type AsrWorkerResponse =
  | { type: 'load-progress'; loadedBytes: number; totalBytes: number; fileName: string }
  | { type: 'load-stage'; stage: 'initializing' }
  | { type: 'load-ready'; backend: 'webgpu' | 'wasm' }
  | { type: 'load-error'; message: string }
  | { type: 'chunk-progress'; id: string; chunk: number; totalChunks: number }
  | { type: 'partial'; id: string; text: string }
  | { type: 'result'; id: string; text: string; words: TranscriptWord[] }
  | { type: 'error'; id: string; message: string; canceled?: boolean }
  | { type: 'unloaded' };
