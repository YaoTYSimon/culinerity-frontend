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

const NUTRIENT_KEYS = ['energyKj', 'proteinG', 'fibreG', 'sugarG', 'sodiumMg'];
const STORES = ['Coles', 'Woolworths', 'Aldi', 'IGA', 'Market'];
const TRI = ['yes', 'no', 'unknown'];
const FAITH = [...TRI, 'certified-meat'];
const TRI_KEYS = ['vegetarian', 'vegan', 'beef', 'pork', 'alcohol', 'gluten'];
const FAITH_KEYS = ['halal', 'kosher'];
const ALLERGEN_IDS = ['wheat', 'fish', 'crustacean', 'mollusc', 'egg', 'milk', 'lupin', 'peanut', 'soy', 'sesame', 'almond', 'brazil-nut', 'cashew', 'hazelnut', 'macadamia', 'pecan', 'pistachio', 'pine-nut', 'walnut', 'barley', 'oats', 'rye', 'sulphites'];
const FORBIDDEN_WORDS = /authentic|\bpeoples?\b/i;
const HEALTH_CLAIM = /health|low[- ](sodium|salt|sugar|fat|kj|energy)|less (sodium|salt|sugar|fat)|more (fibre|fiber|protein)|high in|rich in|packed with|lighter|nutritio|good for you|wholesome/i;
const MIN_PRICE = 0.2;
const MAX_PRICE = 15;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** kcal to kJ. Applied only when a source gives kcal. */
export const KCAL_TO_KJ = 4.184;
export const kcalToKj = (kcal) => kcal * KCAL_TO_KJ;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const round1 = (n) => Math.round(n * 10) / 10;

/** kJ per 100 g from a source row: its kJ, or its kcal converted. */
function energyKjOf(p) {
  if (isNum(p.energyKj)) return p.energyKj;
  if (isNum(p.energyKcal)) return kcalToKj(p.energyKcal);
  return undefined;
}

/**
 * Nutrition per serve: the sum of grams / 100 x per-100g over the recipe.
 * Integers for kJ and sodium, one decimal for the rest. `table` maps ingredient id to its row.
 */
export function computeNutrition(food, table) {
  const sum = { energyKj: 0, proteinG: 0, fibreG: 0, sugarG: 0, sodiumMg: 0 };
  for (const { ingredient, grams } of food.recipe) {
    const p = table.get(ingredient).per100g;
    const f = grams / 100;
    sum.energyKj += f * energyKjOf(p);
    for (const k of NUTRIENT_KEYS.slice(1)) sum[k] += f * p[k];
  }
  return {
    energyKj: Math.round(sum.energyKj),
    proteinG: round1(sum.proteinG),
    fibreG: round1(sum.fibreG),
    sugarG: round1(sum.sugarG),
    sodiumMg: Math.round(sum.sodiumMg),
  };
}

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
export function validateCultural(d, today = melbourneToday(), { freshness = true } = {}) {
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
  if (freshness && (!lastEnd || lastEnd < plusOneYear(today))) errs.push(`calendar needs refreshing: last end ${lastEnd || '(none)'} is less than 12 months after ${today}`);

  errs.push(...validateCatalogue(d, sourceIds, traditionIds));

  if (!Array.isArray(d.notFound) || d.notFound.some((n) => !nonEmpty(n))) errs.push('notFound must be a list of non-empty strings');
  return errs;
}

/** kJ, total sugars and cheapest price of an item: computed for a cultural item, from `existing.baseline` otherwise. */
function swapFigures(id, d, table) {
  const f = [...(d.foods ?? []), ...(d.cravings ?? [])].find((x) => x.id === id);
  if (f) {
    try {
      const n = computeNutrition(f, table);
      return { energyKj: n.energyKj, sugarG: n.sugarG, price: Math.min(...f.prices.map((p) => p.price)) };
    } catch {
      return undefined;
    }
  }
  return d.existing?.baseline?.[id];
}

/**
 * A swap is dropped when its destination is worse than the source on at least two of kJ, total sugars and
 * cheapest price. Sodium is left out: cultural recipes model no added salt (sodiumModelled false).
 */
function worseSwap(sw, tag, d, own) {
  if (!own.has(sw.cravingId) && !own.has(sw.alternativeId)) return [];
  const table = new Map((d.ingredients ?? []).map((i) => [i.id, i]));
  const from = swapFigures(sw.cravingId, d, table);
  const to = swapFigures(sw.alternativeId, d, table);
  if (!from || !to) return [];
  const worse = ['energyKj', 'sugarG', 'price'].filter((k) => to[k] > from[k]);
  if (worse.length >= 2) return [`${tag}: destination is worse on ${worse.join(' and ')}`];
  // Material guard: a single clear loss is still a bad swap (more than 10% more kJ, or more than 5 g more total sugars).
  if (to.energyKj > from.energyKj * 1.1) return [`${tag}: destination is worse on kJ by more than 10%`];
  if (to.sugarG > from.sugarG + 5) return [`${tag}: destination is worse on total sugars by more than 5 g`];
  return [];
}

