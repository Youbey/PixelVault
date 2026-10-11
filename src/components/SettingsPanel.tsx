import { Link2, Link2Off } from 'lucide-react';
import { ConversionSettings, OutputFormat } from '../types';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  originalDimensions: { width: number; height: number } | null;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; ext: string }[] = [
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
  { value: 'image/png', label: 'PNG', ext: 'png' },
];

const PRESETS = [
  { label: 'Original', width: null as number | null, height: null as number | null },
  { label: 'Instagram Post — 1080×1080', width: 1080, height: 1080 },
  { label: 'Instagram Story — 1080×1920', width: 1080, height: 1920 },
  { label: 'Twitter Header — 1500×500', width: 1500, height: 500 },
  { label: 'Facebook Cover — 820×312', width: 820, height: 312 },
  { label: 'YouTube Thumb — 1280×720', width: 1280, height: 720 },
  { label: 'Email (<1MB) — 800 wide', width: 800, height: null as number | null },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </div>
  );
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  originalDimensions,
}: SettingsPanelProps) {
  const updateSetting = <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
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
        <div className="grid grid-cols-3 gap-1 rounded-md border border-line bg-surface p-1">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('format', opt.value)}
              className={`rounded px-2 py-1.5 text-[13px] font-medium transition-colors ${
                settings.format === opt.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-secondary hover:bg-surface-overlay hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Quality</SectionLabel>
          <span className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[12px] font-medium text-accent">
            {settings.quality}%
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={settings.quality}
          onChange={(e) => updateSetting('quality', parseInt(e.target.value))}
          className="w-full cursor-pointer"
          style={{ '--range-fill': `${settings.quality}%` } as React.CSSProperties}
        />
        <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
          <span>Smallest file</span>
          <span>Best quality</span>
        </div>
      </div>

      {/* Resize */}
      <div>
        <SectionLabel>Resize</SectionLabel>
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

      {/* Presets */}
      <div>
        <SectionLabel>Presets</SectionLabel>
        <select
          value={
            settings.width === null && settings.height === null
              ? 'Original'
              : PRESETS.find((p) => p.width === settings.width && p.height === settings.height)
                  ?.label || 'custom'
          }
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.label === e.target.value);
            if (preset) {
              onSettingsChange({
                ...settings,
                width: preset.width,
                height: preset.height,
              });
            }
          }}
          className="w-full cursor-pointer rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors focus:border-accent"
        >
          {settings.width === null && settings.height === null ? null : (
            <option value="custom" disabled>
              Custom — {settings.width ?? 'auto'}×{settings.height ?? 'auto'}
            </option>
          )}
          {PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
