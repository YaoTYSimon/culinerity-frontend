// Pure filter, de-duplication and ordering for Overture place rows. No file or network access.
// Raw row shape (what scripts/extract-overture.mjs emits): { id, lat, lng, names.primary, taxonomy.primary,
// confidence, operating_status?, addresses[0].{freeform, locality}, websites?[0], sources[0].dataset }.
import { BULK_BOX, MIN_CONFIDENCE } from './validateBulk.mjs';

/**
 * [taxonomy prefix, bulk kind] pairs. Empty until Task 2.1 fills it from the measured taxonomy list;
 * nothing is kept until then, which is the safe default. The longest matching prefix wins.
 */
export const ALLOWED_TAXONOMY_PREFIXES = [];

/**
 * Overture `sources[0].dataset` -> licence. Confirm against the Overture attribution page when run
 * and record the page date here: UNCONFIRMED (not yet checked against the live page).
 * `foursquare` is deliberately absent from this table and has its own drop reason.
 */
export const DATASET_LICENCES = {
  meta: 'CDLA-Permissive-2.0',
  Microsoft: 'CDLA-Permissive-2.0',
  PinMeTo: 'CDLA-Permissive-2.0',
  BrightQuery: 'CDLA-Permissive-2.0',
  AllThePlaces: 'CC0-1.0',
};

export const DROP_REASONS = ['closed', 'no-name', 'no-address', 'no-suburb', 'low-confidence', 'outside-box', 'taxonomy', 'foursquare', 'licence'];
export const DEDUPE_METERS = 50;

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** The bulk kind for a taxonomy string, or null when it is not on the allowed list. */
export function kindForTaxonomy(taxonomy, table = ALLOWED_TAXONOMY_PREFIXES) {
  if (typeof taxonomy !== 'string') return null;
  let best = null;
  for (const [prefix, kind] of table) {
    if (taxonomy.startsWith(prefix) && (!best || prefix.length > best[0].length)) best = [prefix, kind];
  }
  return best ? best[1] : null;
}

/** Lower-case, punctuation removed, spaces collapsed. */
export function normaliseName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Haversine distance in metres. */
export function distanceMeters(a, b) {
  const R = 6371008.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const inBox = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= BULK_BOX.lat[0] && lat <= BULK_BOX.lat[1] && lng >= BULK_BOX.lng[0] && lng <= BULK_BOX.lng[1];

/** One raw row -> `{ place }` or `{ drop: reason }`. The first failing check names the reason. */
export function filterPlace(raw, { release, minConfidence = MIN_CONFIDENCE, taxonomy = ALLOWED_TAXONOMY_PREFIXES }) {
  if (raw.operating_status !== undefined && raw.operating_status !== null && raw.operating_status !== 'operating') return { drop: 'closed' };
  const name = text(raw.names?.primary);
  if (!name) return { drop: 'no-name' };
  const addr = raw.addresses?.[0];
  const address = text(addr?.freeform);
  if (!address) return { drop: 'no-address' };
  const suburb = text(addr?.locality);
  if (!suburb) return { drop: 'no-suburb' };
  if (typeof raw.confidence !== 'number' || !(raw.confidence >= minConfidence)) return { drop: 'low-confidence' };
  if (!inBox(raw.lat, raw.lng)) return { drop: 'outside-box' };
  const kind = kindForTaxonomy(raw.taxonomy?.primary, taxonomy);
  if (!kind) return { drop: 'taxonomy' };
  const dataset = text(raw.sources?.[0]?.dataset);
  if (/foursquare/i.test(dataset)) return { drop: 'foursquare' };
  const licence = Object.hasOwn(DATASET_LICENCES, dataset) ? DATASET_LICENCES[dataset] : undefined;
  if (!licence) return { drop: 'licence' };
  const place = {
    id: `ovt-${raw.id}`,
    name,
    kind,
    lat: raw.lat,
    lng: raw.lng,
    address,
    suburb,
    price: 'unknown',
    confidence: raw.confidence,
    source: 'overture',
    sourceDataset: dataset,
    release,
    licence,
  };
  const site = text(raw.websites?.[0]);
  if (site.startsWith('https://')) place.website = site;
  return { place };
}

const byConfidenceThenId = (a, b) => b.confidence - a.confidence || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Within 50 m and the same normalised name: keep the highest confidence, then the lowest id. */
export function dedupe(places) {
  const kept = [];
  for (const p of [...places].sort(byConfidenceThenId)) {
    const n = normaliseName(p.name);
    if (!kept.some((k) => normaliseName(k.name) === n && distanceMeters(k, p) <= DEDUPE_METERS)) kept.push(p);
  }
  return kept;
}

export function sortPlaces(places) {
  return [...places].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Filter, de-duplicate and order a list of raw rows; counts every drop reason (all reasons present, zero included). */
export function runPipeline(rows, opts) {
  const dropCounts = Object.fromEntries(DROP_REASONS.map((r) => [r, 0]));
  const kept = [];
  for (const raw of rows) {
    const r = filterPlace(raw, opts);
    if ('drop' in r) dropCounts[r.drop] += 1;
    else kept.push(r.place);
  }
  const places = sortPlaces(dedupe(kept));
  return { places, dropCounts, duplicates: kept.length - places.length };
}