/** Problems in one ingredient attribute row (shared with the pantry recipes generator). */
export function validateIngredientRow(i, sourceIds) {
  const errs = [];
  const tag = `ingredient ${i.id}`;
  if (typeof i.id !== 'string' || !SLUG.test(i.id)) errs.push(`${tag}: id must be a lowercase slug`);
  if (!nonEmpty(i.name)) errs.push(`${tag}: needs a name`);
  for (const k of TRI_KEYS) if (!TRI.includes(i[k])) errs.push(`${tag}: ${k} must be yes, no or unknown`);
  for (const k of FAITH_KEYS) if (!FAITH.includes(i[k])) errs.push(`${tag}: ${k} must be yes, no, unknown or certified-meat`);
  if (i.allergensPartial !== undefined && (i.allergensPartial !== true || !Array.isArray(i.allergens))) errs.push(`${tag}: allergensPartial may only be true beside a list of allergens`);
  if (i.allergens !== 'unknown' && !(Array.isArray(i.allergens) && i.allergens.every((a) => ALLERGEN_IDS.includes(a)))) {
    errs.push(`${tag}: allergens must be a list of known allergen ids or "unknown"`);
  }
  for (const k of [...TRI_KEYS, ...FAITH_KEYS, 'allergens']) {
    if (i[k] === 'unknown') continue;
    const sid = i.attributeSources?.[k] ?? i.attributeSourceId;
    if (!nonEmpty(sid)) errs.push(`${tag}: ${k} has no attribute source`);
    else if (!sourceIds.has(sid)) errs.push(`${tag}: ${k} references unknown source ${sid}`);
  }
  if (i.per100g !== undefined) {
    for (const k of NUTRIENT_KEYS.slice(1)) if (!isNum(i.per100g[k])) errs.push(`${tag}: per100g.${k} missing or not a number`);
    if (energyKjOf(i.per100g) === undefined) errs.push(`${tag}: per100g energy missing (energyKj or energyKcal)`);
    if (isNum(i.per100g.energyKj) && isNum(i.per100g.energyKcal)) errs.push(`${tag}: per100g gives both energyKj and energyKcal`);
  }
  return errs;
}

