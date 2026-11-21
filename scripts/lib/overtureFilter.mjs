// Pure filter, de-duplication and ordering for Overture place rows. No file or network access.
// Raw row shape (what scripts/extract-overture.mjs emits): { id, lat, lng, names.primary, taxonomy.primary,
// confidence, operating_status?, addresses[0].{freeform, postcode}, websites?[0], sources[0].dataset }.
import { CELL_DEG, cellKey, neighbours } from './cells.mjs';
import { GENERIC_WORDS, QUALITY_REASONS, dropCentroids, nameTokens, qualityDrop } from './placeQuality.mjs';
import { BULK_BOX, MIN_CONFIDENCE } from './validateBulk.mjs';

export { nameTokens };

/**
 * [taxonomy prefix, bulk kind] pairs, measured on Overture release 2026-10-21.0 (see docs/superpowers/research/2026-11-03-bulk-places-count-report.md).
 * A prefix is matched against the taxonomy hierarchy joined with '>' (taxonomy.primary is only the leaf, e.g. "pizza_restaurant").
 * The prefix must end on a segment boundary ('>' or the end of the path). The longest matching prefix wins; a kind of null excludes that sub-tree. Not listed on purpose: bars, pubs, breweries,
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

const RAW_DROP_REASONS = ['closed', 'no-name', 'no-address', 'low-confidence', 'outside-box', 'taxonomy', 'foursquare', 'licence'];
/** The reasons filterPlace gives, then the quality reasons placeQuality gives. */
export const DROP_REASONS = [...RAW_DROP_REASONS, ...QUALITY_REASONS];
/** Same normalised name at different addresses: duplicates only this close (metres). */
export const DEDUPE_METERS = 50;
/** An alike (suburb-suffixed) name at a different address: duplicates this close. */
export const DEDUPE_ALIKE_METERS = 100;
/** The same street address with an alike name: duplicates this close (the source places one venue 150 m and 800 m off). */
export const DEDUPE_SAME_ADDRESS_METERS = 1000;

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** The bulk kind for a taxonomy string, or null when it is not on the allowed list. */
export function kindForTaxonomy(taxonomy, table = ALLOWED_TAXONOMY_PREFIXES) {
  if (typeof taxonomy !== 'string') return null;
  let best = null;
  for (const [prefix, kind] of table) {
    if ((taxonomy === prefix || taxonomy.startsWith(`${prefix}>`)) && (!best || prefix.length > best[0].length)) best = [prefix, kind];
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

const ABBREVIATIONS = { st: 'street', rd: 'road', ave: 'avenue', av: 'avenue', hwy: 'highway', dr: 'drive', cres: 'crescent', ct: 'court', pde: 'parade', pl: 'place', blvd: 'boulevard', ln: 'lane', tce: 'terrace', cl: 'close', cct: 'circuit', esp: 'esplanade', sq: 'square', fwy: 'freeway' };
const NUMBER = /^\d+[a-z]?(?:-\d+[a-z]?)?$/;

/** "Shop 5, Tarneit Central, 6/1035 Dohertys Rd." -> "1035 dohertys road": street number and street only. Null when there is no number. */
export function addressKey(address) {
  let s = String(address ?? '').toLowerCase().replace(/\./g, '');
  s = s.replace(/\b(?:shop|unit|level|suite|lot|kiosk|tenancy|store)\s*[\w-]+\s*,?/g, ' ').replace(/\b[a-z]?\d+[a-z]?\s*\/\s*(?=\d)/g, ' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  const at = tokens.findIndex((t) => NUMBER.test(t.replace(/,$/, '')));
  if (at < 0) return null;
  const out = [];
  for (const raw of tokens.slice(at)) {
    out.push(ABBREVIATIONS[raw.replace(/,$/, '')] ?? raw.replace(/,$/, ''));
    if (raw.endsWith(',') && out.length > 1) break;
  }
  return out.length >= 2 ? out.join(' ') : null;
}

/** 'exact' (same words, or the same letters ignoring spaces), 'variant' (one name is the other plus 1 to 3 trailing words), else null. */
export function namesAlike(a, b) {
  if (a.length === 0 || b.length === 0) return null;
  if (a.join('') === b.join('')) return 'exact';
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const extra = long.length - short.length;
  if (extra < 1 || extra > 3 || short.join(' ').length < 3) return null;
  if (!short.every((t, i) => t === long[i])) return null;
  if (short.every((t) => GENERIC_WORDS.has(t))) return null;
  return 'variant';
}

// More specific kinds win a duplicate pair: a retail kind over takeaway over the catch-all cafe-restaurant.
const KIND_RANK = { supermarket: 0, greengrocer: 0, bakery: 0, butcher: 0, fishmonger: 0, deli: 0, takeaway: 1, 'cafe-restaurant': 2 };
const rank = (kind) => KIND_RANK[kind] ?? 3;
const byPriority = (a, b) => rank(a.kind) - rank(b.kind) || b.confidence - a.confidence || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * De-duplicates with a grid (one cell is wider than the largest distance used), so it is not a pairwise scan. Records are
 * taken most-specific-kind first, then highest confidence, then lowest id; one is dropped when it is alike an already kept one:
 *   names the same words (case, punctuation, "and"/"&", spacing ignored): within 50 m, or at the same address within 1 km;
 *   names one the other plus 1 to 3 trailing words ("KFC" and "KFC Tarneit North"): within 100 m, or at the same address within 1 km;
 *   when the kinds differ a variant needs the same address (a "Preston Market" supermarket and a "Preston Market Health Foods" shop are not one place), and an exact name needs 50 m or the same address (a bakery and a cafe of one name stay apart unless they share an address or sit 50 m apart).
 * "Same address" is the same street number and street, and the same postcode when both have one. Deterministic. Returns { kept, removed }.
 */
export function dedupeDetailed(places) {
  const info = (p) => ({ p, tokens: nameTokens(p.name), addr: addressKey(p.address), cell: cellKey(p.lat, p.lng) });
  const grid = new Map();
  const kept = [];
  const removed = [];
  for (const p of [...places].sort(byPriority)) {
    const c = info(p);
    let twin = null;
    let rule = '';
    for (const key of neighbours(c.cell, CELL_DEG)) {
      for (const k of grid.get(key) ?? []) {
        const like = namesAlike(c.tokens, k.tokens);
        if (!like) continue;
        const d = distanceMeters(k.p, p);
        const sameAddress = c.addr !== null && c.addr === k.addr && (!k.p.postcode || !p.postcode || k.p.postcode === p.postcode);
        const near = like === 'exact' ? DEDUPE_METERS : k.p.kind !== p.kind ? 0 : DEDUPE_ALIKE_METERS;
        const hit = sameAddress && d <= DEDUPE_SAME_ADDRESS_METERS ? 'same-address' : d <= near ? 'near' : '';
        if (hit && (!twin || k.p.id < twin.p.id)) {
          twin = k;
          rule = hit;
        }
      }
    }
    if (twin) removed.push({ id: p.id, of: twin.p.id, rule });
    else {
      kept.push(p);
      if (!grid.has(c.cell)) grid.set(c.cell, []);
      grid.get(c.cell).push(c);
    }
  }
  return { kept, removed };
}

export const dedupe = (places) => dedupeDetailed(places).kept;

export function sortPlaces(places) {
  return [...places].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The mechanical quality stage on places that already passed filterPlace: per-record quality rules, then the shared-point
 * rule, then de-duplication; counts every quality reason (zero included). Needs only fields a shipped place has, so it can
 * also run on an existing bulk-places.json.
 */
export function refinePlaces(places) {
  const dropCounts = Object.fromEntries(QUALITY_REASONS.map((r) => [r, 0]));
  const dropped = [];
  const passed = [];
  for (const p of places) {
    const reason = qualityDrop(p);
    if (reason) {
      dropCounts[reason] += 1;
      dropped.push({ id: p.id, reason });
    } else passed.push(p);
  }
  const centroids = dropCentroids(passed);
  dropCounts.centroid = centroids.dropped.length;
  for (const p of centroids.dropped) dropped.push({ id: p.id, reason: 'centroid' });
  const { kept, removed } = dedupeDetailed(centroids.kept);
  const result = sortPlaces(kept);
  const duplicateRules = { 'same-address': 0, near: 0 };
  for (const r of removed) duplicateRules[r.rule] += 1;
  return { places: result, dropCounts, dropped, duplicates: removed.length, duplicateRules, removed, dedupedIds: removed.map((r) => r.id).sort() };
}

/** Filter, quality-check, de-duplicate and order a list of raw rows; counts every drop reason (all reasons present, zero included). */
export function runPipeline(rows, opts) {
  const dropCounts = Object.fromEntries(DROP_REASONS.map((r) => [r, 0]));
  const passed = [];
  for (const raw of rows) {
    const r = filterPlace(raw, opts);
    if ('drop' in r) dropCounts[r.drop] += 1;
    else passed.push(r.place);
  }
  const refined = refinePlaces(passed);
  for (const [reason, n] of Object.entries(refined.dropCounts)) dropCounts[reason] += n;
  return { ...refined, dropCounts, filtered: passed.length };
}
