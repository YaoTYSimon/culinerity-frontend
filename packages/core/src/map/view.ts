/** Pure helpers for the Nearby map: which dots to draw, and zooming and panning the viewBox. Platform-free. */
import type { PlaceKind } from '../places/types';
import type { RankedBulk } from '../places/bulk';
import type { RankedPlace } from '../places/rank';
import { MAP_VIEWBOX, isInsideMap, type ViewBox } from './project';

export interface MapDot {
  id: string;
  /** Checked by us (solid dot, can be focused) or not checked (small ring, decoration). */
  checked: boolean;
  name: string;
  address: string;
  lat: number;
  lng: number;
  metres: number;
  /** Only checked places have a kind. */
  kind?: PlaceKind;
}

/** Not-checked dots drawn at most, nearest first, so a dense area stays quick. Checked dots are never capped. */
export const MAX_UNCHECKED_DOTS = 300;

/**
 * The dots for the places the page is showing: every checked place (nearest first, so Tab order follows distance)
 * then the nearest not-checked places up to the cap. Places outside the map are left out, and do not use up the cap.
 */
export function buildMapDots(checked: readonly RankedPlace[], unchecked: readonly RankedBulk[], cap = MAX_UNCHECKED_DOTS): MapDot[] {
  const solid = checked
    .filter((r) => isInsideMap(r.place.lat, r.place.lng))
    .map((r): MapDot => ({ id: r.place.id, checked: true, name: r.place.name, address: r.place.address, lat: r.place.lat, lng: r.place.lng, metres: r.metres, kind: r.place.kind }))
    .sort((a, b) => a.metres - b.metres);
  const rings = unchecked
    .filter((r) => isInsideMap(r.place.lat, r.place.lng))
    .map((r): MapDot => ({ id: r.place.id, checked: false, name: r.place.name, address: r.place.address, lat: r.place.lat, lng: r.place.lng, metres: r.distanceM }))
    .sort((a, b) => a.metres - b.metres)
    .slice(0, Math.max(0, cap));
  return [...solid, ...rings];
}

const RATIO = MAP_VIEWBOX.w / MAP_VIEWBOX.h;
/** Smallest frame, in map units (about 7 km across). */
export const MIN_ZOOM_WIDTH = 60;

function place(x: number, y: number, w: number): ViewBox {
  const h = w / RATIO;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    x: round(Math.min(Math.max(x, 0), MAP_VIEWBOX.w - w)),
    y: round(Math.min(Math.max(y, 0), MAP_VIEWBOX.h - h)),
    w: round(w),
    h: round(h),
  };
}

/** Scale the frame about its centre: factor under 1 zooms in, over 1 zooms out. Never leaves the map. */
export function zoomViewBox(vb: ViewBox, factor: number): ViewBox {
  const w = Math.min(MAP_VIEWBOX.w, Math.max(MIN_ZOOM_WIDTH, vb.w * factor));
  if (w >= MAP_VIEWBOX.w) return { ...MAP_VIEWBOX };
  return place(vb.x + vb.w / 2 - w / 2, vb.y + vb.h / 2 - w / RATIO / 2, w);
}

/** Move the frame by map units, kept on the map. */
export function panViewBox(vb: ViewBox, dx: number, dy: number): ViewBox {
  return place(vb.x + dx, vb.y + dy, vb.w);
}

/** Dot radius in map units, so a dot keeps the same size on screen at every zoom. */
export const dotRadius = (vb: ViewBox, fraction: number): number => vb.w * fraction;
