import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Download, Trash2, Zap, Lock, Eye, ArrowRight } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { DropZone } from './components/DropZone';
import { SettingsPanel } from './components/SettingsPanel';
import { ComparisonSlider } from './components/ComparisonSlider';
import { Filmstrip } from './components/Filmstrip';
import { useImageProcessor } from './hooks/useImageProcessor';
import { ImageFile, ConversionSettings } from './types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtension(format: string): string {
  switch (format) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.png';
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'image/webp',
    quality: 80,
    width: null,
    height: null,
    maintainAspectRatio: true,
  });

  const { processImage, getImageDimensions } = useImageProcessor();

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleFilesSelected = useCallback(
    async (newFiles: File[]) => {
      const imageFiles: ImageFile[] = [];

      for (const file of newFiles) {
        const id = uuidv4();
        const preview = URL.createObjectURL(file);
        imageFiles.push({
          id,
          file,
          preview,
          name: file.name,
          originalSize: file.size,
          status: 'pending',
        });
      }

      setFiles((prev) => [...prev, ...imageFiles]);
      if (imageFiles.length > 0 && !selectedFileId) {
        setSelectedFileId(imageFiles[0].id);
        try {
          const dims = await getImageDimensions(imageFiles[0].file);
          setOriginalDimensions(dims);
        } catch {
          setOriginalDimensions(null);
        }
      }
    },
    [selectedFileId, getImageDimensions]
  );

  const handleRemoveFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file) {
          URL.revokeObjectURL(file.preview);
          if (file.processedPreview) {
            URL.revokeObjectURL(file.processedPreview);
          }
        }
        return prev.filter((f) => f.id !== id);
      });
      if (selectedFileId === id) {
        setSelectedFileId(null);
        setOriginalDimensions(null);
        setShowComparison(false);
      }
    },
    [selectedFileId]
  );

  const handleDownloadFile = useCallback(
    (file: ImageFile) => {
      if (!file.processedBlob) return;
      const url = URL.createObjectURL(file.processedBlob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, '');
      a.download = `${baseName}_converted${getExtension(settings.format)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [settings.format]
  );

  const handleDownloadAll = useCallback(() => {
    files
      .filter((f) => f.status === 'done')
      .forEach((file, index) => {
        setTimeout(() => handleDownloadFile(file), index * 200);
      });
  }, [files, handleDownloadFile]);

  const handleProcessAll = useCallback(async () => {
    setIsProcessing(true);
    setShowComparison(false);

    for (const file of files) {
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: 'processing' as const } : f))
      );

      try {
        const result = await processImage(file.file, settings);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'done' as const,
                  processedBlob: result.blob,
                  processedPreview: result.preview,
                  processedSize: result.blob.size,
                }
              : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: 'error' as const } : f))
        );
      }
    }

    setIsProcessing(false);
    setShowComparison(true);
  }, [files, settings, processImage]);

  const handleSelectFile = useCallback(
    async (id: string) => {
      setSelectedFileId(id);
      setShowComparison(false);
      const file = files.find((f) => f.id === id);
      if (file) {
        try {
          const dims = await getImageDimensions(file.file);
          setOriginalDimensions(dims);
        } catch {
          setOriginalDimensions(null);
        }
      }
    },
    [files, getImageDimensions]
  );

  const handleClearAll = useCallback(() => {
    files.forEach((f) => {
      URL.revokeObjectURL(f.preview);
      if (f.processedPreview) URL.revokeObjectURL(f.processedPreview);
    });
    setFiles([]);
    setSelectedFileId(null);
    setOriginalDimensions(null);
    setShowComparison(false);
  }, [files]);

  const selectedFile = files.find((f) => f.id === selectedFileId);
  const processedCount = files.filter((f) => f.status === 'done').length;
  const totalOriginalSize = files.reduce((sum, f) => sum + f.originalSize, 0);
  const totalProcessedSize = files.reduce((sum, f) => sum + (f.processedSize || 0), 0);
  const totalSavings =
    totalOriginalSize > 0 ? Math.round((1 - totalProcessedSize / totalOriginalSize) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink transition-colors">
      <TopBar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        context={
          selectedFile
            ? {
                fileName: selectedFile.name,
                dimensions: originalDimensions,
                savings: totalSavings,
                hasResults: processedCount > 0,
              }
            : null
        }
        processedCount={processedCount}
        onDownloadAll={handleDownloadAll}
      />

      {files.length === 0 ? (
        /* ── Empty state: hero + drop zone ─────────────────────────── */
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-xl space-y-6 py-12">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Convert images. <span className="text-accent">Privately.</span>
              </h2>
              <p className="mx-auto max-w-md text-[13px] text-ink-secondary">
                Everything runs in this browser tab — your files never leave your device.
              </p>
            </div>

            <DropZone onFilesSelected={handleFilesSelected} />

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                No uploads
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Open source
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Instant
              </span>
            </div>
          </div>
        </main>
      ) : (
        /* ── Workspace ──────────────────────────────────────────────── */
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:h-[calc(100vh-3.5rem)] lg:flex-row lg:overflow-hidden">
          {/* Sidebar: settings + actions + stats */}
          <aside
            className="animate-fade-in order-2 flex flex-shrink-0 flex-col gap-3 scrollbar-thin lg:order-1 lg:w-[300px] lg:overflow-y-auto"
            aria-label="Conversion settings"
          >
            <section className="rounded-lg border border-line bg-surface-raised p-4">
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                originalDimensions={originalDimensions}
              />
            </section>

            <div className="flex gap-2">
              <button
                onClick={handleProcessAll}
                disabled={isProcessing}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Convert {files.length} image{files.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                onClick={handleClearAll}
                disabled={isProcessing}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                title="Clear all"
                aria-label="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {processedCount > 0 && (
              <section className="rounded-lg border border-line bg-surface-raised p-4">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  Results
                </div>
                <dl className="tool space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-ink-secondary">Original</dt>
                    <dd className="font-medium">{formatSize(totalOriginalSize)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-secondary">Converted</dt>
                    <dd className="font-medium text-success">{formatSize(totalProcessedSize)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <dt className="text-ink-secondary">Saved</dt>
                    <dd className="text-[15px] font-bold text-success">−{totalSavings}%</dd>
                  </div>
                </dl>
              </section>
            )}
          </aside>

          {/* Canvas + info + filmstrip */}
          <div className="animate-fade-in order-1 flex min-w-0 flex-1 flex-col gap-3 lg:order-2">
            <section className="checkerboard flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas lg:min-h-0">
              {selectedFile && showComparison && selectedFile.processedPreview ? (
                <div className="w-full p-2">
                  <ComparisonSlider
                    beforeSrc={selectedFile.preview}
                    afterSrc={selectedFile.processedPreview}
                    beforeLabel="Original"
                    afterLabel="Converted"
                  />
                </div>
              ) : selectedFile ? (
                <img
                  src={selectedFile.preview}
                  alt={selectedFile.name}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <p className="text-[13px] text-ink-muted">Select an image to preview</p>
              )}
            </section>

            {/* File info bar */}
            {selectedFile && (
              <div className="tool flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <div className="flex min-w-0 items-center gap-2 text-ink-muted">
                  <span className="max-w-[220px] truncate font-medium text-ink">
                    {selectedFile.name}
                  </span>
                  {originalDimensions && (
                    <span className="flex-shrink-0">
                      {originalDimensions.width}×{originalDimensions.height}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-ink-muted">
                  <span>{formatSize(selectedFile.originalSize)}</span>
                  {selectedFile.processedSize && (
                    <>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium text-success">
                        {formatSize(selectedFile.processedSize)}
                      </span>
                      <button
                        onClick={() => handleDownloadFile(selectedFile)}
                        className="flex items-center gap-1 rounded-md border border-line px-2 py-1 font-medium text-ink-secondary transition-colors hover:border-success/40 hover:bg-success/10 hover:text-success"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Filmstrip */}
            <div className="flex items-center gap-3">
              <span className="hidden flex-shrink-0 text-[11px] font-medium uppercase tracking-wider text-ink-muted sm:block">
                {processedCount}/{files.length}
              </span>
              <div className="min-w-0 flex-1">
                <Filmstrip
                  files={files}
                  selectedFileId={selectedFileId}
                  onSelect={handleSelectFile}
                  onRemove={handleRemoveFile}
                  onDownload={handleDownloadFile}
                  onAddFiles={handleFilesSelected}
                />
              </div>
            </div>
          </div>
        </main>
      )}

      {files.length === 0 && (
        <footer className="border-t border-line py-4">
          <p className="px-4 text-center text-[12px] text-ink-muted">
            PixelVault — local-only media converter · open source · nothing is ever uploaded
          </p>
        </footer>
      )}
    </div>
  );
}
