import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Download,
  DownloadCloud,
  Trash2,
  Zap,
  Shield,
  Eye,
  Lock,
  Cpu,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SettingsPanel } from './components/SettingsPanel';
import { ComparisonSlider } from './components/ComparisonSlider';
import { BatchList } from './components/BatchList';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {files.length === 0 && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Zero-knowledge image processing
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Convert images{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">
                privately
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              All processing happens right here in your browser. Your images never leave your
              device. Convert, compress, and resize — instantly.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>No server uploads</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Eye className="w-4 h-4 text-blue-500" />
                <span>Open & transparent</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Cpu className="w-4 h-4 text-orange-500" />
                <span>WebAssembly powered</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Lightning fast</span>
              </div>
            </div>
          </div>
        )}

        {/* Drop Zone */}
        <DropZone onFilesSelected={handleFilesSelected} />

        {/* Main Content */}
        {files.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Settings */}
            <div className="lg:col-span-3 space-y-4">
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
                originalDimensions={originalDimensions}
              />

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleProcessAll}
                  disabled={isProcessing || files.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Convert {files.length} image{files.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>

                {processedCount > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <DownloadCloud className="w-5 h-5" />
                    Download All ({processedCount})
                  </button>
                )}

                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>

              {/* Stats */}
              {processedCount > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4">
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                    Results
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Original</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatSize(totalOriginalSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Converted</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatSize(totalProcessedSize)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-800">
                      <span className="text-gray-600 dark:text-gray-400">Saved</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {totalSavings}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Center: Preview & Comparison */}
            <div className="lg:col-span-5 space-y-4">
              {/* File Tabs */}
              {files.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file.id)}
                      className={`
                        flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                        ${
                          selectedFileId === file.id
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent'
                        }
                      `}
                    >
                      <img src={file.preview} alt="" className="w-5 h-5 rounded object-cover" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      {file.status === 'done' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      {file.status === 'processing' && (
                        <div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Preview Area */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {selectedFile && showComparison && selectedFile.processedPreview ? (
                  <div className="p-4">
                    <ComparisonSlider
                      beforeSrc={selectedFile.preview}
                      afterSrc={selectedFile.processedPreview}
                      beforeLabel="Original"
                      afterLabel="Converted"
                    />
                  </div>
                ) : selectedFile ? (
                  <div className="p-4">
                    <div className="aspect-video flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
                      <img
                        src={selectedFile.preview}
                        alt={selectedFile.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400">Select an image to preview</div>
                )}

                {/* File info bar */}
                {selectedFile && (
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {selectedFile.name}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {originalDimensions &&
                          `${originalDimensions.width} × ${originalDimensions.height}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatSize(selectedFile.originalSize)}
                      </span>
                      {selectedFile.processedSize && (
                        <>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatSize(selectedFile.processedSize)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Download button for single file */}
              {selectedFile?.status === 'done' && selectedFile.processedBlob && (
                <button
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedFile.name.replace(/\.[^.]+$/, '')}_converted
                  {getExtension(settings.format)}
                </button>
              )}
            </div>

            {/* Right: Batch List */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Files ({files.length})
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {processedCount}/{files.length} converted
                  </span>
                </div>
                <BatchList
                  files={files}
                  onRemove={handleRemoveFile}
                  onDownload={handleDownloadFile}
                />
              </div>
            </div>
          </div>
        )}

        {/* Features Section (shown when no files) */}
        {files.length === 0 && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-violet-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Convert & Compress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Transform images between WebP, JPEG, and PNG formats. Reduce file sizes by up to 80%
                with smart compression.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">100% Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your files never leave your device. All processing happens locally in your browser
                using WebAssembly technology.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Batch Processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Process multiple images at once. Perfect for optimizing photos for websites, social
                media, or email attachments.
              </p>
            </div>
          </div>
        )}

        {/* How it works section */}
        {files.length === 0 && (
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Drop Files', desc: 'Drag & drop or browse for images' },
                { step: '2', title: 'Configure', desc: 'Choose format, quality & size' },
                { step: '3', title: 'Convert', desc: 'Processing happens in your browser' },
                { step: '4', title: 'Download', desc: 'Save your optimized images' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/25">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            PixelVault — All processing happens locally in your browser. No data is ever sent to any
            server.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Built with React, Tailwind CSS, and the Canvas API. Open source & privacy-first.
          </p>
        </div>
      </footer>
    </div>
  );
}
