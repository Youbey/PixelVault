export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  originalSize: number;
  processedBlob?: Blob;
  processedPreview?: string;
  processedSize?: number;
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

export type ProcessingMode = 'single' | 'batch';
