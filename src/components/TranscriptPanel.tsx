import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  AudioLines,
  Check,
  Copy,
  Download,
  FileAudio,
  Loader2,
  Mic,
  RefreshCw,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ModelState, TranscriptItem } from '../types';
import { formatDuration } from '../utils/media';

interface TranscriptPanelProps {
  model: ModelState;
  onLoadModel: () => void;
  onUnloadModel: () => void;
  items: TranscriptItem[];
  selectedId: string | null;
  onAddFiles: (files: File[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onTranscribe: (id: string) => void;
  onCancelTranscribe: (id: string) => void;
  onDownload: (id: string, fmt: 'txt' | 'srt') => void;
  onCopy: (id: string) => void;
  recorder: {
    isRecording: boolean;
    elapsedMs: number;
    error?: string;
    onStart: () => void;
    onStop: () => void;
  };
  /** Selected file in the convert view, offered for transcription. */
  selectedVideo: { name: string } | null;
  onTranscribeSelectedVideo: () => void;
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isTranscribable(file: File): boolean {
  return file.type.startsWith('audio/') || file.type.startsWith('video/');
}

/** Load / progress / status card for the bundled Whisper speech model. */
function ModelCard({
  model,
  onLoadModel,
  onUnloadModel,
}: {
  model: ModelState;
  onLoadModel: () => void;
  onUnloadModel: () => void;
}) {
  const pct =
    model.totalBytes > 0 ? Math.min(100, (model.loadedBytes / model.totalBytes) * 100) : 0;

  return (
    <section className="rounded-lg border border-line bg-surface-raised p-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
        Speech model
      </div>

      {model.status === 'idle' && (
        <div className="space-y-3 text-[13px]">
          <p className="font-medium text-ink">Load speech model</p>
          <p className="text-[12px] leading-relaxed text-ink-secondary">
            Whisper tiny.en (~43 MB) is bundled with PixelVault and loaded from this site — no
            third-party requests. Runs entirely in your browser; your files, recordings, and
            transcripts never leave your device.
          </p>
          <button
            onClick={onLoadModel}
            className="h-8 w-full rounded-md bg-accent text-[13px] font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Load model
          </button>
        </div>
      )}

      {model.status === 'loading' && model.stage !== 'initializing' && model.totalBytes > 0 && (
        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[12px] tabular-nums text-ink-secondary">
            {fmtMB(model.loadedBytes)} / {fmtMB(model.totalBytes)}
          </div>
        </div>
      )}

      {model.status === 'loading' && (model.stage === 'initializing' || model.totalBytes <= 0) && (
        <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          {model.stage === 'initializing' ? 'Initializing model…' : 'Loading model…'}
        </div>
      )}

      {model.status === 'ready' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded bg-success/10 px-2 py-0.5 text-[12px] font-semibold text-success">
              <Check className="h-3 w-3" /> Model ready
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                model.backend === 'webgpu'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface-overlay text-ink-muted'
              }`}
              title={
                model.backend === 'webgpu'
                  ? 'Hardware-accelerated inference'
                  : 'WebGPU unavailable — CPU inference, much slower'
              }
            >
              {model.backend === 'webgpu' ? 'WebGPU ⚡' : 'WASM (slower)'}
            </span>
          </div>
          <button
            onClick={onUnloadModel}
            className="text-[12px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            Unload (free memory)
          </button>
        </div>
      )}

      {model.status === 'error' && (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-[12px] text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{model.error || 'Model failed to load'}</span>
          </div>
          <button
            onClick={onLoadModel}
            className="text-[12px] font-medium text-accent underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

export function TranscriptPanel({
  model,
  onLoadModel,
  onUnloadModel,
  items,
  selectedId,
  onAddFiles,
  onSelect,
  onRemove,
  onTranscribe,
  onCancelTranscribe,
  onDownload,
  onCopy,
  recorder,
  selectedVideo,
  onTranscribeSelectedVideo,
}: TranscriptPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const modelReady = model.status === 'ready';

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const handleCopy = useCallback(
    (item: TranscriptItem) => {
      onCopy(item.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [onCopy]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const accepted = Array.from(files).filter(isTranscribable);
      if (accepted.length) onAddFiles(accepted);
    },
    [onAddFiles]
  );

  const statusIcon = (item: TranscriptItem) => {
    switch (item.status) {
      case 'preparing':
      case 'processing':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />;
      case 'done':
        return <Check className="h-3.5 w-3.5 text-success" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
      {/* Left column: model + inputs */}
      <aside
        className="flex flex-shrink-0 flex-col gap-3 lg:w-[300px] lg:overflow-y-auto lg:pr-1"
        aria-label="Transcription controls"
      >
        <ModelCard model={model} onLoadModel={onLoadModel} onUnloadModel={onUnloadModel} />

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={recorder.isRecording}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-[13px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
          <button
            onClick={recorder.isRecording ? recorder.onStop : recorder.onStart}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors ${
              recorder.isRecording
                ? 'animate-pulse border-red-500/50 bg-red-500/10 text-red-500'
                : 'border-line text-ink-secondary hover:border-accent/40 hover:text-ink'
            }`}
            title={recorder.isRecording ? 'Stop recording' : 'Record from microphone'}
          >
            {recorder.isRecording ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="tabular-nums">{fmtElapsed(recorder.elapsedMs)}</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" /> Record
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {recorder.error && <p className="text-[12px] text-red-500">{recorder.error}</p>}

        {selectedVideo && (
          <button
            onClick={onTranscribeSelectedVideo}
            disabled={recorder.isRecording}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            title="Add the video selected in the convert view to this transcript list"
          >
            <AudioLines className="h-3.5 w-3.5" />
            <span className="truncate">Transcribe: {selectedVideo.name}</span>
          </button>
        )}

        <p className="text-[11px] leading-relaxed text-ink-muted">
          Files never leave your device. Transcription is offline after the model download.
        </p>
      </aside>

      {/* Right column: item list + detail */}
      <section
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${isDragOver ? 'rounded-lg border-2 border-dashed border-accent bg-accent/5' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line bg-canvas p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface-overlay text-ink-muted">
              <AudioLines className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-ink">Drop audio or video to transcribe</p>
              <p className="text-[13px] text-ink-muted">
                MP3, WAV, M4A, MP4, WebM, MKV · or hit Record above
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 items-center gap-1.5 rounded-md border border-line px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
            >
              <Upload className="h-3.5 w-3.5" /> Browse files
            </button>
          </div>
        ) : (
          <>
            {/* Compact list */}
            <div className="flex flex-col gap-1.5">
              {items.map((item) => {
                const active = item.status === 'preparing' || item.status === 'processing';
                return (
                  <div
                    key={item.id}
                    className={`group flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors ${
                      item.id === selectedId
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-line bg-surface-raised hover:border-ink-muted/40'
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.source === 'recording' ? (
                      <Mic className="h-3.5 w-3.5 flex-shrink-0 text-ink-muted" />
                    ) : (
                      <FileAudio className="h-3.5 w-3.5 flex-shrink-0 text-ink-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">
                      {item.name}
                    </span>
                    {item.duration !== undefined && (
                      <span className="flex-shrink-0 text-[11px] tabular-nums text-ink-muted">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                    {active && item.progress !== undefined && (
                      <span className="flex-shrink-0 text-[11px] tabular-nums text-accent">
                        {Math.round(item.progress * 100)}%
                      </span>
                    )}
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      {statusIcon(item)}
                    </span>
                    {active ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelTranscribe(item.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded text-ink-muted opacity-0 transition-opacity hover:bg-surface-overlay hover:text-ink group-hover:opacity-100"
                        title="Cancel"
                        aria-label="Cancel transcription"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded text-ink-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                        title="Remove"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail */}
            <div className="checkerboard mt-3 flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-lg border border-line bg-canvas">
              {selected && (
                <>
                  <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised/60 px-4 py-2.5">
                    <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                      {selected.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {(selected.status === 'done' || selected.status === 'error') && (
                        <button
                          onClick={() => onTranscribe(selected.id)}
                          disabled={!modelReady && selected.status === 'error'}
                          title={!modelReady ? 'Load the model first' : undefined}
                          className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" />{' '}
                          {selected.status === 'error' ? 'Retry' : 'Re-run'}
                        </button>
                      )}
                      {selected.status === 'done' && selected.text && (
                        <>
                          <button
                            onClick={() => handleCopy(selected)}
                            className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => onDownload(selected.id, 'txt')}
                            className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
                          >
                            <Download className="h-3 w-3" /> .txt
                          </button>
                          {selected.words && selected.words.length > 0 && (
                            <button
                              onClick={() => onDownload(selected.id, 'srt')}
                              className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
                            >
                              <Download className="h-3 w-3" /> .srt
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                    {selected.preview && (
                      <audio controls src={selected.preview} className="h-9 w-full" />
                    )}

                    {selected.status === 'preparing' && (
                      <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        Preparing audio…
                      </div>
                    )}

                    {(selected.status === 'processing' || selected.status === 'preparing') && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-150"
                          style={{ width: `${Math.round((selected.progress ?? 0) * 100)}%` }}
                        />
                      </div>
                    )}

                    {selected.status === 'processing' && (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                        {selected.partialText || (
                          <span className="text-ink-muted">Transcribing…</span>
                        )}
                        <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-accent/60 align-middle" />
                      </p>
                    )}

                    {selected.status === 'done' && (
                      <>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                          {selected.text?.trim() || (
                            <span className="italic text-ink-muted">(no speech detected)</span>
                          )}
                        </p>
                        {selected.words && selected.words.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-[12px] text-ink-muted">
                              Word timestamps ({selected.words.length})
                            </summary>
                            <div className="mt-1 max-h-48 overflow-y-auto font-mono text-[11px] text-ink-muted">
                              {selected.words.map((w, i) => (
                                <div key={i}>
                                  {w.start.toFixed(2).padStart(7)}&nbsp;&nbsp;{w.text}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </>
                    )}

                    {selected.status === 'error' && (
                      <div className="flex items-start gap-2 text-[13px] text-red-500">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{selected.error || 'Transcription failed'}</span>
                      </div>
                    )}

                    {selected.status === 'pending' && (
                      <div className="flex flex-1 items-center justify-center">
                        <button
                          onClick={() => onTranscribe(selected.id)}
                          disabled={!modelReady}
                          title={!modelReady ? 'Load the model first' : undefined}
                          className="flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <AudioLines className="h-4 w-4" />
                          {modelReady ? 'Transcribe' : 'Load model to transcribe'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
