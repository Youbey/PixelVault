import { Github, Moon, Sun, Download, X } from 'lucide-react';
import { Logo } from './Logo';
import { formatDuration, formatSavings } from '../utils/media';

interface TopBarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  /** Workspace context; null when no files are loaded. */
  context: {
    fileName: string;
    dimensions: { width: number; height: number } | null;
    /** Video duration in seconds; undefined for images. */
    duration?: number;
    savings: number;
    hasResults: boolean;
  } | null;
  processedCount: number;
  onDownloadAll: () => void;
  isProcessing?: boolean;
  /** Progress text shown next to the spinner while converting (e.g. "2/3 · 45%"). */
  processingLabel?: string;
  onCancelProcessing?: () => void;
}

export function TopBar({
  darkMode,
  onToggleDarkMode,
  context,
  processedCount,
  onDownloadAll,
  isProcessing = false,
  processingLabel,
  onCancelProcessing,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-line bg-surface-raised/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-4">
        {/* Brand */}
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <Logo size={28} />
          <span className="text-sm font-semibold tracking-tight text-ink">PixelVault</span>
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-secondary sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            100% local
          </span>
        </div>

        {/* Context: selected file info */}
        {context && (
          <>
            <div className="hidden h-4 w-px bg-line md:block" />
            <div className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
              <span className="truncate font-medium text-ink">{context.fileName}</span>
              {context.dimensions && (
                <span className="flex-shrink-0 text-ink-muted">
                  {context.dimensions.width}×{context.dimensions.height}
                  {formatDuration(context.duration) && ` · ${formatDuration(context.duration)}`}
                </span>
              )}
              {context.hasResults && context.savings > 0 && (
                <span className="flex-shrink-0 rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                  {formatSavings(context.savings)}
                </span>
              )}
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* Processing indicator + cancel */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[13px] font-medium text-accent">
            <span className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <span className="hidden whitespace-nowrap sm:inline">
              {processingLabel || 'Converting…'}
            </span>
            {onCancelProcessing && (
              <span
                role="button"
                tabIndex={0}
                onClick={onCancelProcessing}
                onKeyDown={(e) => e.key === 'Enter' && onCancelProcessing()}
                className="ml-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-accent/20"
                title="Cancel conversion"
                aria-label="Cancel conversion"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {processedCount > 0 && (
          <button
            onClick={onDownloadAll}
            className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-[13px] font-medium text-success transition-colors hover:bg-success/20"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save all ({processedCount})</span>
            <span className="sm:hidden">{processedCount}</span>
          </button>
        )}

        <button
          onClick={onToggleDarkMode}
          className="rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-surface-overlay hover:text-ink"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <a
          href="https://github.com/Youbey/PixelVault"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-surface-overlay hover:text-ink"
          aria-label="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
