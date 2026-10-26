import { PLATE_CENTRE, PlateRim } from './PlateRim';

interface Props {
  /** The share, 0 to 100. */
  value: number;
  /** The figure as written, for the centre (for example "13.2%"). */
  text: string;
  /** What the dial says, for people who cannot see it. */
  label: string;
  className?: string;
}

/** A plate whose rim fills to a share of 100. Used for one measure on its own, never on a shared scale. */
export function ShareDial({ value, text, label, className = '' }: Props) {
  const fill = Math.min(100, Math.max(0, value));
  return (
    <svg role="img" aria-label={label} viewBox="0 0 260 260" className={`block aspect-square w-full max-w-[200px] ${className}`} fontFamily="inherit">
      <PlateRim fill={fill} />
      <text x={PLATE_CENTRE} y={PLATE_CENTRE + 20} textAnchor="middle" fontWeight="800" fontSize={text.length <= 3 ? 72 : 56} className="fill-ink">
        {text}
      </text>
    </svg>
  );
}
