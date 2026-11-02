// Pure validator for bulk (Overture-derived) places. No file or network access.
// Keep the two lists below equal to BULK_KINDS and BULK_LICENCES in packages/core/src/places/tier.ts (a test checks).
export const BULK_KIND_LIST = ['supermarket', 'greengrocer', 'bakery', 'takeaway', 'cafe-restaurant'];
export const BULK_LICENCE_LIST = ['CDLA-Permissive-2.0', 'CC0-1.0'];
// Greater Melbourne box, the same one build-places.mjs uses.
export const BULK_BOX = { lat: [-38.6, -37.4], lng: [144.3, 145.8] };
/** Starting value; set from the measured sample in Task 4.2. */
export const MIN_CONFIDENCE = 0.7;

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const inRange = (v, [lo, hi]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Problems with one bulk place; empty when sound. */
export function validateBulkPlace(p, { minConfidence = MIN_CONFIDENCE } = {}) {
  const errs = [];
  if (typeof p.id !== 'string' || !/^ovt-\S+$/.test(p.id)) errs.push('id must be "ovt-" plus the Overture id');
  for (const k of ['name', 'address', 'suburb', 'release']) if (!nonEmpty(p[k])) errs.push(`${k} must be a non-empty string`);
  if (!BULK_KIND_LIST.includes(p.kind)) errs.push('bad kind');
  if (!inRange(p.lat, BULK_BOX.lat)) errs.push('lat must be a number inside Greater Melbourne');
  if (!inRange(p.lng, BULK_BOX.lng)) errs.push('lng must be a number inside Greater Melbourne');
  if (p.price !== 'unknown') errs.push('price must be "unknown": a bulk place never states a price');
  if ('priceBasis' in p || 'priceBand' in p) errs.push('priceBasis and priceBand do not exist on a bulk place');
  if ('hours' in p) errs.push('hours must be absent: no source for bulk places states them');
  if (typeof p.confidence !== 'number' || !Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1) errs.push('confidence must be a number from 0 to 1');
  else if (p.confidence < minConfidence) errs.push(`confidence ${p.confidence} is below the minimum ${minConfidence}`);
  if (p.source !== 'overture') errs.push('source must be "overture"');
  if (!nonEmpty(p.sourceDataset)) errs.push('sourceDataset must be a non-empty string');
  else if (/foursquare/i.test(p.sourceDataset)) errs.push('Foursquare-derived records are left out (sourceDataset foursquare)');
  if (!BULK_LICENCE_LIST.includes(p.licence)) errs.push('licence must be one of ' + BULK_LICENCE_LIST.join(', '));
  if (p.website !== undefined && !(typeof p.website === 'string' && p.website.startsWith('https://'))) errs.push('website must be https when present');
  return errs;
}

/** Problems across a list: each place, duplicate ids, and a single release. */
export function validateBulkPlaces(list, opts) {
  const errs = [];
  const ids = new Set();
  const releases = new Set();
  for (const p of list) {
    if (ids.has(p.id)) errs.push(`duplicate place id ${p.id}`);
    ids.add(p.id);
    releases.add(p.release);
    for (const e of validateBulkPlace(p, opts)) errs.push(`${p.id}: ${e}`);
  }
  if (releases.size > 1) errs.push(`mixed release ids: ${[...releases].sort().join(', ')}`);
  return errs;
}
