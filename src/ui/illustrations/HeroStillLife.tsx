import { EggFriedRice, FalafelWrap, FruitIcedTea, OvenWedges, SmashBurger, SpaghettiPomodoro } from './dishes';
import { f } from './parts';

/** A pomegranate cut in half: the brand's own fruit, drawn from its seeds outward. */
function Pomegranate({ x, y, size }: { x: number; y: number; size: number }) {
  const seeds = [[0, -18], [16, -9], [16, 9], [0, 18], [-16, 9], [-16, -9], [0, 0], [8, -22], [-8, -22], [24, 0], [-24, 0], [8, 22], [-8, 22]];
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 100})`}>
      <ellipse cx="0" cy="52" rx="48" ry="7" className={f.ground} />
      <circle r="48" className="fill-primary" />
      <circle r="42" className={f.cream} />
      <circle r="38" className={f.rose} />
      {seeds.map(([sx, sy]) => (
        <g key={`${sx}${sy}`}><circle cx={sx} cy={sy} r="6.500" className="fill-primary" /><circle cx={sx - 1.800} cy={sy - 1.800} r="1.800" className="fill-background/60" /></g>
      ))}
      <path d="M-10 -52l5-10 5 8 5-8 5 10z" className="fill-primary" />
    </g>
  );
}

/** Composed still life for the first screen: swaps you can make at home on one table, drawn in the app's own colours. */
export function HeroStillLife({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 280" aria-hidden="true" focusable="false" className={`overflow-visible ${className ?? ''}`} preserveAspectRatio="xMidYMax meet">
      <rect x="-600" y="196" width="1560" height="400" className="fill-muted" />
      <rect x="-600" y="194" width="1560" height="3" className="fill-foreground/5" />
      <Pomegranate x={62} y={168} size={70} />
      <SpaghettiPomodoro x="18" y="22" width="84" height="84" />
      <SmashBurger x="112" y="36" width="152" height="152" />
      <FruitIcedTea x="276" y="30" width="80" height="100" />
      <EggFriedRice x="96" y="176" width="96" height="96" />
      <OvenWedges x="196" y="184" width="84" height="84" />
      <FalafelWrap x="272" y="146" width="84" height="100" />
    </svg>
  );
}
