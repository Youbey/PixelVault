import { Settings, Maximize2, Sliders } from 'lucide-react';
import { ConversionSettings, OutputFormat } from '../types';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  originalDimensions: { width: number; height: number } | null;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; ext: string }[] = [
  { value: 'image/webp', label: 'WebP', ext: '.webp' },
  { value: 'image/jpeg', label: 'JPEG', ext: '.jpg' },
  { value: 'image/png', label: 'PNG', ext: '.png' },
];

const PRESETS = [
  { label: 'Instagram Post', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'Twitter Header', width: 1500, height: 500 },
  { label: 'Facebook Cover', width: 820, height: 312 },
  { label: 'YouTube Thumb', width: 1280, height: 720 },
  { label: 'Email (<1MB)', width: 800, height: null },
];

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-violet-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Conversion Settings</h3>
      </div>

      {/* Format Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Output Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('format', opt.value)}
              className={`
                px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  settings.format === opt.value
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                }
              `}
            >
              <div>{opt.label}</div>
              <div className="text-xs opacity-60">{opt.ext}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            Quality
          </label>
          <span className="text-sm font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded">
            {settings.quality}%
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={settings.quality}
          onChange={(e) => updateSetting('quality', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Smallest file</span>
          <span>Best quality</span>
        </div>
      </div>

      {/* Resize Controls */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Maximize2 className="w-4 h-4" />
          Resize
        </label>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Width</label>
            <input
              type="number"
              value={settings.width ?? ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder={originalDimensions?.width.toString() || 'Auto'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>
          <span className="text-gray-400 mt-4">×</span>
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Height</label>
            <input
              type="number"
              value={settings.height ?? ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder={originalDimensions?.height.toString() || 'Auto'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.maintainAspectRatio}
            onChange={(e) => updateSetting('maintainAspectRatio', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">Maintain aspect ratio</span>
        </label>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                updateSetting('width', preset.width);
                updateSetting('height', preset.height);
              }}
              className="px-2 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left"
            >
              {preset.label}
              <span className="block text-[10px] opacity-60">
                {preset.width}×{preset.height || 'auto'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
