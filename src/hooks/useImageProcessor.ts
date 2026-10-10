import { useCallback } from 'react';
import { ConversionSettings } from '../types';

export function useImageProcessor() {
  const processImage = useCallback(
    async (file: File, settings: ConversionSettings): Promise<{ blob: Blob; preview: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate dimensions
          let targetWidth = img.naturalWidth;
          let targetHeight = img.naturalHeight;

          if (settings.width && settings.height) {
            targetWidth = settings.width;
            targetHeight = settings.height;
          } else if (settings.width) {
            const ratio = settings.width / img.naturalWidth;
            targetWidth = settings.width;
            targetHeight = Math.round(img.naturalHeight * ratio);
          } else if (settings.height) {
            const ratio = settings.height / img.naturalHeight;
            targetWidth = Math.round(img.naturalWidth * ratio);
            targetHeight = settings.height;
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to desired format
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              const preview = URL.createObjectURL(blob);
              resolve({ blob, preview });
            },
            settings.format,
            settings.quality / 100
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image'));
        };

        img.src = objectUrl;
      });
    },
    []
  );

  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image'));
        };

        img.src = objectUrl;
      });
    },
    []
  );

  return { processImage, getImageDimensions };
}
