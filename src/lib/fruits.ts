import { DRAFT_PREFIX } from './persist';

export type FruitId = 'pomegranate' | 'kiwi' | 'grape' | 'blueberry' | 'mango' | 'strawberry' | 'orange' | 'apple';

export const DEFAULT_FRUIT: FruitId = 'pomegranate';
export const FRUIT_STORAGE_KEY = 'fruit';

type Draw = (g: CanvasRenderingContext2D, s: number) => void;

export interface Fruit {
  name: string;
  /** Inner markup for a 32×32 SVG logo mark. */
  logo: string;
  /** Scatter density multiplier, size range in px, and cluster spread in px. */
  piece: { n: number; size: [number, number]; spread: number };
  draw: Draw;
}

const seedRing = (n: number, r: number, cx: number, cy: number, fill: string, rx: number, ry: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = (cx + Math.cos(a) * r).toFixed(2);
    const y = (cy + Math.sin(a) * r).toFixed(2);
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(1)} ${x} ${y})"/>`;
  }).join('');

const star = (g: CanvasRenderingContext2D, cy: number, outer: number, inner: number, squash = 1) => {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? inner : outer;
    g.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr * squash);
  }
  g.closePath();
  g.fill();
};

export const FRUITS: Record<FruitId, Fruit> = {
  pomegranate: {
    name: 'Pomegranate',
    logo: `<path d="M12 5.5l2 2.2L16 4l2 3.7 2-2.2.6 4" fill="none" stroke="#F2A93B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="19" r="10.5" fill="#B3284A"/><circle cx="12.5" cy="16" r="2.2" fill="#F7B6C2" opacity=".7"/><circle cx="17.5" cy="18" r="2" fill="#F7B6C2" opacity=".5"/><circle cx="14" cy="22" r="1.9" fill="#F7B6C2" opacity=".45"/><circle cx="19.5" cy="23" r="1.6" fill="#F7B6C2" opacity=".35"/>`,
    piece: { n: 1, size: [5, 8.4], spread: 26 },
    draw(g, s) {
      const grd = g.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 1.2);
      grd.addColorStop(0, '#F16A86');
      grd.addColorStop(0.55, '#C22447');
      grd.addColorStop(1, '#7A1028');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, s, s * 1.28, 0, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(255,230,236,.75)';
      g.beginPath();
      g.ellipse(-s * 0.32, -s * 0.45, s * 0.22, s * 0.32, -0.5, 0, Math.PI * 2);
      g.fill();
    },
  },
  kiwi: {
    name: 'Kiwi',
    logo: `<circle cx="16" cy="16" r="13" fill="#7A5634"/><circle cx="16" cy="16" r="11" fill="#93C13A"/><circle cx="16" cy="16" r="4" fill="#EEF2B8"/>${seedRing(10, 7, 16, 16, '#1A1208', 0.7, 1.4)}`,
    piece: { n: 2.2, size: [2.6, 4.4], spread: 34 },
    draw(g, s) {
      g.fillStyle = '#1A1208';
      g.beginPath();
      g.ellipse(0, 0, s * 0.42, s, 0, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.ellipse(-s * 0.12, -s * 0.4, s * 0.12, s * 0.25, 0, 0, Math.PI * 2);
      g.fill();
    },
  },
  grape: {
    name: 'Grape',
    logo: `<path d="M16 4c0 3 1 4 3 5" fill="none" stroke="#7FA83A" stroke-width="1.8" stroke-linecap="round"/><path d="M17 6c3-2 6-1 7 1-3 1-5 1-7-1z" fill="#7FA83A"/>${[[11, 11], [21, 11], [16, 13], [9, 18], [16, 19], [23, 18], [12, 25], [20, 25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#8E4FB5" stroke="#4B1D63" stroke-width="1"/>`).join('')}`,
    piece: { n: 1.2, size: [7, 10.5], spread: 22 },
    draw(g, s) {
      const grd = g.createRadialGradient(-s * 0.35, -s * 0.35, s * 0.1, 0, 0, s * 1.05);
      grd.addColorStop(0, '#C79BE2');
      grd.addColorStop(0.5, '#7A3A9E');
      grd.addColorStop(1, '#3A1450');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, s, s * 1.08, 0, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(240,225,255,.55)';
      g.beginPath();
      g.ellipse(-s * 0.35, -s * 0.4, s * 0.2, s * 0.3, -0.6, 0, Math.PI * 2);
      g.fill();
    },
  },
  blueberry: {
    name: 'Blueberry',
    logo: `<circle cx="16" cy="17" r="12" fill="#3B52A8"/><circle cx="12" cy="13" r="4" fill="#8FA6EC" opacity=".45"/><path d="M16 7.5l1.3 2.6 2.8.4-2 2 .5 2.8-2.6-1.4-2.6 1.4.5-2.8-2-2 2.8-.4z" fill="#0C1430"/>`,
    piece: { n: 1.1, size: [6.5, 9.5], spread: 26 },
    draw(g, s) {
      const grd = g.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s * 1.1);
      grd.addColorStop(0, '#8095DC');
      grd.addColorStop(0.5, '#34479A');
      grd.addColorStop(1, '#151E4A');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, s, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(205,215,255,.2)';
      g.beginPath();
      g.arc(-s * 0.2, -s * 0.15, s * 0.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0E1438';
      star(g, -s * 0.5, s * 0.32, s * 0.14);
    },
  },
  mango: {
    name: 'Mango',
    logo: `<path d="M23 6c2 1 3 3 2 5-2 0-4-2-2-5z" fill="#4E9A3A"/><ellipse cx="15" cy="18" rx="10" ry="11.5" transform="rotate(-25 15 18)" fill="#F5A524"/><ellipse cx="11" cy="21" rx="5" ry="6" transform="rotate(-25 11 21)" fill="#D9435C" opacity=".55"/><ellipse cx="18" cy="12" rx="2.4" ry="3.6" transform="rotate(-25 18 12)" fill="#FFE08A" opacity=".8"/>`,
    piece: { n: 1, size: [6, 9], spread: 26 },
    draw(g, s) {
      const w = s * 1.7;
      const r = s * 0.45;
      const grd = g.createLinearGradient(-w / 2, -w / 2, w / 2, w / 2);
      grd.addColorStop(0, '#FFE07A');
      grd.addColorStop(1, '#F08C0C');
      g.fillStyle = grd;
      g.beginPath();
      g.roundRect(-w / 2, -w / 2, w, w, r);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(255,250,220,.6)';
      g.beginPath();
      g.roundRect(-w / 2 + 2, -w / 2 + 2, w * 0.45, w * 0.25, r * 0.6);
      g.fill();
    },
  },
  strawberry: {
    name: 'Strawberry',
    logo: `<path d="M16 29C9 24 5 17 6 12.5c1-3 4-4.5 10-4.5s9 1.5 10 4.5c1 4.5-3 11.5-10 16.5z" fill="#E8304F"/>${[[11, 14], [16, 13], [21, 14], [13, 19], [19, 19], [16, 24]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".8" ry="1.2" fill="#F7E07A"/>`).join('')}<path d="M9 9l4 1 3-4 3 4 4-1-2 3H11z" fill="#3E8E2F"/>`,
    piece: { n: 0.9, size: [6.5, 9.5], spread: 26 },
    draw(g, s) {
      g.fillStyle = '#E2304A';
      g.beginPath();
      g.moveTo(0, s * 1.35);
      g.bezierCurveTo(-s * 1.4, s * 0.5, -s * 1.3, -s * 0.8, 0, -s * 0.7);
      g.bezierCurveTo(s * 1.3, -s * 0.8, s * 1.4, s * 0.5, 0, s * 1.35);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = '#F7E07A';
      [[-0.45, -0.2], [0.1, -0.3], [0.55, -0.1], [-0.25, 0.3], [0.3, 0.35], [0, 0.85]].forEach(([x, y]) => {
        g.beginPath();
        g.ellipse(x * s, y * s, s * 0.07, s * 0.12, 0, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = '#3E8E2F';
      star(g, -s * 0.72, s * 0.6, s * 0.2, 0.55);
    },
  },
  orange: {
    name: 'Orange',
    logo: `<circle cx="16" cy="17" r="12" fill="#F57C1F"/><circle cx="16" cy="17" r="9.6" fill="#FFB65A"/>${Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return `<line x1="16" y1="17" x2="${(16 + Math.cos(a) * 9.6).toFixed(2)}" y2="${(17 + Math.sin(a) * 9.6).toFixed(2)}" stroke="#FFF1DE" stroke-width="1.2"/>`;
    }).join('')}<circle cx="16" cy="17" r="1.6" fill="#FFF1DE"/><path d="M16 5c2-3 6-3 7-1-2 2-5 2-7 1z" fill="#2F8F5B"/>`,
    piece: { n: 0.75, size: [7.5, 11], spread: 26 },
    draw(g, s) {
      g.fillStyle = '#E8650C';
      g.beginPath();
      g.arc(0, 0, s * 1.2, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = '#FFF1DE';
      g.beginPath();
      g.arc(0, 0, s * 1.05, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2 + 0.07;
        const a1 = ((i + 1) / 8) * Math.PI * 2 - 0.07;
        g.fillStyle = i % 2 ? '#FFA53A' : '#FFB650';
        g.beginPath();
        g.moveTo(Math.cos((a0 + a1) / 2) * s * 0.14, Math.sin((a0 + a1) / 2) * s * 0.14);
        g.arc(0, 0, s * 0.94, a0, a1);
        g.closePath();
        g.fill();
      }
    },
  },
  apple: {
    name: 'Apple',
    logo: `<path d="M16 10c-3-2-9-2.2-10 4-1 7 4 15 7 15 1.4 0 2-.7 3-.7s1.6.7 3 .7c3 0 8-8 7-15-1-6.2-7-6-10-4z" fill="#D23A2C"/><path d="M16 10c0-3 1-5 2-6" fill="none" stroke="#5A3418" stroke-width="1.6" stroke-linecap="round"/><path d="M18 6c2-2.5 5-2.5 6-1-1.5 2-4 2.5-6 1z" fill="#7CB342"/><ellipse cx="11" cy="15" rx="1.6" ry="3" fill="#FFB3A6" opacity=".6"/>`,
    piece: { n: 0.8, size: [7, 10], spread: 26 },
    draw(g, s) {
      const grd = g.createRadialGradient(-s * 0.4, -s * 0.3, s * 0.1, 0, 0, s * 1.3);
      grd.addColorStop(0, '#F26B55');
      grd.addColorStop(0.6, '#C2281C');
      grd.addColorStop(1, '#7A120C');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, -s * 0.6);
      g.bezierCurveTo(-s * 0.5, -s * 1.05, -s * 1.3, -s * 0.8, -s * 1.15, s * 0.1);
      g.bezierCurveTo(-s * 1.05, s * 0.9, -s * 0.4, s * 1.25, 0, s * 1);
      g.bezierCurveTo(s * 0.4, s * 1.25, s * 1.05, s * 0.9, s * 1.15, s * 0.1);
      g.bezierCurveTo(s * 1.3, -s * 0.8, s * 0.5, -s * 1.05, 0, -s * 0.6);
      g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = '#5A3418';
      g.lineWidth = Math.max(1.2, s * 0.14);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, -s * 0.6);
      g.quadraticCurveTo(s * 0.05, -s * 1.1, s * 0.25, -s * 1.3);
      g.stroke();
      g.fillStyle = '#7CB342';
      g.beginPath();
      g.ellipse(s * 0.55, -s * 1.15, s * 0.38, s * 0.16, -0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,220,210,.45)';
      g.beginPath();
      g.ellipse(-s * 0.55, -s * 0.2, s * 0.16, s * 0.34, 0.3, 0, Math.PI * 2);
      g.fill();
    },
  },
};

export const FRUIT_ORDER: FruitId[] = ['pomegranate', 'kiwi', 'grape', 'blueberry', 'mango', 'strawberry', 'orange', 'apple'];

export function isFruitId(value: unknown): value is FruitId {
  return typeof value === 'string' && (FRUIT_ORDER as string[]).includes(value);
}

export function applyFruit(id: FruitId): void {
  document.documentElement.dataset.fruit = id;
}

/** Reads the saved fruit before React mounts, so the first paint is already in the right colours. */
export function readStoredFruit(): FruitId {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + FRUIT_STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return isFruitId(value) ? value : DEFAULT_FRUIT;
  } catch {
    return DEFAULT_FRUIT;
  }
}
