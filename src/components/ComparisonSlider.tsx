import { useState, useRef, useCallback } from 'react';

interface ComparisonSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function ComparisonSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Original',
  afterLabel = 'Converted',
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const setPositionFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      containerRef.current?.setPointerCapture?.(e.pointerId);
      setPositionFromClientX(e.clientX);
    },
    [setPositionFromClientX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current) {
        setPositionFromClientX(e.clientX);
      }
    },
    [setPositionFromClientX]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((p) => Math.max(2, p - 2));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((p) => Math.min(98, p + 2));
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="checkerboard relative aspect-video w-full select-none overflow-hidden rounded-md bg-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* After image (full) */}
      <img
        src={afterSrc}
        alt="After"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />

      {/* Before image — identical geometry, clipped from the right */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt="Before"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Divider + handle */}
      <div
        className="absolute bottom-0 top-0 z-10 w-px bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.4)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPosition)}
          onKeyDown={handleKeyDown}
          className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-col-resize items-center justify-center rounded-full border border-white/30 bg-white/95 shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M4.5 3L1.5 7l3 4M9.5 3l3 4-3 4"
              stroke="#18181b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute left-2 top-2 z-20 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="pointer-events-none absolute right-2 top-2 z-20 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
        {afterLabel}
      </div>
    </div>
  );
}
