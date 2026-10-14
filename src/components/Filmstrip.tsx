import { useCallback, useRef, useState } from 'react';
import { X, Loader2, AlertCircle, Download, Plus, Film } from 'lucide-react';
import { MediaFile } from '../types';
import { ACCEPTED_TYPES, formatDuration, formatSavings, isAccepted } from '../utils/media';

interface FilmstripProps {
  files: MediaFile[];
  selectedFileId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (file: MediaFile) => void;
  onAddFiles: (files: File[]) => void;
}

export function Filmstrip({
  files,
  selectedFileId,
  onSelect,
  onRemove,
  onDownload,
  onAddFiles,
}: FilmstripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files || []).filter(isAccepted);
      if (newFiles.length > 0) {
        onAddFiles(newFiles);
      }
      e.target.value = '';
    },
    [onAddFiles]
  );

  return (
    <div
      className={`flex items-start gap-2 overflow-x-auto pb-1.5 scrollbar-thin ${
        isDragOver ? 'rounded-lg' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const newFiles = Array.from(e.dataTransfer.files).filter(isAccepted);
        if (newFiles.length > 0) {
          onAddFiles(newFiles);
        }
      }}
    >
      {files.map((file) => {
        const savings = file.processedSize
          ? Math.round((1 - file.processedSize / file.originalSize) * 100)
          : 0;
        const isSelected = file.id === selectedFileId;
        const duration = formatDuration(file.duration);

        return (
          <div key={file.id} className="group/card flex w-[88px] flex-shrink-0 flex-col gap-1">
            <button
              onClick={() => onSelect(file.id)}
              className={`checkerboard relative h-[66px] w-[88px] overflow-hidden rounded-md border transition-all ${
                isSelected
                  ? 'border-accent ring-1 ring-accent'
                  : 'border-line hover:border-ink-muted'
              } ${file.status === 'error' ? 'border-red-500/60' : ''}`}
              title={file.name}
            >
              {file.kind === 'video' && !file.videoThumb ? (
                <span className="flex h-full w-full items-center justify-center bg-surface-overlay text-ink-muted">
                  <Film className="h-5 w-5" />
                </span>
              ) : (
                <img
                  src={file.kind === 'video' ? file.videoThumb : file.preview}
                  alt={file.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              )}

              {file.kind === 'video' && duration && (
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] font-medium text-white">
                  {duration}
                </span>
              )}

              {/* Status indicators */}
              {file.status === 'processing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  {file.kind === 'video' && file.progress !== undefined && (
                    <span className="text-[10px] font-semibold text-white">
                      {Math.round(file.progress * 100)}%
                    </span>
                  )}
                </div>
              )}
              {file.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-950/60">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
              )}
              {file.status === 'done' && savings > 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-success/90 px-1 py-px text-[10px] font-semibold text-black">
                  {formatSavings(savings)}
                </span>
              )}

              {/* Hover actions */}
              <span className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
                {file.status === 'done' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onDownload(file);
                      }
                    }}
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-black/60 text-white hover:bg-success"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      onRemove(file.id);
                    }
                  }}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-black/60 text-white hover:bg-red-500"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            </button>
            <span
              className={`truncate text-center text-[11px] ${
                isSelected ? 'font-medium text-ink' : 'text-ink-muted'
              }`}
            >
              {file.name}
            </span>
          </div>
        );
      })}

      {/* Add more card */}
      <div className="flex w-[88px] flex-shrink-0 flex-col gap-1">
        <button
          onClick={() => inputRef.current?.click()}
          className={`flex h-[66px] w-[88px] items-center justify-center rounded-md border border-dashed transition-colors ${
            isDragOver
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink-secondary'
          }`}
          title="Add more media"
        >
          <Plus className="h-5 w-5" />
        </button>
        <span className="text-center text-[11px] text-ink-muted">Add</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
}
