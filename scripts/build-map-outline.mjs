// Builds packages/core/src/map/outline.generated.ts: a small SVG outline of Greater Melbourne.
// Source: Vicmap Admin layer 10 "Local Government Area Boundaries (aligned to Topo)" (State of Victoria, CC BY 4.0).
// Run by hand: npm run build:map [-- <scratch dir>]
// The raw query result goes to the scratch dir (default: a temp dir outside the repo) and is never committed.
// The only host contacted is services-ap1.arcgis.com. On an error it retries up to 3 times, then stops.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const OUT_PATH = fileURLToPath(new URL('../packages/core/src/map/outline.generated.ts', import.meta.url));
const SCRATCH = process.argv[2] ?? join(tmpdir(), 'culinerity-map');
const CHECKED = '2026-11-22';

// Must match MAP_BOUNDS in packages/core/src/map/project.ts (a test checks this).
const B = { west: 144.5, east: 145.9, south: -38.5, north: -37.3 };
const WIDTH = 1000;
const MID = (B.south + B.north) / 2;
const SCALE_Y = WIDTH / ((B.east - B.west) * Math.cos((MID * Math.PI) / 180));
const HEIGHT = Math.round((B.north - B.south) * SCALE_Y);

// Greater Melbourne councils ("core"). Every other council that reaches into the map box is kept as plain
// land for context (Mitchell and Macedon Ranges clip the north edge, Moorabool and Greater Geelong the west,
// Baw Baw, Murrindindi and Bass Coast the east and south), so the edge has no holes.
const CORE = new Set([
  'BANYULE', 'BAYSIDE', 'BOROONDARA', 'BRIMBANK', 'CARDINIA', 'CASEY', 'DAREBIN', 'FRANKSTON', 'GLEN EIRA',
  'GREATER DANDENONG', 'HOBSONS BAY', 'HUME', 'KINGSTON', 'KNOX', 'MANNINGHAM', 'MARIBYRNONG', 'MAROONDAH',
  'MELBOURNE', 'MELTON', 'MERRI-BEK', 'MONASH', 'MOONEE VALLEY', 'MORNINGTON PENINSULA', 'NILLUMBIK',
  'PORT PHILLIP', 'STONNINGTON', 'WHITEHORSE', 'WHITTLESEA', 'WYNDHAM', 'YARRA', 'YARRA RANGES',
]);

const HOST = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Admin/FeatureServer/10/query';
const params = new URLSearchParams({
  where: '1=1',
  geometry: `${B.west - 0.1},${B.south - 0.05},${B.east + 0.1},${B.north + 0.05}`,
  geometryType: 'esriGeometryEnvelope',
  inSR: '4326',
  outSR: '4326',
  spatialRel: 'esriSpatialRelIntersects',
  outFields: 'name,abs_lga_code',
  maxAllowableOffset: '0.001',
  geometryPrecision: '4',
  f: 'geojson',
});

