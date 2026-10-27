/** A bare plate with a fork and a knife, for "nothing here yet". Flat, round and theme-aware; decorative. */
export function EmptyPlate({ size = 96, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <circle cx="48" cy="48" r="48" className="fill-surface" />
      <circle cx="48" cy="49" r="25" className="fill-bg" />
      <circle cx="48" cy="49" r="16" className="fill-surface" />
      <g className="stroke-muted" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* fork */}
        <path d="M14 28v12a4 4 0 0 0 4 4v26M22 28v12a4 4 0 0 1-4 4M10 28v12a4 4 0 0 0 4 4" />
        {/* knife */}
        <path d="M82 70V44M82 44c-5-2-6-10-4-18 4 0 8 6 8 18" />
      </g>
    </svg>
  );
}
