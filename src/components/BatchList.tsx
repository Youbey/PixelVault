import { X, Loader2, AlertCircle, Download } from 'lucide-react';
import { ImageFile } from '../types';

interface BatchListProps {
  files: ImageFile[];
  onRemove: (id: string) => void;
  onDownload: (file: ImageFile) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BatchList({ files, onRemove, onDownload }: BatchListProps) {
  return (
    <div className="space-y-2">
      {files.map((file) => {
        const savings = file.processedSize
          ? Math.round((1 - file.processedSize / file.originalSize) * 100)
          : 0;

        return (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 group hover:border-violet-200 dark:hover:border-violet-800 transition-all"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              <img
                src={file.preview}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatSize(file.originalSize)}</span>
                {file.processedSize && (
                  <>
                    <span>→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatSize(file.processedSize)}
                    </span>
                    {savings > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                        -{savings}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Status / Actions */}
            <div className="flex items-center gap-1">
              {file.status === 'processing' && (
                <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              )}
              {file.status === 'done' && (
                <button
                  onClick={() => onDownload(file)}
                  className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              {file.status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <button
                onClick={() => onRemove(file.id)}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
