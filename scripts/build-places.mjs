// Generates packages/core/src/places/generated/places.generated.ts
// from docs/superpowers/research/2026-10-27-nearby-places.json.
// Run: npm run build:places
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { distanceMeters } from './lib/overtureFilter.mjs';
import { nameTokens } from './lib/placeQuality.mjs';

const root = new URL('../', import.meta.url);
export const DATA_PATH = fileURLToPath(new URL('docs/superpowers/research/2026-10-27-nearby-places.json', root));
export const OUT_PATH = fileURLToPath(new URL('packages/core/src/places/generated/places.generated.ts', root));

const KINDS = ['market', 'grocer', 'social-supermarket', 'community-meal', 'food-relief', 'co-op'];
const BANDS = ['free', 'budget', 'mid', 'pricier'];
const BASIS = ['stated', 'typical'];
const FITS = ['fresh', 'packaged', 'meals'];
const ACCESS = ['open', 'referral', 'membership'];
const VERIFICATION = ['primary', 'secondary'];
// Greater Melbourne box.
const LAT = [-38.6, -37.4];
const LNG = [144.3, 145.8];

// An empty `fit` is allowed: it means the source does not say what is on offer.
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const inRange = (v, [lo, hi]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Today's calendar date in Melbourne (YYYY-MM-DD), so a place checked this morning is never "in the future". */
export function melbourneToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** True for a real calendar date written YYYY-MM-DD, not after `today` when one is given. */
function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** True for a real calendar date written YYYY-MM-DD written YYYY-MM-DD that is not after `today`. */
function isPastIsoDate(s, today) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= today;
}

// Duplicate guard. Two checked places are a possible duplicate when they cite the same operator page and sit within
// SAME_URL_METERS, or when their names are alike and they sit within SIMILAR_NAME_METERS. Genuinely separate programs
// that share a building are listed in the dataset's top-level `distinctPairs` ({ ids: [a, b], reason, evidence }).
export const SAME_URL_METERS = 25;
export const SIMILAR_NAME_METERS = 50;
export const NAME_SIMILARITY = 0.5;

const nameWords = (name) => new Set(nameTokens(name));
/** Jaccard similarity of the two names' words (case, accents, punctuation, "the" and "and" ignored). */
export function nameSimilarity(a, b) {
  const [wa, wb] = [nameWords(a), nameWords(b)];
  const both = [...wa].filter((w) => wb.has(w)).length;
  const all = new Set([...wa, ...wb]).size;
  return all === 0 ? 0 : both / all;
}

/** Pairs of places that look like one record entered twice: [{ a, b, rule, meters }]. Allow-listing is the caller's job. */
export function findDuplicatePairs(places, sources) {
  const urlOf = new Map((sources ?? []).map((s) => [s.id, s.url]));
  const out = [];
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const [p, q] = [places[i], places[j]];
      if (![p.lat, p.lng, q.lat, q.lng].every((v) => typeof v === 'number' && Number.isFinite(v))) continue;
      const meters = distanceMeters(p, q);
      const url = urlOf.get(p.sourceId);
      let rule = '';
      if (url && url === urlOf.get(q.sourceId) && meters <= SAME_URL_METERS) rule = 'same-source-url';
      else if (meters <= SIMILAR_NAME_METERS && nameSimilarity(p.name ?? '', q.name ?? '') >= NAME_SIMILARITY) rule = 'similar-name';
      if (rule) out.push({ a: p.id, b: q.id, rule, meters: Math.round(meters) });
    }
  }
  return out;
}

