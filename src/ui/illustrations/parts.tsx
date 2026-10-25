import type { ReactNode, SVGProps } from 'react';

/** Flat fills in the food palette (tokens live in index.css). Full class names are spelled out so Tailwind finds them. */
export const f = {
  bun: 'fill-food-bun', bunD: 'fill-food-bun-d', meat: 'fill-food-meat', choc: 'fill-food-choc',
  leaf: 'fill-food-leaf', leafD: 'fill-food-leaf-d', red: 'fill-food-red', redD: 'fill-food-red-d',
  gold: 'fill-food-gold', cream: 'fill-food-cream', creamD: 'fill-food-cream-d', tea: 'fill-food-tea',
  blue: 'fill-food-blue', rose: 'fill-food-rose', white: 'fill-background', ground: 'fill-foreground/10',
} as const;
export const s = {
  bunD: 'stroke-food-bun-d', leaf: 'stroke-food-leaf', leafD: 'stroke-food-leaf-d', gold: 'stroke-food-gold',
  cream: 'stroke-food-cream', creamD: 'stroke-food-cream-d', red: 'stroke-food-red', choc: 'stroke-food-choc',
  rose: 'stroke-food-rose', blue: 'stroke-food-blue', tea: 'stroke-food-tea', meat: 'stroke-food-meat',
  white: 'stroke-background',
} as const;

export type IllustrationProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/** One 64x64 drawing, decorative by default. Shared frame so every picture has the same scale and ground. */
export function Frame({ children, ...rest }: IllustrationProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/** Soft ground contact under an object. */
export const Ground = ({ rx = 24, cy = 56 }: { rx?: number; cy?: number }) => (
  <ellipse cx="32" cy={cy} rx={rx} ry="4" className={f.ground} />
);

/** A plate seen from slightly above. */
export const Plate = () => (
  <>
    <ellipse cx="32" cy="54" rx="29" ry="6" className={f.ground} />
    <ellipse cx="32" cy="50" rx="28" ry="7.5" className={f.white} />
    <ellipse cx="32" cy="49.5" rx="20" ry="4.6" className="fill-foreground/5" />
  </>
);

/** A bowl: blue ceramic, with a lighter band and a cream surface for what sits in it. */
export const Bowl = ({ children }: { children?: ReactNode }) => (
  <>
    <ellipse cx="32" cy="57" rx="22" ry="3.5" className={f.ground} />
    {children}
    <path d="M8 36h48c0 12-9 21-24 21S8 48 8 36z" className={f.blue} />
    <path d="M8 36h48c-.3 3-1 5.6-2.2 7.8C46 46 18 46 10.2 43.8 9 41.6 8.3 39 8 36z" className="fill-background/25" />
  </>
);

/** A tall glass. `level` is the y of the liquid surface; the walls taper from (20,12)-(44,12) to (23,56)-(41,56). */
export const Glass = ({ fill, level = 22, children }: { fill: string; level?: number; children?: ReactNode }) => {
  const inset = (3 * (level - 12)) / 44;
  return (
    <>
      <ellipse cx="32" cy="58" rx="14" ry="3" className={f.ground} />
      <path d="M20 12h24l-3 44H23z" className="fill-background/60" />
      <path d={`M${20 + inset} ${level}h${24 - 2 * inset}L41 56H23z`} className={fill} />
      {children}
      <path d="M20 12h24l-3 44H23z" className="fill-none stroke-food-blue" strokeWidth="1.5" />
    </>
  );
};
