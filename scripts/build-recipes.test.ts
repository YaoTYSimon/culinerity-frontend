// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATA_PATH as CULTURAL_PATH, deriveFlags } from './build-cultural.mjs';
import { DATA_PATH, OUT_PATH, buildRecipes, mergedIngredients, recipeCostPerServe, validateRecipes } from './build-recipes.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const cultural = () => JSON.parse(readFileSync(CULTURAL_PATH, 'utf8'));
const TODAY = '2026-10-29';
const errorsFor = (mut: (d: any) => void) => {
  const d = data();
  mut(d);
  return validateRecipes(d, cultural(), TODAY).join('\n');
};
const first = (d: any) => d.recipes[0];
const generated = () => {
  const t = buildRecipes(data(), cultural(), TODAY);
  return t.slice(t.indexOf('= {') + 2).replace(/;\s*$/, '');
};

describe('build-recipes validator', () => {
  it('accepts the committed dataset', () => {
    expect(validateRecipes(data(), cultural(), TODAY)).toEqual([]);
  });
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildRecipes(data(), cultural(), TODAY));
  });
  it('rejects an ingredient id that is not in the table', () => {
    expect(errorsFor((d) => (first(d).ingredients[0].ingredient = 'unobtainium'))).toMatch(/unobtainium.*not in the ingredient table/);
  });
  it('rejects a counted ingredient without per100g', () => {
    expect(errorsFor((d) => (first(d).ingredients[0].ingredient = 'cooking-oil'))).toMatch(/cooking-oil has no per100g/);
  });
  it('rejects 10 ingredients, 61 minutes, no steps and a 161-char step', () => {
    expect(errorsFor((d) => (first(d).ingredients = Array.from({ length: 10 }, () => ({ ingredient: 'rice', grams: 10 }))))).toMatch(/2 to 9/);
    expect(errorsFor((d) => (first(d).minutes = 61))).toMatch(/minutes/);
    expect(errorsFor((d) => (first(d).steps = []))).toMatch(/steps/);
    expect(errorsFor((d) => (first(d).steps[0] = 'x'.repeat(161)))).toMatch(/160/);
  });
  it('rejects a substitution whose flags or allergens differ', () => {
    expect(errorsFor((d) => d.substitutions.push({ from: 'egg', to: 'rice', note: 'x', basis: "Author's judgement" }))).toMatch(/egg -> rice/);
    expect(errorsFor((d) => d.substitutions.push({ from: 'milk', to: 'yoghurt', note: 'x', basis: "Author's judgement" }))).toEqual('');
  });
  it('rejects an ingredient used without a price', () => {
    expect(errorsFor((d) => (d.ingredientPrices = d.ingredientPrices.filter((p: any) => p.ingredient !== first(d).ingredients[0].ingredient)))).toMatch(/no price/);
  });
  it('rejects an unknown tradition id', () => {
    expect(errorsFor((d) => (first(d).traditions = ['atlantis']))).toMatch(/tradition atlantis/);
  });
  it('rejects a source without https URL, licence or accessed date', () => {
    expect(errorsFor((d) => (d.sources[0].url = 'http://x.org'))).toMatch(/https/);
    expect(errorsFor((d) => delete d.sources[0].licence)).toMatch(/licence/);
    expect(errorsFor((d) => delete d.sources[0].accessed)).toMatch(/accessed/);
  });
  it('rejects a temperature or minutes for a highRisk ingredient unless the recipe cites a source', () => {
    const chicken = (d: any) => d.recipes.find((r: any) => r.ingredients.some((i: any) => i.ingredient === 'chicken-thigh'));
    expect(errorsFor((d) => { delete chicken(d).safetySourceId; chicken(d).steps[0] = 'Cook to 74°C.'; })).toMatch(/safetySourceId/);
    expect(errorsFor((d) => { delete chicken(d).safetySourceId; chicken(d).steps[0] = 'Cook for 12 minutes.'; })).toMatch(/safetySourceId/);
  });
  it('rejects fewer than 40 recipes and fewer than 10 traditions with 2 recipes', () => {
    expect(errorsFor((d) => (d.recipes = d.recipes.slice(0, 39)))).toMatch(/at least 40 recipes/);
    expect(errorsFor((d) => d.recipes.forEach((r: any) => { if (r.traditions[0] === 'turkish') r.traditions = []; }))).toMatch(/10 traditions/);
  });
  it('rejects a raw poultry or mince recipe without cookThroughSourceId', () => {
    expect(errorsFor((d) => delete d.recipes.find((r: any) => r.cookThroughSourceId).cookThroughSourceId)).toMatch(/cookThroughSourceId/);
    expect(errorsFor((d) => (d.recipes.find((r: any) => r.cookThroughSourceId).cookThroughSourceId = 'nope'))).toMatch(/nope/);
  });
  it('rejects a recipe dearer than $4.00 a serve', () => {
    expect(errorsFor((d) => (d.ingredientPrices.find((p: any) => p.ingredient === 'beef-mince').perKg = 15))).not.toMatch(/\$4/);
    expect(errorsFor((d) => d.ingredientPrices.forEach((p: any) => (p.perKg = 15)))).toMatch(/\$4/);
  });
  it('rejects a price not rounded to 10c', () => {
    expect(errorsFor((d) => (d.ingredientPrices[0].perKg = 2.55))).toMatch(/10c/);
  });
});

describe('build-recipes output', () => {
  it('derives vegetarian yes for a dal recipe and unknown never passes', () => {
    const out = JSON.parse(generated());
    const dal = out.recipes.find((r: any) => r.id === 'palak-dal');
    expect(dal.info.flags.vegetarian).toBe('yes');
    const beans = out.recipes.find((r: any) => r.id === 'beans-on-toast');
    expect(beans.info.flags.vegetarian).toBe('unknown');
    expect(out.recipes.every((r: any) => r.nutrition.sodiumModelled === false)).toBe(true);
  });
  it('computes nutrition as the per-100g sums (hand-checked porridge)', () => {
    const out = JSON.parse(generated());
    const p = out.recipes.find((r: any) => r.id === 'banana-porridge');
    // per serve: oats 40 g (1564 kJ, 12.2 p, 9.5 f, 1.0 s, 2 mg), milk 150 g (270, 3.3, 0, 5.4, 35), banana 60 g (399, 1.4, 2.2, 13.4, 0)
    expect(p.nutrition.perServe).toEqual({ energyKj: 1270, proteinG: 10.7, fibreG: 5.1, sugarG: 16.5, sodiumMg: 53 });
  });
  it('the merged table keeps the cultural rows and completes rolled-oats with nutrition', () => {
    const m = mergedIngredients(data(), cultural());
    expect(m.length).toBeGreaterThan(cultural().ingredients.length);
    expect(m.find((i: any) => i.id === 'rolled-oats').per100g.energyKj).toBe(1564);
    expect(deriveFlags(['rolled-oats'], (id: string) => m.find((i: any) => i.id === id))).toEqual(deriveFlags(['rolled-oats'], (id: string) => cultural().ingredients.find((i: any) => i.id === id)));
  });
  it('costs a serve from the price table', () => {
    const d = data();
    const r = d.recipes.find((x: any) => x.id === 'banana-porridge');
    const price = (id: string) => d.ingredientPrices.find((p: any) => p.ingredient === id).perKg;
    const want = (r.ingredients.reduce((s: number, i: any) => s + (i.grams * price(i.ingredient)) / 1000, 0)) / r.serves;
    expect(recipeCostPerServe(r, new Map(d.ingredientPrices.map((p: any) => [p.ingredient, p.perKg])))).toBeCloseTo(want, 6);
  });
});
