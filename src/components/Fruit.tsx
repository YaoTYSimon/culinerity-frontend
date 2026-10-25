import { useEffect, useRef } from 'react';
import { FRUITS, type FruitId } from '../lib/fruits';

export function FruitLogo({ fruit, className = 'w-7 h-7' }: { fruit: FruitId; className?: string }) {
  // Logo markup is static, authored in lib/fruits.ts.
  return <svg viewBox="0 0 32 32" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FRUITS[fruit].logo }} />;
}

export interface PlatePortion {
  key: string;
  label: string;
  /** Headspace free for this portion, 0–100, or null while it is still unanswered. */
  free: number | null;
}

function wedgePath(c: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
  return `M${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

/** The score as a plate: one portion per domain, bigger portion = more headspace free. */
export function ScorePlate({ portions, weakest, className = 'w-60 h-60' }: { portions: PlatePortion[]; weakest: string | null; className?: string }) {
  const C = 125;
  const step = (Math.PI * 2) / portions.length;
  const gap = 0.06;
  const start = -Math.PI / 2;
  const colours = portions.map((p) => portionColour(portions, weakest, p.key));

  return (
    <svg viewBox="0 0 250 250" className={className} style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.35))' }} aria-hidden="true" data-plate>
      <defs>
        <radialGradient id="plate-glaze" cx="40%" cy="35%" r="75%">
          <stop offset="0%" style={{ stopColor: '#FFFFFF' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-border)' }} />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={122} fill="url(#plate-glaze)" />
      <circle cx={C} cy={C} r={104} strokeWidth={1.5} style={{ fill: 'var(--color-card)', stroke: 'var(--color-border)' }} />
      <circle cx={C} cy={C} r={114} fill="none" strokeWidth={1} strokeDasharray="2 5" opacity={0.5} style={{ stroke: 'var(--color-brand)' }} />
      {portions.map((p, i) => {
        const a0 = start + i * step + gap;
        const a1 = start + (i + 1) * step - gap;
        return (
          <g key={p.key}>
            <path d={wedgePath(C, 14, 98, a0, a1)} opacity={0.16} style={{ fill: colours[i] }} />
            {p.free !== null && (
              <path
                className="plate-wedge"
                d={wedgePath(C, 14, 22 + (p.free / 100) * 76, a0, a1)}
                style={{ fill: colours[i], stroke: 'var(--color-card)', strokeWidth: 1.5, animationDelay: `${i * 80}ms` }}
              />
            )}
          </g>
        );
      })}
      <circle cx={C} cy={C} r={10} style={{ fill: 'var(--color-card)' }} />
    </svg>
  );
}

export function portionColour(portions: PlatePortion[], weakest: string | null, key: string) {
  let other = 1;
  for (const p of portions) {
    const colour = p.key === weakest ? 'var(--color-highlight)' : `var(--color-w${Math.min(6, ++other)})`;
    if (p.key === key) return colour;
  }
  return 'var(--color-muted)';
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Canvas that fills its positioned parent and scatters the fruit's pieces around the
 * element marked `data-plate`, keeping clear of every element marked `data-scatter-avoid`.
 */
export function FruitScatter({ fruit }: { fruit: FruitId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const draw = () => {
      const { piece, draw: drawPiece } = FRUITS[fruit];
      const rect = host.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const g = canvas.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, rect.width, rect.height);

      const plate = host.querySelector('[data-plate]')?.getBoundingClientRect();
      const avoid = [...host.querySelectorAll('[data-scatter-avoid]')].map((n) => n.getBoundingClientRect());
      if (!plate) return;
      const pcx = plate.left - rect.left + plate.width / 2;
      const pcy = plate.top - rect.top + plate.height / 2;
      const prad = plate.width / 2;
      const r = rng(3);
      const small = rect.width < 520;
      const scale = small ? 0.75 : 1;
      const clusters: [number, number, number][] = small
        ? [[pcx + prad * 1.1, pcy - prad * 0.7, 6], [pcx - prad * 1.1, pcy + prad * 0.6, 6], [rect.width - 24, rect.height - 18, 4]]
        : [[pcx + prad * 1.05, pcy - prad * 0.95, 9], [pcx - prad * 1.1, pcy + prad * 0.85, 8], [pcx + prad * 1.25, pcy + prad * 0.9, 6], [rect.width - 30, rect.height - 18, 5]];

      for (const [cx, cy, n] of clusters) {
        const count = Math.round(n * piece.n);
        for (let i = 0; i < count; i++) {
          const a = r() * Math.PI * 2;
          const d = r() * piece.spread * scale;
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d;
          const s = (piece.size[0] + r() * (piece.size[1] - piece.size[0])) * scale;
          const rot = (r() - 0.5) * Math.PI * 0.9;
          if (Math.hypot(x - pcx, y - pcy) < prad + s + 4) continue;
          if (avoid.some((b) => x > b.left - rect.left - s && x < b.right - rect.left + s && y > b.top - rect.top - s && y < b.bottom - rect.top + s)) continue;
          if (x < s || y < s || x > rect.width - s || y > rect.height - s) continue;
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          g.shadowColor = 'rgba(0,0,0,.28)';
          g.shadowBlur = 5;
          g.shadowOffsetY = 2;
          drawPiece(g, s);
          g.restore();
        }
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    document.fonts?.ready.then(draw);
    return () => observer.disconnect();
  }, [fruit]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} />;
}
