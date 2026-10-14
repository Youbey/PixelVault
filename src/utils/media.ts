/** Formats seconds as `m:ss` (e.g. 75 → "1:15"); returns undefined for non-finite input. */
export function formatDuration(seconds?: number): string | undefined {
  if (!seconds || !Number.isFinite(seconds)) return undefined;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ACCEPTED_TYPES = 'image/*,video/mp4,video/webm,video/quicktime,video/x-matroska';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

export function isAccepted(file: File): boolean {
  return file.type.startsWith('image/') || VIDEO_TYPES.includes(file.type);
}

/** Formats a savings percentage; growth (negative savings) shows as "+n%". */
export function formatSavings(savings: number): string {
  return savings > 0 ? `−${savings}%` : `+${Math.abs(savings)}%`;
}
