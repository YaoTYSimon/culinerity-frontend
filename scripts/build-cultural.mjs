// Generates packages/core/src/cultural/generated/cultural.generated.ts
// from docs/superpowers/research/2026-10-27-cultural-food.json.
// Run: npm run build:cultural
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computedRange } from './computus.mjs';

const root = new URL('../', import.meta.url);
export const DATA_PATH = fileURLToPath(new URL('docs/superpowers/research/2026-10-27-cultural-food.json', root));
export const OUT_PATH = fileURLToPath(new URL('packages/core/src/cultural/generated/cultural.generated.ts', root));

const OCCASION_IDS = ['ramadan', 'eid-al-fitr', 'eid-al-adha', 'lunar-new-year', 'diwali', 'lent', 'easter', 'orthodox-great-lent', 'orthodox-easter', 'passover', 'rosh-hashanah', 'hanukkah', 'christmas'];
const DATASET_OCCASIONS = [...OCCASION_IDS, 'yom-kippur'];
const LUNAR = ['ramadan', 'eid-al-fitr', 'eid-al-adha', 'diwali'];
const METHODS = ['hijri-calculated', 'computus', 'hebcal', 'table', 'fixed'];
const VERIFICATION = ['primary', 'secondary'];

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/** Today's calendar date in Melbourne (YYYY-MM-DD), so a row checked this morning is never "in the future". */
export function melbourneToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** True for a real calendar date written YYYY-MM-DD. */
function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** True for a real calendar date written YYYY-MM-DD that is not after `today`. */
function isPastIsoDate(s, today) {
  return isIsoDate(s) && s <= today;
}

