export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <rect x="5.5" y="5.5" width="6" height="6" rx="1.5" fill="#fff" />
      <rect x="12.5" y="5.5" width="6" height="6" rx="1.5" fill="#fff" fillOpacity="0.55" />
      <rect x="5.5" y="12.5" width="6" height="6" rx="1.5" fill="#fff" fillOpacity="0.55" />
      <rect x="12.5" y="12.5" width="6" height="6" rx="1.5" fill="#fff" />
    </svg>
  );
}
