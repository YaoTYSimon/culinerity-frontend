// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATA_PATH as CULTURAL_PATH, deriveFlags } from './build-cultural.mjs';
import { DATA_PATH, OUT_PATH, buildRecipes, expandSwapRecipes, mergedIngredients, recipeCostPerServe, validateRecipes } from './build-recipes.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const cultural = () => JSON.parse(readFileSync(CULTURAL_PATH, 'utf8'));
const TODAY = '2026-10-30';
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
    expect(errorsFor((d) => { d.recipes = d.recipes.slice(0, 39); d.swapRecipes = []; })).toMatch(/at least 40 recipes/);
    expect(errorsFor((d) => d.recipes.forEach((r: any) => { if (r.traditions[0] === 'turkish') r.traditions = []; }))).toMatch(/10 traditions/);
  });
  it('rejects a raw poultry or mince recipe without cookThroughSourceId', () => {
    expect(errorsFor((d) => delete d.recipes.find((r: any) => r.cookThroughSourceId).cookThroughSourceId)).toMatch(/cookThroughSourceId/);
    expect(errorsFor((d) => (d.recipes.find((r: any) => r.cookThroughSourceId).cookThroughSourceId = 'nope'))).toMatch(/nope/);
  });
  it('rejects raw poultry or mince whose cook step has no thermometer wording, right temperature or source', () => {
    const meat = (d: any, id: string) => d.recipes.find((r: any) => r.ingredients.some((i: any) => i.ingredient === id));
    const replaceTemp = (r: any, text: string) => (r.steps = r.steps.map((x: string) => (/thermometer/i.test(x) ? text : x)));
    expect(errorsFor((d) => replaceTemp(meat(d, 'chicken-thigh'), 'Cook until no pink is left and the juices run clear.'))).toMatch(/thermometer/);
    expect(errorsFor((d) => replaceTemp(meat(d, 'chicken-thigh'), 'Use a food thermometer in the thickest part; it should read 71°C.'))).toMatch(/74/);
    expect(errorsFor((d) => replaceTemp(meat(d, 'beef-mince'), 'Use a food thermometer in the thickest part; it should read 74°C.'))).toMatch(/71/);
    expect(errorsFor((d) => delete meat(d, 'lamb-mince').safetySourceId)).toMatch(/safetySourceId/);
    expect(errorsFor((d) => (meat(d, 'chicken-breast').safetySourceId = 'nope'))).toMatch(/nope/);
  });
  it('rejects raw poultry or mince whose thermometer step has no heat step before it', () => {
    const kofta = (d: any) => d.recipes.find((r: any) => r.id === 'lamb-kofta-plate');
    expect(errorsFor((d) => (kofta(d).steps = ['Mix the mince with the onion and spices.', 'Shape into patties.', ...kofta(d).steps.filter((x: string) => /thermometer/i.test(x))]))).toMatch(/heat step.*before/);
    const chicken = (d: any) => d.recipes.find((r: any) => r.id === 'chicken-broccoli-stir-fry');
    expect(errorsFor((d) => (chicken(d).steps = chicken(d).steps.filter((x: string) => !/Stir-fry/.test(x))))).toMatch(/heat step.*before/);
    expect(errorsFor((d) => (kofta(d).steps = ['Mix and shape the patties.', 'Grill or fry the patties until browned.', ...kofta(d).steps.filter((x: string) => /thermometer/i.test(x))]))).toBe('');
  });
  it('rejects colour as the only doneness test for raw poultry or mince', () => {
    const chicken = (d: any) => d.recipes.find((r: any) => r.ingredients.some((i: any) => i.ingredient === 'chicken-thigh'));
    expect(errorsFor((d) => chicken(d).steps.push('Cook until no pink is left.'))).toMatch(/secondary/);
  });
  it('rejects a recipe with egg that has no firm-egg step or egg source', () => {
    const egg = (d: any) => d.recipes.find((r: any) => r.id === 'egg-curry');
    expect(errorsFor((d) => (egg(d).steps = egg(d).steps.map((x: string) => x.replace(/firm/g, 'ready'))))).toMatch(/firm/);
    expect(errorsFor((d) => delete egg(d).safetySourceId)).toMatch(/egg/);
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

  describe('swap recipes', () => {
    it('derives weights and nutrition from the swap food, never typed by hand', () => {
      const d = data();
      const c = cultural();
      const { recipes, errs } = expandSwapRecipes(d, c);
      expect(errs).toEqual([]);
      expect(recipes.length).toBe(d.swapRecipes.length);
      const nuggets = recipes.find((r: any) => r.id === 'chicken-veg-nuggets');
      const food = c.foods.find((f: any) => f.id === 'chicken-veg-nuggets');
      expect(nuggets.ingredients.find((i: any) => i.ingredient === 'chicken-mince').grams).toBe(400);
      expect(nuggets.nutritionRows).toBe(food.recipe);
      expect(nuggets.credit).toContain('Chicken and Veg Nuggets');
      expect(nuggets.credit).toContain('https://hw.qld.gov.au/healthy-recipes/chicken-and-veg-nuggets/');
      expect(nuggets.credit).toMatch(/CC BY 4\.0.*Method written by us\.$/);
    });
    it('keeps the swap food nutrition even when minor rows are not counted', () => {
      const out = buildRecipes(data(), cultural(), TODAY);
      expect(out).toContain('"uncounted"');
      const recipes = JSON.parse(out.slice(out.indexOf('= {') + 2).replace(/;\s*$/, '')).recipes;
      const r = recipes.find((x: any) => x.id === 'san-choy-bow');
      expect(r.ingredients.length).toBe(9);
      expect(r.uncounted).toEqual(['coriander-fresh', 'ginger', 'chilli-green', 'spring-onion']);
    });
    it('rejects an unknown swap food, a dropped row that is not in it, and a missing price', () => {
      expect(errorsFor((d) => (d.swapRecipes[0].id = 'no-such-food'))).toMatch(/no swap food with that id/);
      expect(errorsFor((d) => (d.swapRecipes[0].drop = ['unobtainium']))).toMatch(/drops unobtainium/);
      expect(errorsFor((d) => (d.ingredientPrices = d.ingredientPrices.filter((p: any) => p.ingredient !== 'chicken-mince')))).toMatch(/chicken-mince has no price/);
    });
    it('needs the thermometer step for raw mince in a swap recipe', () => {
      expect(errorsFor((d) => (d.swapRecipes.find((r: any) => r.id === 'simple-beef-nachos').steps = ['Brown the mince.', 'Add tomatoes and simmer.']))).toMatch(/thermometer/);
    });
  });
});
