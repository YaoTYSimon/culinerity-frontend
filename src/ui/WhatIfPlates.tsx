import { PLATE_CENTRE, PlateRim } from './PlateRim';

interface Props {
  /** Days of the food budget the money left after other costs would cover, out of 7. */
  beforeDays: number | null;
  afterDays: number | null;
}

const DAYS = 7;
const GAP = 292;

const reducedMotion = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Two small plates, before and after: the rim shows days of food budget covered out of 7. The label carries the meaning. */
export function WhatIfPlates({ beforeDays, afterDays }: Props) {
  if (beforeDays === null || afterDays === null) return null;
  const animate = !reducedMotion();
  const label = `Before: ${beforeDays} of ${DAYS} days. After: ${afterDays} of ${DAYS} days.`;
  const plate = (days: number, name: string, x: number) => (
    <g transform={`translate(${x} 0)`}>
      <PlateRim fill={(days / DAYS) * 100} animate={animate} />
      <text x={PLATE_CENTRE} y={PLATE_CENTRE + 22} textAnchor="middle" fontWeight="800" fontSize="72" className="fill-ink">{days}</text>
      <text x={PLATE_CENTRE} y={PLATE_CENTRE + 56} textAnchor="middle" fontWeight="600" fontSize="20" className="fill-muted">of {DAYS} days</text>
      <text x={PLATE_CENTRE} y="296" textAnchor="middle" fontWeight="700" fontSize="24" className="fill-ink">{name}</text>
    </g>
  );
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${GAP + 260} 310`} className="block w-full max-w-[360px]" fontFamily="inherit">
      {plate(beforeDays, 'Before', 0)}
      {plate(afterDays, 'After', GAP)}
    </svg>
  );
}
