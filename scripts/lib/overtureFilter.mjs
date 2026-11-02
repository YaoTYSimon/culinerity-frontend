// Pure filter, de-duplication and ordering for Overture place rows. No file or network access.
// Raw row shape (what scripts/extract-overture.mjs emits): { id, lat, lng, names.primary, taxonomy.primary,
// confidence, operating_status?, addresses[0].{freeform, postcode}, websites?[0], sources[0].dataset }.
import { BULK_BOX, MIN_CONFIDENCE } from './validateBulk.mjs';

/**
 * [taxonomy prefix, bulk kind] pairs, measured on Overture release 2026-10-21.0 (see docs/superpowers/research/2026-11-03-bulk-places-count-report.md).
 * A prefix is matched against the taxonomy hierarchy joined with '>' (taxonomy.primary is only the leaf, e.g. "pizza_restaurant").
 * The longest matching prefix wins; a kind of null excludes that sub-tree. Not listed on purpose: bars, pubs, breweries,
 * wineries, bottle shops, convenience stores, health food, dessert and candy shops, flea and night markets
 * (no matching BulkKind, or not food retail; see the report). Butchers, fishmongers and delis were added by Ruling R2.
 */
export const ALLOWED_TAXONOMY_PREFIXES = [
  ['shopping>food_and_beverage_store>grocery_store', 'supermarket'],
  ['shopping>food_and_beverage_store>specialty_foods_store>produce_store', 'greengrocer'],
  ['shopping>market>farmers_market', 'greengrocer'],
  ['shopping>market>public_market', 'greengrocer'],
  ['shopping>food_and_beverage_store>butcher_shop', 'butcher'],
  ['shopping>food_and_beverage_store>fishmonger', 'fishmonger'],
  ['shopping>food_and_beverage_store>seafood_market', 'fishmonger'],
  ['food_and_drink>casual_eatery>delicatessen', 'deli'],
  ['food_and_drink>casual_eatery>bakery', 'bakery'],
  ['food_and_drink>casual_eatery>fast_food_restaurant', 'takeaway'],
  ['food_and_drink>casual_eatery>sandwich_shop', 'takeaway'],
  ['food_and_drink>casual_eatery>food_truck_stand', 'takeaway'],
  ['food_and_drink>restaurant>seafood_restaurant>fish_and_chips_restaurant', 'takeaway'],
  ['food_and_drink>casual_eatery>cafe', 'cafe-restaurant'],
  ['food_and_drink>casual_eatery>cafe>internet_cafe', null],
  ['food_and_drink>casual_eatery>bistro', 'cafe-restaurant'],
  ['food_and_drink>casual_eatery>diner', 'cafe-restaurant'],
  ['food_and_drink>non_alcoholic_beverage_venue>coffee_shop', 'cafe-restaurant'],
  ['food_and_drink>restaurant', 'cafe-restaurant'],
];

/** The string kindForTaxonomy matches: the hierarchy joined with '>', else the primary alone (fixtures). */
export function taxonomyPath(taxonomy) {
  const h = taxonomy?.hierarchy;
  if (Array.isArray(h) && h.length > 0 && h.every((x) => typeof x === 'string')) return h.join('>');
  return typeof taxonomy?.primary === 'string' ? taxonomy.primary : undefined;
}

/**
 * Overture `sources[].dataset` -> licence. Confirmed 2026-11-03 against https://docs.overturemaps.org/attribution/
 * (the Places theme has no theme-wide licence; each contributing dataset is listed: CDLA-Permissive-2.0 for Meta,
 * Microsoft, PinMeTo, BrightQuery, Krick, RenderSEO, DAC, Birdeye, Uberall and OpenTravel Alliance; CC0 1.0 for
 * AllThePlaces; Apache-2.0 for Foursquare). `Overture` and `Overture-signals` are Overture's own entries (CDLA-Permissive-2.0 in
 * the release 2026-10-21.0 data). `foursquare` is deliberately absent and has its own drop reason.
 * EVERY entry of a record's `sources` must be in this table, not just the first.
 */
export const DATASET_LICENCES = {
  meta: 'CDLA-Permissive-2.0',
  Microsoft: 'CDLA-Permissive-2.0',
  PinMeTo: 'CDLA-Permissive-2.0',
  BrightQuery: 'CDLA-Permissive-2.0',
  Krick: 'CDLA-Permissive-2.0',
  RenderSEO: 'CDLA-Permissive-2.0',
  DAC: 'CDLA-Permissive-2.0',
  Birdeye: 'CDLA-Permissive-2.0',
  Uberall: 'CDLA-Permissive-2.0',
  OpenTravel: 'CDLA-Permissive-2.0',
  Overture: 'CDLA-Permissive-2.0',
  'Overture-signals': 'CDLA-Permissive-2.0',
  AllThePlaces: 'CC0-1.0',
};

/** Overture `operating_status` values that count as open (`operating` kept for older releases). Absent is also kept. */
const OPEN_STATUSES = ['open', 'operating'];

export const DROP_REASONS = ['closed', 'no-name', 'no-address', 'low-confidence', 'outside-box', 'taxonomy', 'foursquare', 'licence'];
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
  if (raw.operating_status !== undefined && raw.operating_status !== null && !OPEN_STATUSES.includes(raw.operating_status)) return { drop: 'closed' };
  const name = text(raw.names?.primary);
  if (!name) return { drop: 'no-name' };
  const addr = raw.addresses?.[0];
  const address = text(addr?.freeform);
  if (!address) return { drop: 'no-address' };
  const postcode = text(addr?.postcode);
  if (typeof raw.confidence !== 'number' || !(raw.confidence >= minConfidence)) return { drop: 'low-confidence' };
  if (!inBox(raw.lat, raw.lng)) return { drop: 'outside-box' };
  const kind = kindForTaxonomy(taxonomyPath(raw.taxonomy), taxonomy);
  if (!kind) return { drop: 'taxonomy' };
  const datasets = (Array.isArray(raw.sources) ? raw.sources : []).map((s) => text(s?.dataset));
  if (datasets.some((d) => /foursquare/i.test(d))) return { drop: 'foursquare' };
  const dataset = datasets[0] ?? '';
  const known = (d) => Object.hasOwn(DATASET_LICENCES, d);
  if (datasets.length === 0 || !datasets.every(known)) return { drop: 'licence' };
  const licence = DATASET_LICENCES[dataset];
  const place = {
    id: `ovt-${raw.id}`,
    name,
    kind,
    lat: raw.lat,
    lng: raw.lng,
    address,
    price: 'unknown',
    confidence: raw.confidence,
    source: 'overture',
    sourceDataset: dataset,
    release,
    licence,
  };
  if (/^\d{4}$/.test(postcode)) place.postcode = postcode;
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