/** Problems in the ingredient table, foods, cravings and swaps. Absent sections are treated as empty. */
function validateCatalogue(d, sourceIds, traditionIds) {
  const errs = [];
  const sources = new Map((d.sources ?? []).map((s) => [s.id, s]));
  const ingredients = d.ingredients ?? [];
  const foods = d.foods ?? [];
  const cravings = d.cravings ?? [];
  const swaps = d.swaps ?? [];
  const existing = d.existing ?? { cravings: [], alternatives: [] };

  const table = new Map();
  for (const i of ingredients) {
    if (table.has(i.id)) errs.push(`duplicate ingredient id ${i.id}`);
    table.set(i.id, i);
    errs.push(...validateIngredientRow(i, sourceIds));
  }

  const itemIds = new Set([...(existing.cravings ?? []), ...(existing.alternatives ?? [])]);
  const own = new Map();
  const checkItem = (f, kind) => {
    const tag = `${kind} ${f.id}`;
    if (typeof f.id !== 'string' || !SLUG.test(f.id)) errs.push(`${tag}: id must be a lowercase slug`);
    if (itemIds.has(f.id) || own.has(f.id)) errs.push(`duplicate item id ${f.id}`);
    own.set(f.id, kind);
    for (const k of ['name', 'category', 'unitLabel', 'recipeBasis', 'priceBasis']) if (!nonEmpty(f[k])) errs.push(`${tag}: needs ${k}`);
    for (const k of ['name', 'recipeBasis', 'significance']) {
      if (typeof f[k] === 'string' && FORBIDDEN_WORDS.test(f[k])) errs.push(`${tag}: ${k} must not say "authentic" or name people`);
    }
    if (typeof f.sodiumModelled !== 'boolean') errs.push(`${tag}: sodiumModelled must be true or false`);
    if (!Array.isArray(f.keywords) || f.keywords.some((k) => !nonEmpty(k))) errs.push(`${tag}: keywords must be non-empty strings`);
    const trads = f.traditions ?? [];
    if (kind === 'food' && trads.length === 0) errs.push(`${tag}: needs at least one tradition`);
    for (const t of trads) if (!traditionIds.has(t)) errs.push(`${tag}: tradition ${t} does not exist`);
    if (trads.length > 0) {
      if (!nonEmpty(f.traditionSourceId)) errs.push(`${tag}: traditions need a traditionSourceId`);
      else if (!sourceIds.has(f.traditionSourceId)) errs.push(`${tag}: traditionSourceId references unknown source ${f.traditionSourceId}`);
    }
    if (!Array.isArray(f.recipe) || f.recipe.length === 0) errs.push(`${tag}: needs a recipe`);
    for (const r of f.recipe ?? []) {
      const row = table.get(r.ingredient);
      if (!row) { errs.push(`${tag}: recipe ingredient ${r.ingredient} is not in the ingredient table`); continue; }
      if (!(typeof r.grams === 'number' && Number.isFinite(r.grams) && r.grams > 0)) errs.push(`${tag}: recipe grams for ${r.ingredient} must be above 0`);
      if (row.per100g === undefined) errs.push(`${tag}: ingredient ${row.id} has no per100g values`);
      const src = sources.get(row.nutritionSourceId);
      if (!src) errs.push(`${tag}: ingredient ${row.id} has no known nutrition source (${row.nutritionSourceId})`);
      else if (!nonEmpty(src.version) || !nonEmpty(src.attribution)) errs.push(`${tag}: nutrition source ${src.id} needs a version and attribution`);
      if (!nonEmpty(row.nutritionCode)) errs.push(`${tag}: ingredient ${row.id} has no nutrition code`);
    }
    const stores = new Set();
    for (const p of f.prices ?? []) {
      if (!STORES.includes(p.store)) errs.push(`${tag}: unknown store ${p.store}`);
      if (stores.has(p.store)) errs.push(`${tag}: store ${p.store} listed twice`);
      stores.add(p.store);
      if (!(typeof p.price === 'number' && p.price >= MIN_PRICE && p.price <= MAX_PRICE)) errs.push(`${tag}: price ${p.price} must be between ${MIN_PRICE} and ${MAX_PRICE}`);
      else if (Math.abs(p.price * 10 - Math.round(p.price * 10)) > 1e-9) errs.push(`${tag}: price ${p.price} must be rounded to 10c`);
    }
    if (!stores.has('Coles') || !stores.has('Woolworths')) errs.push(`${tag}: prices need Coles and Woolworths`);
    if (f.significance !== undefined) {
      if (!nonEmpty(f.significance)) errs.push(`${tag}: significance must be non-empty when present`);
      if (!nonEmpty(f.significanceSourceId)) errs.push(`${tag}: significance needs a significanceSourceId`);
      else if (!sourceIds.has(f.significanceSourceId)) errs.push(`${tag}: significance references unknown source ${f.significanceSourceId}`);
    }
  };
  for (const f of foods) checkItem(f, 'food');
  for (const f of cravings) checkItem(f, 'craving');

  const alternatives = new Set([...(existing.alternatives ?? []), ...foods.map((f) => f.id)]);
  const cravingIds = new Set([...(existing.cravings ?? []), ...cravings.map((f) => f.id)]);
  const pairs = new Set();
  for (const sw of swaps) {
    const tag = `swap ${sw.cravingId} -> ${sw.alternativeId}`;
    if (!cravingIds.has(sw.cravingId)) errs.push(`${tag}: ${sw.cravingId} is not a craving`);
    if (!alternatives.has(sw.alternativeId)) errs.push(`${tag}: ${sw.alternativeId} is not an alternative`);
    if (pairs.has(tag)) errs.push(`${tag}: duplicate swap`);
    pairs.add(tag);
    if (!nonEmpty(sw.note)) errs.push(`${tag}: needs a note`);
    else if (FORBIDDEN_WORDS.test(sw.note)) errs.push(`${tag}: note must not say "authentic" or name people`);
    else if (HEALTH_CLAIM.test(sw.note)) errs.push(`${tag}: note makes a health claim`);
    errs.push(...worseSwap(sw, tag, d, own));
  }
  for (const id of own.keys()) {
    if (!swaps.some((sw) => sw.cravingId === id || sw.alternativeId === id)) errs.push(`${id} is in no swap`);
  }

  const covered = new Set();
  for (const a of d.existingAlternatives ?? []) {
    covered.add(a.itemId);
    if (!(existing.alternatives ?? []).includes(a.itemId)) errs.push(`existingAlternatives: ${a.itemId} is not an existing alternative`);
    if (!Array.isArray(a.ingredients) || a.ingredients.length === 0) errs.push(`existingAlternatives: ${a.itemId} needs ingredients`);
    for (const g of a.ingredients ?? []) if (!table.has(g)) errs.push(`existingAlternatives: ${a.itemId} ingredient ${g} is not in the ingredient table`);
  }
  for (const id of existing.alternatives ?? []) if (!covered.has(id)) errs.push(`existing alternative ${id} has no ingredient list`);
  if (foods.length + cravings.length > 0 && !nonEmpty(d.priceObservedAt)) errs.push('priceObservedAt is required');
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

  const allergensKnown = !none && rows.every((r) => Array.isArray(r.allergens) && r.allergensPartial !== true);
  const allergens = [...new Set(rows.flatMap((r) => (Array.isArray(r.allergens) ? r.allergens : [])))];
  return { halal, kosher, vegetarian: flags.vegetarian, vegan: flags.vegan, beef: flags.beef, pork: flags.pork, alcohol: flags.alcohol, gluten: flags.gluten, allergens, allergensKnown, certifiedMeat };
}

