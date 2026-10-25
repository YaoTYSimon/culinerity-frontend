import { scoreBand } from '@culinerity/core';

interface Props {
  /** 0-100 where 100 is secure; null before a check-in. */
  score: number | null;
  /** Band label shown under the number; derived from the score when omitted. */
  band?: string;
  /** Fill the rim once on mount (CSS skips it under reduced motion). */
  animate?: boolean;
  className?: string;
}

const CX = 130;
const RIM_R = 112;

/** The score dial: a plate whose rim fills as the number rises. */
export function Plate({ score, band, animate = true, className = '' }: Props) {
  const known = score !== null && Number.isFinite(score);
  const value = known ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const bandLabel = known ? (band ?? scoreBand(value)) : '';
  const label = known
    ? `Food security score ${value} out of 100, ${bandLabel}; 100 is secure, 0 is critical`
    : 'No food security score yet; it is out of 100, where 100 is secure and 0 is critical';

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 260 260"
      className={`block aspect-square w-full max-w-[260px] ${className}`}
      fontFamily="inherit"
    >
      <circle cx={CX} cy={CX} r="126" className="fill-surface" />
      <circle cx={CX} cy={CX} r="98" className="fill-bg" />
      {known ? (
        value > 0 && (
          <circle
            data-rim
            cx={CX}
            cy={CX}
            r={RIM_R}
            pathLength={100}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${value} 100`}
            transform={`rotate(-90 ${CX} ${CX})`}
            className={`stroke-ink ${animate ? 'plate-rim-animate' : ''}`}
          />
        )
      ) : (
        <circle
          cx={CX}
          cy={CX}
          r={RIM_R}
          fill="none"
          strokeWidth="5"
          strokeDasharray="2 12"
          strokeLinecap="round"
          opacity="0.5"
          className="stroke-ink"
        />
      )}
      <text x={CX} y="150" textAnchor="middle" fontWeight="800" fontSize={known ? 96 : 92} className="fill-ink">
        {known ? value : '?'}
      </text>
      <text x={CX} y="186" textAnchor="middle" fontSize="14" className="fill-muted">
        {known ? `out of 100 · ${bandLabel}` : 'out of 100'}
      </text>
    </svg>
  );
}
