/** Pure helpers for the Nearby map: which dots to draw, and zooming and panning the viewBox. Platform-free. */
import type { PlaceKind } from '../places/types';
import type { RankedBulk } from '../places/bulk';
import type { RankedPlace } from '../places/rank';
import { MAP_BOUNDS, MAP_VIEWBOX, isInsideMap, projectPoint, viewBoxAround, type ViewBox } from './project';

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
/** Smallest frame, in map units (about 2.4 km across), so zooming in from the local view still has room. */
export const MIN_ZOOM_WIDTH = 20;

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

/** Map units in one kilometre (longitude is scaled by cos(mid-latitude), as in the projection). */
const UNITS_PER_KM = MAP_VIEWBOX.w / ((MAP_BOUNDS.east - MAP_BOUNDS.west) * 111.32 * Math.cos((((MAP_BOUNDS.south + MAP_BOUNDS.north) / 2) * Math.PI) / 180));
/** The local view is never narrower than about 8 km. */
export const LOCAL_MIN_WIDTH = Math.round(8 * UNITS_PER_KM * 100) / 100;
/** Hollow not-checked rings are drawn only when the frame is under about 40 km wide. */
export const MAX_RING_WIDTH = Math.round(40 * UNITS_PER_KM * 100) / 100;

/**
 * The opening frame: the person's position plus the nearest `count` checked places (pass them nearest first),
 * padded, at least about 8 km wide, kept on the map. Without a usable position it fits the places alone; with
 * nothing usable it is the whole map.
 */
export function localViewBox(
  user: { lat: number; lng: number } | null,
  checkedNearestFirst: ReadonlyArray<{ lat: number; lng: number }>,
  count = 25,
  padding = 0.18,
): ViewBox {
  const points = [...(user ? [user] : []), ...checkedNearestFirst.slice(0, Math.max(0, count))];
  return viewBoxAround(points, padding, LOCAL_MIN_WIDTH);
}

export const ringsVisible = (vb: ViewBox): boolean => vb.w < MAX_RING_WIDTH;

/** How many of the dots sit inside the frame. */
export function countInView(vb: ViewBox, dots: ReadonlyArray<{ lat: number; lng: number }>): number {
  return dots.filter((d) => {
    const { x, y } = projectPoint(d.lat, d.lng);
    return x >= vb.x && x <= vb.x + vb.w && y >= vb.y && y <= vb.y + vb.h;
  }).length;
}
