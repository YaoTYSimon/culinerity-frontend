export const PLATE_CENTRE = 130;
const RIM_R = 112;

interface Props {
  /** How much of the rim is filled, 0 to 100; null draws the dotted "unknown" rim. */
  fill: number | null;
  /** Fill the rim once on mount (CSS skips it under reduced motion). */
  animate?: boolean;
}

/** The plate itself, drawn inside a 260 by 260 SVG: the outer ring, the inner plate and the rim that fills. */
export function PlateRim({ fill, animate = true }: Props) {
  return (
    <>
      <circle cx={PLATE_CENTRE} cy={PLATE_CENTRE} r="126" className="fill-surface" />
      <circle cx={PLATE_CENTRE} cy={PLATE_CENTRE} r="98" className="fill-bg" />
      {fill === null ? (
        <circle cx={PLATE_CENTRE} cy={PLATE_CENTRE} r={RIM_R} fill="none" strokeWidth="5" strokeDasharray="2 12" strokeLinecap="round" opacity="0.5" className="stroke-ink" />
      ) : (
        fill > 0 && (
          <circle
            data-rim
            cx={PLATE_CENTRE}
            cy={PLATE_CENTRE}
            r={RIM_R}
            pathLength={100}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(100, fill)} 100`}
            transform={`rotate(-90 ${PLATE_CENTRE} ${PLATE_CENTRE})`}
            className={`stroke-ink ${animate ? 'plate-rim-animate' : ''}`}
          />
        )
      )}
    </>
  );
}