/**
 * The 19 hand-entered alternatives have ingredient lists guessed from each dish's name and note, not a sourced recipe.
 * So a guessed list may exclude (a "no" for a positive rule, a "yes" for a "contains" flag) but never qualify:
 * every would-be pass becomes unknown, and the allergen list is never complete.
 */
function guessedListFlags(f) {
  const out = { ...f, allergensKnown: false };
  for (const k of ['halal', 'kosher', 'vegetarian', 'vegan']) if (out[k] === 'yes') out[k] = 'unknown';
  for (const k of ['beef', 'pork', 'alcohol', 'gluten']) if (out[k] === 'no') out[k] = 'unknown';
  return out;
}

/** The catalogue records the app consumes: items, sample prices, computed nutrition, swaps and derived FoodInfo. */
export function buildCatalogue(d) {
  const table = new Map((d.ingredients ?? []).map((i) => [i.id, i]));
  const lookup = (id) => table.get(id);
  const made = [...(d.foods ?? []).map((f) => ({ f, kind: 'alternative' })), ...(d.cravings ?? []).map((f) => ({ f, kind: 'craving' }))];
  const foodInfo = (d.existingAlternatives ?? []).map((a) => ({ itemId: a.itemId, traditions: [], flags: guessedListFlags(deriveFlags(a.ingredients, lookup)) }));
  for (const { f } of made) {
    foodInfo.push({
      itemId: f.id,
      traditions: [...(f.traditions ?? [])],
      flags: deriveFlags(f.recipe.map((r) => r.ingredient), lookup),
      ...(f.significance !== undefined ? { significance: f.significance } : {}),
    });
  }
  return {
    items: made.map(({ f, kind }) => ({ id: f.id, name: f.name, category: f.category, keywords: [...f.keywords], unitLabel: f.unitLabel, kind })),
    prices: made.flatMap(({ f }) =>
      f.prices.map((p) => ({ itemId: f.id, store: p.store, pricePerServe: p.price, unitLabel: f.unitLabel, observedAt: d.priceObservedAt, isSample: true })),
    ),
    nutrition: made.map(({ f }) => ({ itemId: f.id, ...computeNutrition(f, table), ...(f.sodiumModelled === false ? { sodiumModelled: false } : {}) })),
    swaps: (d.swaps ?? []).map((sw) => ({ cravingId: sw.cravingId, alternativeId: sw.alternativeId, note: sw.note })),
    foodInfo,
    cravingIds: (d.cravings ?? []).map((c) => c.id),
  };
}

/** A plain warning when the calendar ends less than 12 months after `today`, else null. Never throws. */
export function calendarWarning(d, today = melbourneToday()) {
  const lastEnd = (d.calendar ?? []).reduce((m, r) => (typeof r.end === 'string' && r.end > m ? r.end : m), '');
  if (lastEnd && lastEnd >= plusOneYear(today)) return null;
  return `WARNING: less than 12 months of calendar remain (last row ends ${lastEnd || '(none)'}, today is ${today}). Refresh the occasions calendar soon: see "Refreshing the cultural calendar" in docs/superpowers/research/README.md. Run with --strict to fail on this.`;
}

/** The generated file's text. Freshness is a warning (see `calendarWarning`), never a build error, so the clock cannot break a build. */
export function buildCultural(d, today = melbourneToday()) {
  const errs = validateCultural(d, today, { freshness: false });
  if (errs.length) throw new Error(`Invalid cultural dataset:\n- ${errs.join('\n- ')}`);
  const data = { generatedAt: d.generatedAt, sources: d.sources, traditions: d.traditions, occasions: d.occasions, calendar: d.calendar, catalogue: buildCatalogue(d), notFound: d.notFound };
  return (
    '// GENERATED by scripts/build-cultural.mjs from docs/superpowers/research/2026-10-27-cultural-food.json.\n' +
    '// Generated, do not edit by hand; run `npm run build:cultural`.\n' +
    "import type { CulturalData } from '../../food/types';\n\n" +
    `export const culturalData: CulturalData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  writeFileSync(OUT_PATH, buildCultural(raw));
  console.log(`Wrote ${OUT_PATH}`);
  const warning = calendarWarning(raw);
  if (warning) {
    console.warn(warning);
    if (process.argv.includes('--strict')) process.exit(1);
  }
}
