interface Props {
  /** Seven flags, Monday first: true when that day has at least one meal. */
  days: boolean[];
  /** 0 for Monday to 6 for Sunday. */
  todayIndex: number;
}

const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const SIZE = 240;
const CENTRE = SIZE / 2;
const ORBIT = 88;
const DOT = 19;

const joinNames = (names: string[]): string =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** What a screen reader hears instead of the picture. */
export function ringLabel(days: boolean[]): string {
  const on = NAMES.filter((_, i) => days[i]);
  return `Monday to Sunday: ${on.length === 0 ? 'no meals yet' : `meals on ${joinNames(on)}`}`;
}

/** Seven round dots in a ring on a plate, Monday at the top and going clockwise. Filled means a meal that day; today is outlined. */
export function WeekRing({ days, todayIndex }: Props) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="220" height="220" role="img" aria-label={ringLabel(days)} className="max-w-full">
      <circle cx={CENTRE} cy={CENTRE} r="118" className="fill-surface" />
      <circle cx={CENTRE} cy={CENTRE} r="58" className="fill-bg" />
      <g aria-hidden="true">
        {NAMES.map((name, i) => {
          const angle = (i / NAMES.length) * 2 * Math.PI - Math.PI / 2;
          const x = CENTRE + ORBIT * Math.cos(angle);
          const y = CENTRE + ORBIT * Math.sin(angle);
          const filled = days[i] === true;
          return (
            <g key={name}>
              <circle data-day={i} data-filled={filled} cx={x} cy={y} r={DOT} className={filled ? 'fill-ink' : 'fill-bg'} />
              {i === todayIndex && (
                <circle data-today={i} cx={x} cy={y} r={DOT + 5} fill="none" strokeWidth="3" className="stroke-ink" />
              )}
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" className={filled ? 'fill-bg' : 'fill-ink'}>
                {name[0]}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
