// Generates packages/core/src/recipes/generated/recipes.generated.ts
// from docs/superpowers/research/2026-10-29-pantry-recipes.json plus the cultural ingredient table.
// Run: npm run build:recipes
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DATA_PATH as CULTURAL_PATH, computeNutrition, deriveFlags, melbourneToday, validateIngredientRow } from './build-cultural.mjs';

const root = new URL('../', import.meta.url);
export const DATA_PATH = fileURLToPath(new URL('docs/superpowers/research/2026-10-29-pantry-recipes.json', root));
export const OUT_PATH = fileURLToPath(new URL('packages/core/src/recipes/generated/recipes.generated.ts', root));

export const MIN_RECIPES = 40;
export const MIN_TRADITIONS = 10;
export const MAX_COST_PER_SERVE = 4;
const SAFETY_TAGS = ['rice', 'pasta', 'leftovers'];
const SEASONINGS = ['salt', 'pepper'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FIGURE_IN_STEP = /°\s*C|º\s*C|\b\d+\s*(minutes?|mins?)\b/i;
const FLAG_KEYS = ['halal', 'kosher', 'vegetarian', 'vegan', 'beef', 'pork', 'alcohol', 'gluten'];

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const tenCents = (n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-9;

/** Cultural ingredient rows plus the recipe file's extra rows, with `aliases` and `highRisk` applied. */
export function mergedIngredients(d, cultural) {
  const rows = new Map((cultural.ingredients ?? []).map((i) => [i.id, { ...i }]));
  for (const x of d.extraIngredients ?? []) rows.set(x.id, { ...rows.get(x.id), ...x });
  const high = new Set(d.highRiskIngredients ?? []);
  return [...rows.values()].map((r) => ({
    ...r,
    ...(d.aliases?.[r.id] ? { aliases: [...d.aliases[r.id]] } : {}),
    ...(high.has(r.id) ? { highRisk: true } : {}),
  }));
}

/** Sample cost of one serve in dollars: every counted ingredient at its per-kg price. */
export function recipeCostPerServe(recipe, prices) {
  const total = recipe.ingredients.reduce((s, i) => s + (i.grams * (prices.get(i.ingredient) ?? 0)) / 1000, 0);
  return total / recipe.serves;
}

const sameFlags = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function validateSources(d, culturalSourceIds, today) {
  const errs = [];
  const ids = new Set();
  for (const s of d.sources ?? []) {
    if (ids.has(s.id)) errs.push(`duplicate source id ${s.id}`);
    ids.add(s.id);
    if (typeof s.url !== 'string' || !s.url.startsWith('https://')) errs.push(`source ${s.id} url must be https`);
    if (!nonEmpty(s.licence)) errs.push(`source ${s.id} needs a licence`);
    if (!(typeof s.accessed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.accessed) && s.accessed <= today)) errs.push(`source ${s.id} accessed must be a past YYYY-MM-DD date`);
    if (!['primary', 'secondary'].includes(s.verification)) errs.push(`source ${s.id} has bad verification`);
  }
  return { errs, ids: new Set([...culturalSourceIds, ...ids]) };
}

function validateIngredients(d, cultural, sourceIds) {
  const errs = [];
  const base = new Map((cultural.ingredients ?? []).map((i) => [i.id, i]));
  const seen = new Set();
  for (const x of d.extraIngredients ?? []) {
    if (seen.has(x.id)) errs.push(`duplicate extra ingredient ${x.id}`);
    seen.add(x.id);
    const merged = { ...base.get(x.id), ...x };
    errs.push(...validateIngredientRow(merged, sourceIds));
    if (!nonEmpty(x.nutritionCode) || !sourceIds.has(x.nutritionSourceId)) errs.push(`ingredient ${x.id}: needs nutritionCode and a known nutritionSourceId`);
    const existing = base.get(x.id);
    if (existing) {
      if (existing.per100g) errs.push(`ingredient ${x.id}: already has nutrition in the cultural table`);
      const a = deriveFlags([existing]);
      const b = deriveFlags([merged]);
      if (!sameFlags(a, b)) errs.push(`ingredient ${x.id}: completing a cultural row must not change its flags or allergens`);
    }
  }
  const table = new Map(mergedIngredients(d, cultural).map((i) => [i.id, i]));
  for (const id of [...(d.highRiskIngredients ?? []), ...(d.rawCookThroughIngredients ?? []), ...(d.starters ?? []), ...Object.keys(d.aliases ?? {})]) {
    if (!table.has(id)) errs.push(`${id} is not in the ingredient table`);
  }
  return { errs, table };
}

/** Returns a list of problems; empty when the dataset is sound. */
export function validateRecipes(d, cultural, today = melbourneToday()) {
  const src = validateSources(d, (cultural.sources ?? []).map((s) => s.id), today);
  const ing = validateIngredients(d, cultural, src.ids);
  const errs = [...src.errs, ...ing.errs];
  const { table } = ing;
  const traditionIds = new Set((cultural.traditions ?? []).map((t) => t.id));
  const prices = new Map();
  for (const p of d.ingredientPrices ?? []) {
    if (prices.has(p.ingredient)) errs.push(`duplicate price for ${p.ingredient}`);
    if (!table.has(p.ingredient)) errs.push(`price for unknown ingredient ${p.ingredient}`);
    if (!(typeof p.perKg === 'number' && p.perKg >= 0.5 && p.perKg <= 60)) errs.push(`price ${p.ingredient}: perKg ${p.perKg} out of range`);
    else if (!tenCents(p.perKg)) errs.push(`price ${p.ingredient}: perKg ${p.perKg} must be rounded to 10c`);
    prices.set(p.ingredient, p.perKg);
  }
  if (!nonEmpty(d.priceBasis)) errs.push('priceBasis is required');
  const high = new Set(d.highRiskIngredients ?? []);
  const raw = new Set(d.rawCookThroughIngredients ?? []);

  const ids = new Set();
  const perTradition = new Map();
  for (const r of d.recipes ?? []) {
    const tag = `recipe ${r.id}`;
    if (typeof r.id !== 'string' || !SLUG.test(r.id)) errs.push(`${tag}: id must be a lowercase slug`);
    if (ids.has(r.id)) errs.push(`duplicate recipe id ${r.id}`);
    ids.add(r.id);
    if (!nonEmpty(r.name)) errs.push(`${tag}: needs a name`);
    if (!nonEmpty(r.blurb) || r.blurb.length > 100) errs.push(`${tag}: blurb must be 1 to 100 characters`);
    if (!(isPosInt(r.serves) && r.serves <= 6)) errs.push(`${tag}: serves must be 1 to 6`);
    if (!(isPosInt(r.minutes) && r.minutes >= 5 && r.minutes <= 60)) errs.push(`${tag}: minutes must be 5 to 60`);
    if (!nonEmpty(r.basis) || !r.basis.startsWith("Author's own simple recipe")) errs.push(`${tag}: basis must start with "Author's own simple recipe"`);
    for (const t of r.traditions ?? []) if (!traditionIds.has(t)) errs.push(`${tag}: tradition ${t} does not exist`);
    for (const t of r.traditions ?? []) perTradition.set(t, (perTradition.get(t) ?? 0) + 1);
    for (const s of r.seasonings ?? []) if (!SEASONINGS.includes(s)) errs.push(`${tag}: seasoning ${s} must be salt or pepper`);
    for (const s of r.safety ?? []) if (!SAFETY_TAGS.includes(s)) errs.push(`${tag}: safety tag ${s} is unknown`);
    const rows = r.ingredients ?? [];
    if (rows.length < 2 || rows.length > 9) errs.push(`${tag}: needs 2 to 9 counted ingredients`);
    const seen = new Set();
    for (const i of rows) {
      const row = table.get(i.ingredient);
      if (!row) { errs.push(`${tag}: ingredient ${i.ingredient} is not in the ingredient table`); continue; }
      if (seen.has(i.ingredient)) errs.push(`${tag}: ingredient ${i.ingredient} listed twice`);
      seen.add(i.ingredient);
      if (!(typeof i.grams === 'number' && Number.isFinite(i.grams) && i.grams > 0)) errs.push(`${tag}: grams for ${i.ingredient} must be above 0`);
      if (row.per100g === undefined) errs.push(`${tag}: ingredient ${i.ingredient} has no per100g values`);
      if (!prices.has(i.ingredient)) errs.push(`${tag}: ingredient ${i.ingredient} has no price`);
    }
    const steps = r.steps ?? [];
    if (steps.length < 2 || steps.length > 8) errs.push(`${tag}: needs 2 to 8 steps`);
    for (const s of steps) if (!nonEmpty(s) || s.length > 160) errs.push(`${tag}: each step must be 1 to 160 characters`);
    const hasHigh = rows.some((i) => high.has(i.ingredient));
    const knownSrc = (id) => src.ids.has(id);
    if (hasHigh && steps.some((s) => FIGURE_IN_STEP.test(s)) && !(r.safetySourceId && knownSrc(r.safetySourceId))) {
      errs.push(`${tag}: a temperature or number of minutes in a step needs a safetySourceId`);
    }
    if (r.safetySourceId !== undefined && !knownSrc(r.safetySourceId)) errs.push(`${tag}: safetySourceId ${r.safetySourceId} is unknown`);
    const rawRows = rows.filter((i) => raw.has(i.ingredient));
    if (rawRows.length > 0) {
      if (!nonEmpty(r.cookThroughSourceId)) errs.push(`${tag}: raw poultry or mince needs a cookThroughSourceId`);
      else if (!knownSrc(r.cookThroughSourceId)) errs.push(`${tag}: cookThroughSourceId ${r.cookThroughSourceId} is unknown`);
      if (!nonEmpty(r.safetySourceId)) errs.push(`${tag}: raw poultry or mince needs a safetySourceId on its thermometer step`);
      const targets = new Set(rawRows.map((i) => d.cookTargetsC?.[i.ingredient]));
      for (const t of targets) {
        if (!Number.isInteger(t)) errs.push(`${tag}: a cook target (cookTargetsC) is missing for its raw meat`);
        else if (!steps.some((s) => /thermometer/i.test(s) && new RegExp(`\\b${t}\\s*°\\s*C`).test(s))) {
          errs.push(`${tag}: needs a food thermometer step stating ${t}°C for its raw meat`);
        }
      }
    }
    for (const s of steps) {
      if (/\bpink\b|juices|colour|color/i.test(s) && !/(only )?(a )?second(ary)? sign/i.test(s)) errs.push(`${tag}: colour may only be a secondary sign beside the thermometer step`);
    }
    if (rows.some((i) => i.ingredient === 'egg')) {
      if (!steps.some((s) => /firm/i.test(s))) errs.push(`${tag}: a recipe with egg needs a step saying the egg is cooked until completely firm`);
      if (r.safetySourceId !== d.eggSourceId) errs.push(`${tag}: a recipe with egg needs the egg source (safetySourceId ${d.eggSourceId})`);
    }
    if (rows.every((i) => prices.has(i.ingredient)) && recipeCostPerServe(r, prices) > MAX_COST_PER_SERVE) {
      errs.push(`${tag}: sample cost per serve is above $4.00`);
    }
  }
  const total = (d.recipes ?? []).length;
  if (total < MIN_RECIPES) errs.push(`needs at least ${MIN_RECIPES} recipes, has ${total}`);
  const traditionsCovered = [...perTradition.values()].filter((n) => n >= 2).length;
  if (traditionsCovered < MIN_TRADITIONS) errs.push(`needs at least ${MIN_TRADITIONS} traditions with 2 recipes, has ${traditionsCovered}`);

  const subKeys = new Set();
  const lookup = (id) => table.get(id);
  for (const s of d.substitutions ?? []) {
    const tag = `substitution ${s.from} -> ${s.to}`;
    if (!table.has(s.from) || !table.has(s.to)) { errs.push(`${tag}: ingredient not in the table`); continue; }
    if (subKeys.has(tag)) errs.push(`${tag}: duplicate`);
    subKeys.add(tag);
    if (s.from === s.to) errs.push(`${tag}: same ingredient`);
    if (!nonEmpty(s.note)) errs.push(`${tag}: needs a note`);
    if (s.basis !== "Author's judgement") errs.push(`${tag}: basis must be "Author's judgement"`);
    const a = deriveFlags([s.from], lookup);
    const b = deriveFlags([s.to], lookup);
    if (!sameFlags(a, b)) errs.push(`${tag}: diet flags or allergens differ`);
    if (table.get(s.to).per100g === undefined) errs.push(`${tag}: substitute has no nutrition`);
  }
  for (const id of d.starters ?? []) if (table.get(id)?.per100g === undefined) errs.push(`starter ${id} has no nutrition`);
  if (!Array.isArray(d.notFound) || d.notFound.some((n) => !nonEmpty(n))) errs.push('notFound must be a list of non-empty strings');
  return errs;
}

/** The generated file's text. */
export function buildRecipes(d, cultural, today = melbourneToday()) {
  const errs = validateRecipes(d, cultural, today);
  if (errs.length) throw new Error(`Invalid recipe dataset:\n- ${errs.join('\n- ')}`);
  const ingredients = mergedIngredients(d, cultural);
  const table = new Map(ingredients.map((i) => [i.id, i]));
  const lookup = (id) => table.get(id);
  const recipes = d.recipes.map((r) => {
    const perServe = computeNutrition({ recipe: r.ingredients.map((i) => ({ ingredient: i.ingredient, grams: i.grams / r.serves })) }, table);
    const flags = deriveFlags(r.ingredients.map((i) => i.ingredient), lookup);
    return {
      id: r.id, name: r.name, blurb: r.blurb, traditions: [...r.traditions], serves: r.serves, minutes: r.minutes,
      ingredients: r.ingredients.map((i) => ({ ingredient: i.ingredient, grams: i.grams, ...(i.optional ? { optional: true } : {}) })),
      seasonings: [...r.seasonings], steps: [...r.steps], safety: [...r.safety], basis: r.basis,
      ...(r.cookThroughSourceId ? { cookThroughSourceId: r.cookThroughSourceId } : {}),
      ...(r.safetySourceId ? { safetySourceId: r.safetySourceId } : {}),
      nutrition: { perServe, sodiumModelled: false },
      info: { itemId: r.id, traditions: [...r.traditions], flags },
    };
  });
  const used = new Set(d.sources.map((s) => s.id));
  for (const i of ingredients) {
    if (i.nutritionSourceId) used.add(i.nutritionSourceId);
    if (i.attributeSourceId) used.add(i.attributeSourceId);
    for (const v of Object.values(i.attributeSources ?? {})) used.add(v);
  }
  const own = new Map(d.sources.map((s) => [s.id, s]));
  const sources = [...used].map((id) => own.get(id) ?? cultural.sources.find((s) => s.id === id));
  const data = {
    generatedAt: d.generatedAt,
    sources,
    ingredients,
    prices: d.ingredientPrices.map((p) => ({ ingredient: p.ingredient, perKg: p.perKg })),
    substitutions: d.substitutions.map((s) => ({ from: s.from, to: s.to, note: s.note })),
    recipes,
    starters: [...d.starters],
    notFound: d.notFound,
  };
  return (
    '// GENERATED by scripts/build-recipes.mjs from docs/superpowers/research/2026-10-29-pantry-recipes.json.\n' +
    '// Generated, do not edit by hand; run `npm run build:recipes`.\n' +
    "import type { RecipesData } from '../types';\n\n" +
    `export const recipesData: RecipesData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const cultural = JSON.parse(readFileSync(CULTURAL_PATH, 'utf8'));
  writeFileSync(OUT_PATH, buildRecipes(raw, cultural));
  console.log(`Wrote ${OUT_PATH}`);
}
