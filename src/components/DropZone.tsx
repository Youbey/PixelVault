import { useCallback, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function DropZone({ onFilesSelected }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
      e.target.value = '';
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group relative cursor-pointer rounded-lg border border-dashed p-10 text-center transition-all duration-200 sm:p-14
        ${
          isDragOver
            ? 'border-accent bg-accent/5 shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_10%,transparent)]'
            : 'border-line bg-surface-raised hover:border-ink-muted'
        }
      `}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`
            flex h-14 w-14 items-center justify-center rounded-lg border transition-colors duration-200
            ${
              isDragOver
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line bg-surface-overlay text-ink-muted group-hover:text-ink-secondary'
            }
          `}
        >
          {isDragOver ? <ImagePlus className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
        </div>

        <div>
          <p className="text-base font-medium text-ink">
            {isDragOver ? 'Drop to add' : 'Drag & drop images'}
          </p>
          <p className="mt-1 text-[13px] text-ink-muted">
            or <span className="text-accent underline-offset-2 hover:underline">browse</span> — JPG,
            PNG, WebP, AVIF, GIF, BMP
          </p>
        </div>
      </div>
    </div>
  );
}