async function fetchWithRetry() {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${HOST}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(`service error ${json.error.code}: ${json.error.message}`);
      if (!Array.isArray(json.features) || json.features.length === 0) throw new Error('no features returned');
      return json;
    } catch (e) {
      last = e;
      console.error(`attempt ${attempt} of 3 failed: ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  console.error(`Could not fetch the Vicmap Admin LGA layer from services-ap1.arcgis.com (${last.message}). Nothing was written.`);
  process.exit(1);
}

// Sutherland-Hodgman clip of one ring to the map box (in degrees).
function clipRing(ring) {
  const edges = [
    [(p) => p[0] >= B.west, (a, b) => [B.west, a[1] + ((b[1] - a[1]) * (B.west - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= B.east, (a, b) => [B.east, a[1] + ((b[1] - a[1]) * (B.east - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= B.south, (a, b) => [a[0] + ((b[0] - a[0]) * (B.south - a[1])) / (b[1] - a[1]), B.south]],
    [(p) => p[1] <= B.north, (a, b) => [a[0] + ((b[0] - a[0]) * (B.north - a[1])) / (b[1] - a[1]), B.north]],
  ];
  let pts = ring.slice(0, -1);
  for (const [inside, cut] of edges) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    pts = out;
    if (pts.length === 0) return [];
  }
  return pts;
}

const project = ([lng, lat]) => [((lng - B.west) / (B.east - B.west)) * WIDTH, ((B.north - lat) / (B.north - B.south)) * HEIGHT];

// Douglas-Peucker on a closed ring (split at the point farthest from the first one).
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const sq = (a, b, p) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
    const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
    return x * x + y * y;
  };
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = sq(pts[s], pts[e], pts[i]);
      if (d > max) { max = d; idx = i; }
    }
    if (idx >= 0 && max > tol * tol) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function simplifyRing(pts, tol) {
  // Close the ring, split into two halves at the farthest point so the start is stable.
  let far = 0, best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > best) { best = d; far = i; }
  }
  const a = dp(pts.slice(0, far + 1), tol);
  const b = dp([...pts.slice(far), pts[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const area = (r) => Math.abs(r.reduce((s, p, i) => s + (p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1]), 0) / 2);

const num = (tenths) => {
  const s = (Math.abs(tenths) / 10).toFixed(1).replace(/\.0$/, '').replace(/^0\./, '.');
  return tenths < 0 ? `-${s}` : s;
};

// Relative path with deltas computed from rounded absolutes (no drift), 1 decimal.
function ringToPath(r) {
  const t = r.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
  const dedup = t.filter((p, i) => i === 0 || p[0] !== t[i - 1][0] || p[1] !== t[i - 1][1]);
  if (dedup.length < 3) return '';
  let d = `M${num(dedup[0][0])} ${num(dedup[0][1])}l`;
  let prev = '';
  for (let i = 1; i < dedup.length; i++) {
    for (const v of [dedup[i][0] - dedup[i - 1][0], dedup[i][1] - dedup[i - 1][1]]) {
      const s = num(v);
      const noSpace = s.startsWith('-') || (s.startsWith('.') && prev.includes('.'));
      d += noSpace ? s : ` ${s}`;
      prev = s;
    }
  }
  return `${d}z`;
}

function build(features, tol) {
  const councils = [];
  for (const f of features) {
    const name = String(f.properties?.name ?? f.properties?.NAME ?? '').toUpperCase();
    const polys = f.geometry?.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry?.coordinates ?? [];
    let d = '';
    for (const poly of polys) {
      for (const ring of poly) {
        const clipped = clipRing(ring);
        if (clipped.length < 3) continue;
        const proj = clipped.map(project);
        if (area(proj) < 2) continue;
        d += ringToPath(simplifyRing(proj, tol));
      }
    }
    if (d) councils.push({ name, core: CORE.has(name), d });
  }
  councils.sort((a, b) => Number(a.core) - Number(b.core) || a.name.localeCompare(b.name));
  return councils;
}

function render(councils, tol, featureCount) {
  const body = councils
    .map((c) => `  { name: ${JSON.stringify(c.name)}, core: ${c.core}, d: ${JSON.stringify(c.d)} },`)
    .join('\n');
  return `// Greater Melbourne council outlines for the on-device map. Generated by scripts/build-map-outline.mjs, do not edit.
// Source: Vicmap Admin, layer 10 "Local Government Area Boundaries (aligned to Topo)", State of Victoria
// (Department of Transport and Planning), https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/arcgis/rest/services/Vicmap_Admin/FeatureServer/10
// Licence: Creative Commons Attribution 4.0 International. Checked: ${CHECKED}.
// Changes: ${featureCount} councils clipped to the map box, simplified (${tol} units), projected (equirectangular, scaled by cos of the
// mid-latitude) and redrawn as paths in a ${WIDTH} x ${HEIGHT} viewBox.
// core: true for the Greater Melbourne councils; false for neighbouring land kept so the edge is clean.

export const MAP_OUTLINE_BOUNDS = { west: ${B.west}, east: ${B.east}, south: ${B.south}, north: ${B.north} } as const;
export const MAP_OUTLINE_VIEWBOX = { x: 0, y: 0, w: ${WIDTH}, h: ${HEIGHT} } as const;

export interface MapCouncilPath {
  name: string;
  core: boolean;
  d: string;
}

export const MAP_COUNCILS: ReadonlyArray<MapCouncilPath> = [
${body}
];
`;
}

mkdirSync(SCRATCH, { recursive: true });
const data = await fetchWithRetry();
writeFileSync(join(SCRATCH, 'vicmap-lga-raw.geojson'), JSON.stringify(data));
console.log(`fetched ${data.features.length} features; raw saved in ${SCRATCH}`);

const RAW_MAX = 60000, GZ_MAX = 25000;
let tol = 0.4, out, councils;
for (; tol <= 6; tol = Math.round((tol + 0.1) * 100) / 100) {
  councils = build(data.features, tol);
  out = render(councils, tol, councils.length);
  if (Buffer.byteLength(out) < RAW_MAX && gzipSync(out).length < GZ_MAX) break;
}
if (Buffer.byteLength(out) >= RAW_MAX || gzipSync(out).length >= GZ_MAX) {
  console.error('Could not fit the size budget; not writing.');
  process.exit(1);
}
writeFileSync(OUT_PATH, out);
console.log(`tolerance ${tol}; ${councils.length} councils (${councils.filter((c) => c.core).length} core)`);
console.log(`core: ${councils.filter((c) => c.core).map((c) => c.name).join(', ')}`);
console.log(`context: ${councils.filter((c) => !c.core).map((c) => c.name).join(', ')}`);
console.log(`wrote ${OUT_PATH}: ${Buffer.byteLength(out)} B raw, ${gzipSync(out).length} B gzip`);
// Preview SVG for a quick look (scratch only).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect width="100%" height="100%" fill="#cfe3ee"/>${councils
  .map((c) => `<path d="${c.d}" fill="${c.core ? '#f1ece0' : '#e2dccb'}" stroke="#8a8272" stroke-width="0.6" fill-rule="evenodd"/>`)
  .join('')}</svg>`;
writeFileSync(join(SCRATCH, 'preview.svg'), svg);
console.log(`preview ${join(SCRATCH, 'preview.svg')}`);
