import { scoreBand } from '@culinerity/core';
import { PLATE_CENTRE, PlateRim } from './PlateRim';

interface Props {
  /** 0-100 where 100 is secure; null before a check-in. */
  score: number | null;
  /** Band label shown under the number; derived from the score when omitted. */
  band?: string;
  /** Fill the rim once on mount (CSS skips it under reduced motion). */
  animate?: boolean;
  className?: string;
}


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
      <PlateRim fill={known ? value : null} animate={animate} />
      <text x={PLATE_CENTRE} y="150" textAnchor="middle" fontWeight="800" fontSize={known ? 96 : 92} className="fill-ink">
        {known ? value : '?'}
      </text>
      <text x={PLATE_CENTRE} y="186" textAnchor="middle" fontSize="14" className="fill-muted">
        {known ? `out of 100 · ${bandLabel}` : 'out of 100'}
      </text>
    </svg>
  );
}
