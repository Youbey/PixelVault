import { Link2, Link2Off } from 'lucide-react';
import { VideoConversionSettings, VideoOutputFormat, VideoQualityTier } from '../types';

interface VideoSettingsPanelProps {
  settings: VideoConversionSettings;
  onSettingsChange: (settings: VideoConversionSettings) => void;
  originalDimensions: { width: number; height: number } | null;
}

const FORMAT_OPTIONS: { value: VideoOutputFormat; label: string; note: string }[] = [
  { value: 'mp4', label: 'MP4', note: 'H.264' },
  { value: 'webm', label: 'WebM', note: 'VP9' },
];

const QUALITY_OPTIONS: { value: VideoQualityTier; label: string; note: string }[] = [
  { value: 'high', label: 'High', note: 'largest' },
  { value: 'medium', label: 'Balanced', note: '' },
  { value: 'low', label: 'Small', note: 'smallest' },
];

/** Short-side resolution presets — orientation-agnostic like HandBrake. */
const SCALE_PRESETS = [
  { label: 'Original', value: null as number | null },
  { label: '1080p', value: 1080 },
  { label: '720p', value: 720 },
  { label: '480p', value: 480 },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </div>
  );
}

export function VideoSettingsPanel({
  settings,
  onSettingsChange,
  originalDimensions,
}: VideoSettingsPanelProps) {
  const updateSetting = <K extends keyof VideoConversionSettings>(
    key: K,
    value: VideoConversionSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const applyShortSide = (shortSide: number) => {
    if (!originalDimensions) return;
    const { width, height } = originalDimensions;
    if (width >= height) {
      const newHeight = shortSide;
      const newWidth = Math.round((width * shortSide) / height);
      onSettingsChange({ ...settings, width: newWidth, height: newHeight });
    } else {
      const newWidth = shortSide;
      const newHeight = Math.round((height * shortSide) / width);
      onSettingsChange({ ...settings, width: newWidth, height: newHeight });
    }
  };

  const handleWidthChange = (value: string) => {
    const width = value === '' ? null : parseInt(value);
    if (width === null) {
      updateSetting('width', null);
      return;
    }
    if (settings.maintainAspectRatio && originalDimensions) {
      const ratio = originalDimensions.height / originalDimensions.width;
      updateSetting('width', width);
      updateSetting('height', Math.round(width * ratio));
    } else {
      updateSetting('width', width);
    }
  };

  const handleHeightChange = (value: string) => {
    const height = value === '' ? null : parseInt(value);
    if (height === null) {
      updateSetting('height', null);
      return;
    }
    if (settings.maintainAspectRatio && originalDimensions) {
      const ratio = originalDimensions.width / originalDimensions.height;
      updateSetting('height', height);
      updateSetting('width', Math.round(height * ratio));
    } else {
      updateSetting('height', height);
    }
  };

  const inputClass =
    'w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent';

  return (
    <div className="tool space-y-5">
      {/* Format */}
      <div>
        <SectionLabel>Format</SectionLabel>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('format', opt.value)}
              className={`flex flex-col items-center rounded px-2 py-1.5 text-[13px] font-medium transition-colors ${
                settings.format === opt.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-secondary hover:bg-surface-overlay hover:text-ink'
              }`}
            >
              {opt.label}
              <span
                className={`text-[10px] font-normal ${
                  settings.format === opt.value ? 'text-white/70' : 'text-ink-muted'
                }`}
              >
                {opt.note}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <SectionLabel>Quality</SectionLabel>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-line bg-surface p-1">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('quality', opt.value)}
              className={`rounded px-2 py-1.5 text-[13px] font-medium transition-colors ${
                settings.quality === opt.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-secondary hover:bg-surface-overlay hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
          <span>Best quality</span>
          <span>Smallest file</span>
        </div>
      </div>

      {/* Scale */}
      <div>
        <SectionLabel>Scale</SectionLabel>
        <div className="grid grid-cols-4 gap-1 rounded-md border border-line bg-surface p-1">
          {SCALE_PRESETS.map((preset) => {
            const isActive =
              preset.value === null
                ? settings.width === null && settings.height === null
                : originalDimensions &&
                  settings.width !== null &&
                  settings.height !== null &&
                  Math.min(settings.width, settings.height) === preset.value &&
                  Math.abs(
                    settings.width / settings.height -
                      originalDimensions.width / originalDimensions.height
                  ) < 0.05;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  if (preset.value === null) {
                    onSettingsChange({ ...settings, width: null, height: null });
                  } else {
                    applyShortSide(preset.value);
                  }
                }}
                disabled={preset.value !== null && !originalDimensions}
                className={`rounded px-1 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-ink-secondary hover:bg-surface-overlay hover:text-ink'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom size */}
      <div>
        <SectionLabel>Custom size</SectionLabel>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={settings.width ?? ''}
            onChange={(e) => handleWidthChange(e.target.value)}
            placeholder={originalDimensions?.width.toString() || 'Auto'}
            aria-label="Width"
            className={inputClass}
          />
          <button
            onClick={() => updateSetting('maintainAspectRatio', !settings.maintainAspectRatio)}
            className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
              settings.maintainAspectRatio
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line bg-surface text-ink-muted hover:text-ink'
            }`}
            title={settings.maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            aria-pressed={settings.maintainAspectRatio}
          >
            {settings.maintainAspectRatio ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            type="number"
            value={settings.height ?? ''}
            onChange={(e) => handleHeightChange(e.target.value)}
            placeholder={originalDimensions?.height.toString() || 'Auto'}
            aria-label="Height"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
