import { useCallback } from 'react';
import { VideoConversionSettings } from '../types';
// Type-only: erased at build time, keeps mediabunny lazy-loaded until first conversion.
import type { BufferTarget, Quality } from 'mediabunny';
interface ConvertOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

function loadVideoMetadata(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = src;
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('error', onError);
      reject(new Error('Failed to seek video'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

export function useVideoProcessor() {
  const probeVideo = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const video = await loadVideoMetadata(url);
      return {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const captureThumb = useCallback(async (file: File, duration?: number): Promise<string> => {
    const url = URL.createObjectURL(file);
    try {
      const video = await loadVideoMetadata(url);
      // Prefer the passed duration, else the element's own (absent for live-recorded WebM).
      const dur = duration ?? (Number.isFinite(video.duration) ? video.duration : undefined);
      // Seek ~10% in for a representative frame; fall back to 0.1s so the very
      // first (often black) frame isn't captured when duration is unknown.
      const seekTo = dur && dur > 0 ? Math.min(dur * 0.1, dur - 0.1) : 0.1;
      await seekVideo(video, seekTo);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.7)
      );
      if (!blob) throw new Error('Failed to capture thumbnail');
      return URL.createObjectURL(blob);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const convertVideo = useCallback(
    async (
      file: File,
      settings: VideoConversionSettings,
      { onProgress, signal }: ConvertOptions = {}
    ): Promise<{ blob: Blob; preview: string }> => {
      const run = async (hardwareAcceleration: 'prefer-hardware' | 'no-preference') => {
        const {
          Input,
          Output,
          Conversion,
          BufferTarget: BufferTargetCtor,
          BlobSource,
          Mp4OutputFormat,
          WebMOutputFormat,
          Quality: QualityCtor,
          ALL_FORMATS,
        } = await import('mediabunny');

        const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
        const output = new Output({
          format: settings.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
          target: new BufferTargetCtor(),
        });

        // Prefer GPU encoders (NVENC/VideoToolbox/VAAPI); retried without the hint
        // below because some environments reject unsupported hardware configs
        // instead of falling back to software.
        const video: {
          quality: Quality;
          hardwareAcceleration: 'prefer-hardware' | 'no-preference';
          width?: number;
          height?: number;
          fit?: 'fill' | 'contain' | 'cover';
        } = {
          quality: new QualityCtor(settings.quality),
          hardwareAcceleration,
        };
        if (settings.width) video.width = settings.width;
        if (settings.height) video.height = settings.height;
        // Mediabunny requires an explicit fit when both dimensions are given;
        // 'fill' honors the exact dimensions the user entered.
        if (settings.width && settings.height) video.fit = 'fill';

        const conversion = await Conversion.init({
          input,
          output,
          video,
          audio: { quality: new QualityCtor(settings.quality) },
        });

        if (onProgress) {
          conversion.onProgress = (progress) => onProgress(progress);
        }

        const onAbort = () => {
          conversion.cancel().catch(() => {});
        };
        signal?.addEventListener('abort', onAbort);
        if (signal?.aborted) onAbort();

        try {
          await conversion.execute();
          const buffer = (output.target as BufferTarget).buffer;
          if (!buffer) throw new Error('Conversion produced no output');
          const blob = new Blob([buffer], {
            type: settings.format === 'mp4' ? 'video/mp4' : 'video/webm',
          });
          return { blob, preview: URL.createObjectURL(blob) };
        } finally {
          signal?.removeEventListener('abort', onAbort);
        }
      };

      try {
        return await run('prefer-hardware');
      } catch (err) {
        if (signal?.aborted) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        if (/not supported in this environment/i.test(msg)) {
          return await run('no-preference');
        }
        throw err;
      }
    },
    []
  );

  return { probeVideo, captureThumb, convertVideo };
}
