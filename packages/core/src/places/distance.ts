export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line (great-circle) distance in metres; NaN if any input is not finite. */
export function haversineMetres(a: LatLng, b: LatLng): number {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return NaN;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const trimZero = (n: number) => n.toFixed(1).replace(/\.0$/, '');

export function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m < 0) return 'distance unknown';
  if (m < 100) return 'under 100 m';
  if (m < 1000) {
    const r = Math.round(m / 50) * 50;
    return r >= 1000 ? '1 km' : `${r} m`;
  }
  if (m < 10_000) {
    const km = trimZero(m / 1000);
    return `${km} km`;
  }
  return `${Math.round(m / 1000)} km`;
}

/** Coarsens a coordinate to about 100 m so precise location is never kept. */
export function roundOrigin(p: LatLng): LatLng {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { lat: r(p.lat), lng: r(p.lng) };
}
