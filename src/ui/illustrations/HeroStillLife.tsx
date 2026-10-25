import {
  BananaPbToast, EggFriedRice, FruitIcedTea, HomemadeMilkTea, OvenWedges, Pastry, SmashBurger, SpaghettiPomodoro,
} from './dishes';
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
      <rect x="-600" y="140" width="1560" height="600" className="fill-legacy-muted" />
      <rect x="-600" y="138" width="1560" height="3" className="fill-foreground/5" />
      {/* Back row, standing on the far edge of the table. */}
      <SpaghettiPomodoro x="-6" y="52" width="92" height="92" />
      <BananaPbToast x="74" y="46" width="92" height="92" />
      <FruitIcedTea x="168" y="22" width="76" height="120" />
      <HomemadeMilkTea x="238" y="52" width="88" height="88" />
      <Pastry x="300" y="78" width="56" height="56" />
      {/* Front row, larger and nearer. */}
      <Pomegranate x={40} y={204} size={68} />
      <OvenWedges x="62" y="196" width="76" height="76" />
      <SmashBurger x="108" y="96" width="160" height="160" />
      <EggFriedRice x="250" y="156" width="104" height="104" />
    </svg>
  );
}