/** The same calendar day one year on (29 Feb moves to 28 Feb). */
function plusOneYear(s) {
  const [y, m, d] = s.split('-').map(Number);
  const day = m === 2 && d === 29 ? 28 : d;
  return `${String(y + 1).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Returns a list of problems; empty when the dataset is sound. */
export function validateCultural(d, today = melbourneToday()) {
  const errs = [];
  const sourceIds = new Set();
  for (const s of d.sources ?? []) {
    if (sourceIds.has(s.id)) errs.push(`duplicate source id ${s.id}`);
    sourceIds.add(s.id);
    if (typeof s.url !== 'string' || !s.url.startsWith('https://')) errs.push(`source ${s.id} url must be https`);
    if (!nonEmpty(s.licence)) errs.push(`source ${s.id} needs a licence`);
    if (!isPastIsoDate(s.accessed, today)) errs.push(`source ${s.id} accessed must be a past YYYY-MM-DD date`);
    if (!VERIFICATION.includes(s.verification)) errs.push(`source ${s.id} has bad verification`);
  }

  const traditionIds = new Set();
  for (const t of d.traditions ?? []) {
    if (traditionIds.has(t.id)) errs.push(`duplicate tradition id ${t.id}`);
    traditionIds.add(t.id);
    if (typeof t.id !== 'string' || !/^[a-z]+(-[a-z]+)*$/.test(t.id)) errs.push(`tradition ${t.id} id must be a lowercase slug`);
    if (!nonEmpty(t.label)) errs.push(`tradition ${t.id} needs a label`);
    const text = `${t.id} ${t.label ?? ''} ${t.note ?? ''}`;
    if (/\bpeople\b|\bpeoples\b/i.test(text)) errs.push(`tradition ${t.id} must name a food style, not "people"`);
    if (/aboriginal|torres\s*strait/i.test(text)) errs.push(`tradition ${t.id}: Aboriginal and Torres Strait Islander foods need community consultation before they are added`);
    if (t.note !== undefined && !nonEmpty(t.note)) errs.push(`tradition ${t.id} note must be non-empty when present`);
  }

  const occasionIds = new Set();
  for (const o of d.occasions ?? []) {
    if (occasionIds.has(o.id)) errs.push(`duplicate occasion id ${o.id}`);
    occasionIds.add(o.id);
    if (!DATASET_OCCASIONS.includes(o.id)) errs.push(`occasion ${o.id} is not a known occasion id`);
    if (!nonEmpty(o.label)) errs.push(`occasion ${o.id} needs a label`);
    if (typeof o.gathering !== 'boolean') errs.push(`occasion ${o.id} gathering must be a boolean`);
    if (typeof o.selectable !== 'boolean') errs.push(`occasion ${o.id} selectable must be a boolean`);
    if ((o.id === 'yom-kippur') === (o.selectable === true)) errs.push(`occasion ${o.id} selectable is wrong (only yom-kippur is not selectable)`);
  }
  for (const id of DATASET_OCCASIONS) if (!occasionIds.has(id)) errs.push(`occasion ${id} is missing`);

  let lastEnd = '';
  (d.calendar ?? []).forEach((r, i) => {
    const tag = `calendar row ${i} (${r.occasion})`;
    if (!DATASET_OCCASIONS.includes(r.occasion)) errs.push(`${tag}: occasion ${r.occasion} is not an occasion id`);
    if (!isIsoDate(r.start)) errs.push(`${tag}: start must be a real YYYY-MM-DD date`);
    if (!isIsoDate(r.end)) errs.push(`${tag}: end must be a real YYYY-MM-DD date`);
    if (isIsoDate(r.start) && isIsoDate(r.end)) {
      if (r.end < r.start) errs.push(`${tag}: end is before start`);
      if (r.end > lastEnd) lastEnd = r.end;
    }
    if (!sourceIds.has(r.sourceId)) errs.push(`${tag}: references unknown source ${r.sourceId}`);
    if (!isPastIsoDate(r.checked, today)) errs.push(`${tag}: checked must be a past YYYY-MM-DD date`);
    if (typeof r.approx !== 'boolean') errs.push(`${tag}: approx must be true or false`);
    else if (LUNAR.includes(r.occasion) && r.approx !== true) errs.push(`${tag}: lunar and Diwali rows must have approx true`);
    if (!METHODS.includes(r.method)) errs.push(`${tag}: bad method`);
    if (r.note !== undefined && !nonEmpty(r.note)) errs.push(`${tag}: note must be non-empty when present`);
    if (r.method === 'computus' && isIsoDate(r.start)) {
      const want = computedRange(r.occasion, Number(r.start.slice(0, 4)));
      if (!want) errs.push(`${tag}: method computus is not defined for this occasion`);
      else if (want.start !== r.start || want.end !== r.end) errs.push(`${tag}: computed range is ${want.start} to ${want.end}, row says ${r.start} to ${r.end}`);
    }
  });
  if (!lastEnd || lastEnd < plusOneYear(today)) errs.push(`calendar needs refreshing: last end ${lastEnd || '(none)'} is less than 12 months after ${today}`);

  if (!Array.isArray(d.notFound) || d.notFound.some((n) => !nonEmpty(n))) errs.push('notFound must be a list of non-empty strings');
  return errs;
}

const CONTAINS = ['beef', 'pork', 'alcohol', 'gluten'];
const POSITIVE = ['vegetarian', 'vegan'];
const UNKNOWN_ATTR = { id: '?', name: '?', vegetarian: 'unknown', vegan: 'unknown', halal: 'unknown', kosher: 'unknown', beef: 'unknown', pork: 'unknown', alcohol: 'unknown', gluten: 'unknown', allergens: 'unknown' };

/**
 * Item flags from ingredient attributes (the spec's derivation table).
 * `ingredients` holds attribute rows, or ids resolved through `lookup`; a missing id is all-unknown.
 * One deciding value wins (a single `no` for a positive flag, a single `yes` for a "contains" flag); otherwise any
 * `unknown` makes the item `unknown`. No ingredients means everything is unknown, so it never passes a rule.
 */
export function deriveFlags(ingredients, lookup = () => undefined) {
  const rows = ingredients.map((i) => (typeof i === 'string' ? lookup(i) ?? UNKNOWN_ATTR : i));
  const none = rows.length === 0;
  const all = (key) => rows.map((r) => r[key]);
  const positive = (vals) => (none ? 'unknown' : vals.includes('no') ? 'no' : vals.includes('unknown') ? 'unknown' : 'yes');
  const contains = (vals) => (none ? 'unknown' : vals.includes('yes') ? 'yes' : vals.includes('unknown') ? 'unknown' : 'no');

  const flags = {};
  for (const k of POSITIVE) flags[k] = positive(all(k));
  for (const k of CONTAINS) flags[k] = contains(all(k));

  const certifiedMeat = rows.some((r) => r.halal === 'certified-meat' || r.kosher === 'certified-meat');
  const faith = (key) => positive(all(key).map((v) => (v === 'certified-meat' ? 'yes' : v)));
  let halal = faith('halal');
  let kosher = faith('kosher');
  if (flags.pork === 'yes') { halal = 'no'; kosher = 'no'; }
  if (flags.alcohol === 'yes') halal = 'no';
  const hasMeat = rows.some((r) => r.kosher === 'certified-meat');
  const hasDairy = rows.some((r) => Array.isArray(r.allergens) && r.allergens.includes('milk'));
  if (hasMeat && hasDairy) kosher = 'no';

  const allergensKnown = !none && rows.every((r) => Array.isArray(r.allergens));
  const allergens = [...new Set(rows.flatMap((r) => (Array.isArray(r.allergens) ? r.allergens : [])))];
  return { halal, kosher, vegetarian: flags.vegetarian, vegan: flags.vegan, beef: flags.beef, pork: flags.pork, alcohol: flags.alcohol, gluten: flags.gluten, allergens, allergensKnown, certifiedMeat };
}

export function buildCultural(d) {
  const errs = validateCultural(d);
  if (errs.length) throw new Error(`Invalid cultural dataset:\n- ${errs.join('\n- ')}`);
  const data = { generatedAt: d.generatedAt, sources: d.sources, traditions: d.traditions, occasions: d.occasions, calendar: d.calendar, notFound: d.notFound };
  return (
    '// GENERATED by scripts/build-cultural.mjs from docs/superpowers/research/2026-10-27-cultural-food.json.\n' +
    '// Generated, do not edit by hand; run `npm run build:cultural`.\n' +
    "import type { CulturalData } from '../../food/types';\n\n" +
    `export const culturalData: CulturalData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_PATH, buildCultural(JSON.parse(readFileSync(DATA_PATH, 'utf8'))));
  console.log(`Wrote ${OUT_PATH}`);
}
