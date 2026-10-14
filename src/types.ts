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