/** Returns a list of problems; empty when the dataset is sound. */
export function validatePlaces(d, today = melbourneToday()) {
  const errs = [];
  const sourceIds = new Set();
  for (const s of d.sources ?? []) {
    if (sourceIds.has(s.id)) errs.push(`duplicate source id ${s.id}`);
    sourceIds.add(s.id);
    if (typeof s.url !== 'string' || !s.url.startsWith('https://')) errs.push(`source ${s.id} url must be https`);
    if (!nonEmpty(s.licence)) errs.push(`source ${s.id} needs a licence`);
    if (!isPastIsoDate(s.accessed, today)) errs.push(`source ${s.id} accessed must be a past YYYY-MM-DD date`);
  }
  const seen = new Set();
  for (const p of d.places ?? []) {
    if (seen.has(p.id)) errs.push(`duplicate place id ${p.id}`);
    seen.add(p.id);
    if (!sourceIds.has(p.sourceId)) errs.push(`place ${p.id} references unknown source ${p.sourceId}`);
    if (!nonEmpty(p.name)) errs.push(`place ${p.id} needs a name`);
    if (!KINDS.includes(p.kind)) errs.push(`place ${p.id} has bad kind`);
    if (!BANDS.includes(p.priceBand)) errs.push(`place ${p.id} has bad priceBand`);
    if (!BASIS.includes(p.priceBasis)) errs.push(`place ${p.id} has bad priceBasis`);
    if (p.note !== undefined && !nonEmpty(p.note)) errs.push(`place ${p.id} note must be non-empty when present`);
    if (p.priceBasis === 'typical' && (p.priceBand === 'free' || p.priceBand === 'budget') && !/^(cost not stated|described as affordable by the operator; no prices stated)/i.test(p.note ?? '')) {
      errs.push(`place ${p.id} has a typical free or budget band, so its note must begin "Cost not stated" or "Described as affordable by the operator; no prices stated"`);
    }
    if (p.notices !== undefined) {
      if (!Array.isArray(p.notices)) errs.push(`place ${p.id} notices must be a list`);
      else if (p.notices.some((n) => !n || !nonEmpty(n.text) || !isIsoDate(n.until))) errs.push(`place ${p.id} has a bad notice (needs text and an until date YYYY-MM-DD)`);
    }
    if (p.endsOn !== undefined && !isIsoDate(p.endsOn)) errs.push(`place ${p.id} has a bad endsOn (needs a date YYYY-MM-DD)`);
    if (!Array.isArray(p.fit) || p.fit.some((f) => !FITS.includes(f))) errs.push(`place ${p.id} has bad fit`);
    if (!ACCESS.includes(p.access)) errs.push(`place ${p.id} has bad access`);
    if (!VERIFICATION.includes(p.verification)) errs.push(`place ${p.id} has bad verification`);
    if (!inRange(p.lat, LAT)) errs.push(`place ${p.id} lat must be a number inside Greater Melbourne`);
    if (!inRange(p.lng, LNG)) errs.push(`place ${p.id} lng must be a number inside Greater Melbourne`);
    if (!nonEmpty(p.address)) errs.push(`place ${p.id} needs an address`);
    if (!nonEmpty(p.suburb)) errs.push(`place ${p.id} needs a suburb`);
    if (p.hours !== undefined && !nonEmpty(p.hours)) errs.push(`place ${p.id} hours must be non-empty when present`);
    if (!isPastIsoDate(p.checked, today)) errs.push(`place ${p.id} checked must be a past YYYY-MM-DD date`);
  }
  const allowed = new Set();
  for (const dp of d.distinctPairs ?? []) {
    const ids = dp?.ids;
    if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) { errs.push('distinctPairs entry needs ids: [idA, idB] naming two different places'); continue; }
    for (const id of ids) if (!seen.has(id)) errs.push(`distinctPairs names unknown place ${id}`);
    if (!nonEmpty(dp.reason)) errs.push(`distinctPairs ${ids.join(' + ')} needs a reason`);
    if (!nonEmpty(dp.evidence)) errs.push(`distinctPairs ${ids.join(' + ')} needs evidence`);
    allowed.add([...ids].sort().join('|'));
  }
  for (const f of findDuplicatePairs(d.places ?? [], d.sources ?? [])) {
    if (!allowed.has([f.a, f.b].sort().join('|'))) {
      errs.push(`possible duplicate places ${f.a} and ${f.b} (${f.rule}, ${f.meters} m apart): merge them, or list them in distinctPairs with a reason and evidence`);
    }
  }
  if (!Array.isArray(d.notFound) || d.notFound.some((n) => !nonEmpty(n))) errs.push('notFound must be a list of non-empty strings');
  return errs;
}

export function buildPlaces(d) {
  const errs = validatePlaces(d);
  if (errs.length) throw new Error(`Invalid places dataset:\n- ${errs.join('\n- ')}`);
  const data = { generatedAt: d.generatedAt, sources: d.sources, places: d.places, notFound: d.notFound };
  return (
    '// GENERATED by scripts/build-places.mjs from docs/superpowers/research/2026-10-27-nearby-places.json.\n' +
    '// Generated, do not edit by hand; run `npm run build:places`.\n' +
    "import type { PlaceData } from '../types';\n\n" +
    `export const placeData: PlaceData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_PATH, buildPlaces(JSON.parse(readFileSync(DATA_PATH, 'utf8'))));
  console.log(`Wrote ${OUT_PATH}`);
}
