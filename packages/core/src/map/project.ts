/** Equirectangular projection of Greater Melbourne into a fixed SVG viewBox. Pure and platform-free. */

/** Geographic bounds of the map. The build script scripts/build-map-outline.mjs uses the same values. */
export const MAP_BOUNDS = { west: 144.5, east: 145.9, south: -38.5, north: -37.3 } as const;

const MID_LAT = (MAP_BOUNDS.south + MAP_BOUNDS.north) / 2;
const WIDTH = 1000;
/** Units per degree of latitude; longitude is scaled by cos(mid-latitude) so shapes keep their proportions. */
const SCALE_Y = WIDTH / ((MAP_BOUNDS.east - MAP_BOUNDS.west) * Math.cos((MID_LAT * Math.PI) / 180));
const HEIGHT = Math.round((MAP_BOUNDS.north - MAP_BOUNDS.south) * SCALE_Y);

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAP_VIEWBOX: ViewBox = { x: 0, y: 0, w: WIDTH, h: HEIGHT };

export function projectPoint(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * WIDTH,
    y: ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * HEIGHT,
  };
}

export function isInsideMap(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= MAP_BOUNDS.south &&
    lat <= MAP_BOUNDS.north &&
    lng >= MAP_BOUNDS.west &&
    lng <= MAP_BOUNDS.east
  );
}

const MIN_WINDOW = 120;

/**
 * A zoomed viewBox around the points that are on the map, with the map's aspect ratio, a minimum size for a
 * single point, and clamped so it never leaves the map. No usable points gives the whole map.
 */
export function viewBoxAround(points: ReadonlyArray<{ lat: number; lng: number }>, paddingFraction: number): ViewBox {
  const full: ViewBox = { ...MAP_VIEWBOX };
  const xy = points.filter((p) => isInsideMap(p.lat, p.lng)).map((p) => projectPoint(p.lat, p.lng));
  if (xy.length === 0) return full;
  const ratio = WIDTH / HEIGHT;
  const minX = Math.min(...xy.map((p) => p.x));
  const maxX = Math.max(...xy.map((p) => p.x));
  const minY = Math.min(...xy.map((p) => p.y));
  const maxY = Math.max(...xy.map((p) => p.y));
  const pad = Math.max(0, paddingFraction);
  const bw = (maxX - minX) * (1 + 2 * pad);
  const bh = (maxY - minY) * (1 + 2 * pad);
  let w = Math.max(bw, bh * ratio, MIN_WINDOW);
  if (w >= WIDTH) return full;
  const h = w / ratio;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), WIDTH - w);
  const y = Math.min(Math.max(cy - h / 2, 0), HEIGHT - h);
  w = Math.round(w * 100) / 100;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w, h: Math.round((w / ratio) * 100) / 100 };
}
