// Seeded, reproducible stratified sampling for the places quality check (Task 4.1). Pure: no file or network access.
import { distanceMeters, normaliseName } from './overtureFilter.mjs';

/** Centre of the CBD used for the regions (plan Task 4.1). */
export const CBD = { lat: -37.8136, lng: 144.9631 };
export const REGIONS = ['inner', 'middle', 'outer'];
/** Region edges in km from the CBD: inner under 8, middle 8 to 20, outer over 20. */
export const REGION_EDGES_KM = [8, 20];
/**
 * Extra weight multiplies the sampling fraction of a stratum (never past the whole stratum). The fresh-food kinds added by
 * Ruling R2 have never been checked, and outer suburbs are where one source is most likely to be thin and stale.
 */
export const DEFAULT_KIND_WEIGHTS = { butcher: 2, fishmonger: 2, deli: 2 };
export const DEFAULT_REGION_WEIGHTS = { outer: 1.5 };
export const EXCLUDE_METERS = 50;

export function regionFor(p) {
  const km = distanceMeters(CBD, p) / 1000;
  return km < REGION_EDGES_KM[0] ? 'inner' : km <= REGION_EDGES_KM[1] ? 'middle' : 'outer';
}

export const stratumKey = (kind, region) => `${kind}|${region}`;

/** Small seeded PRNG: returns a function giving floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: gives each stratum its own stream, so a sample of one stratum never depends on the others. */
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Strata are kind x region. A stratum gets ceil(size * fraction * weights) places, at least `minPerStratum` and at most the
 * whole stratum (so a stratum under 30 is taken whole). `exclude` is a list of { name, lat, lng } (the hand-checked places):
 * a place within 50 m of one with the same normalised name is not sampled. Returns [{ stratum, places }] sorted by stratum,
 * places sorted by id. Same input and seed give the same output, in any input order.
 */
export function sampleStrata(places, { seed, fraction = 0.05, minPerStratum = 30, kindWeights = DEFAULT_KIND_WEIGHTS, regionWeights = DEFAULT_REGION_WEIGHTS, exclude = [] } = {}) {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (!(fraction > 0 && fraction <= 1)) throw new Error('fraction must be above 0 and at most 1');
  const skip = exclude.map((e) => ({ n: normaliseName(e.name), lat: e.lat, lng: e.lng }));
  const strata = new Map();
  for (const p of [...places].sort(byId)) {
    const n = normaliseName(p.name);
    if (skip.some((e) => e.n === n && distanceMeters(e, p) <= EXCLUDE_METERS)) continue;
    const key = stratumKey(p.kind, regionFor(p));
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key).push(p);
  }
  return [...strata.keys()].sort().map((stratum) => {
    const pool = strata.get(stratum);
    const [kind, region] = stratum.split('|');
    const weight = (kindWeights[kind] ?? 1) * (regionWeights[region] ?? 1);
    const want = Math.max(minPerStratum, Math.ceil(pool.length * fraction * weight - 1e-9));
    const n = Math.min(pool.length, want);
    const rand = mulberry32((seed ^ hash32(stratum)) >>> 0);
    const order = [...pool];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { stratum, size: pool.length, places: order.slice(0, n).sort(byId) };
  });
}

/** Wilson score interval for k of n at 95 percent (z = 1.96). n = 0 gives p NaN and the vacuous interval 0 to 1. */
export function wilson(k, n, z = 1.96) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || k > n) throw new Error('need integers with 0 <= k <= n');
  if (n === 0) return { p: NaN, lower: 0, upper: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lower: Math.max(0, centre - half), upper: Math.min(1, centre + half) };
}
