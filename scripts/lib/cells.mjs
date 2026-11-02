// Grid cells over the Greater Melbourne box. Pure.
import { BULK_BOX } from './validateBulk.mjs';

export const CELL_DEG = 0.015;
export const CELL_ORIGIN = { lat: BULK_BOX.lat[0], lng: BULK_BOX.lng[0] };

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const span = (lo, hi, cellDeg) => Math.ceil(round6((hi - lo) / cellDeg));

/** '<ix>_<iy>'. A point exactly on the box's far edge belongs to the last cell. */
export function cellKey(lat, lng, cellDeg = CELL_DEG) {
  const nx = span(BULK_BOX.lng[0], BULK_BOX.lng[1], cellDeg);
  const ny = span(BULK_BOX.lat[0], BULK_BOX.lat[1], cellDeg);
  const ix = Math.min(nx - 1, Math.floor(round6((lng - CELL_ORIGIN.lng) / cellDeg)));
  const iy = Math.min(ny - 1, Math.floor(round6((lat - CELL_ORIGIN.lat) / cellDeg)));
  return `${ix}_${iy}`;
}

/** The key and its eight neighbours, row-major (iy then ix), clipped to the box. */
export function neighbours(key, cellDeg = CELL_DEG) {
  const [ix, iy] = key.split('_').map(Number);
  const nx = span(BULK_BOX.lng[0], BULK_BOX.lng[1], cellDeg);
  const ny = span(BULK_BOX.lat[0], BULK_BOX.lat[1], cellDeg);
  const out = [];
  for (let y = iy - 1; y <= iy + 1; y++)
    for (let x = ix - 1; x <= ix + 1; x++) if (x >= 0 && y >= 0 && x < nx && y < ny) out.push(`${x}_${y}`);
  return out;
}
