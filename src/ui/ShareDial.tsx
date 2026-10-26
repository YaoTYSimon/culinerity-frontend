interface Props {
  /** The share, 0 to 100. */
  value: number;
  /** The figure as written, for the centre (for example "13.2%"). */
  text: string;
  /** What the dial says, for people who cannot see it. */
  label: string;
  className?: string;
}

const CX = 130;
const RIM_R = 112;

/** A plate whose rim fills to a share of 100. Used for one measure on its own, never on a shared scale. */
export function ShareDial({ value, text, label, className = '' }: Props) {
  const fill = Math.min(100, Math.max(0, value));
  return (
    <svg role="img" aria-label={label} viewBox="0 0 260 260" className={`block aspect-square w-full max-w-[200px] ${className}`} fontFamily="inherit">
      <circle cx={CX} cy={CX} r="126" className="fill-surface" />
      <circle cx={CX} cy={CX} r="98" className="fill-bg" />
      {fill > 0 && (
        <circle
          data-rim
          cx={CX}
          cy={CX}
          r={RIM_R}
          pathLength={100}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${fill} 100`}
          transform={`rotate(-90 ${CX} ${CX})`}
          className="stroke-ink plate-rim-animate"
        />
      )}
      <text x={CX} y={CX + 20} textAnchor="middle" fontWeight="800" fontSize={text.length <= 3 ? 72 : 56} className="fill-ink">
        {text}
      </text>
    </svg>
  );
}
