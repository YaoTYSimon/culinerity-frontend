import { describe, expect, it } from 'vitest';
import { culturalData } from '../cultural/source';
import { allRecipes, ingredientName, pantryIngredients, priceOf, recipeById, recipeSources, STARTER_IDS, substitutionsFor } from './source';

describe('pantry recipes data', () => {
  it('has at least 40 recipes with unique ids', () => {
    const r = allRecipes();
    expect(r.length).toBeGreaterThanOrEqual(40);
    expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
  });
  it('covers 10 traditions with 2 or more recipes and 20 or more vegetarian ones', () => {
    const counts = new Map<string, number>();
    for (const r of allRecipes()) for (const t of r.traditions) counts.set(t, (counts.get(t) ?? 0) + 1);
    expect([...counts.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(10);
    expect(allRecipes().filter((r) => r.info.flags.vegetarian === 'yes').length).toBeGreaterThanOrEqual(20);
    expect(allRecipes().filter((r) => r.traditions.length === 0).length).toBeGreaterThanOrEqual(10);
  });
  it('resolves every ingredient, price and tradition', () => {
    const ids = new Set(pantryIngredients().map((i) => i.id));
    const trads = new Set(culturalData.traditions.map((t) => t.id));
    for (const r of allRecipes()) {
      for (const i of r.ingredients) {
        expect(ids.has(i.ingredient), `${r.id} ${i.ingredient}`).toBe(true);
        expect(priceOf(i.ingredient), `${r.id} price ${i.ingredient}`).toBeGreaterThan(0);
      }
      for (const t of r.traditions) expect(trads.has(t)).toBe(true);
      expect(r.nutrition.sodiumModelled).toBe(false);
    }
  });
  it('keeps the 102 cultural ingredients and adds extras', () => {
    expect(pantryIngredients().length).toBeGreaterThan(102);
    expect(ingredientName('tuna-canned')).toBe('Tuna, canned');
    expect(ingredientName('nope')).toBe('nope');
  });
  it('starters are the 14 chosen ids and all have nutrition', () => {
    expect(STARTER_IDS).toHaveLength(14);
    const rows = pantryIngredients();
    for (const id of STARTER_IDS) expect(rows.find((i) => i.id === id)?.per100g, id).toBeDefined();
  });
  it('substitutions resolve and a pair is directional', () => {
    expect(substitutionsFor('lentil-red').map((s) => s.to)).toEqual(['lentil-green']);
    expect(substitutionsFor('nope')).toEqual([]);
  });
  it('a recipe with raw poultry or mince cites its cook-through source, which is recorded', () => {
    const ids = new Set(recipeSources().map((s) => s.id));
    const withChicken = allRecipes().filter((r) => r.cookThroughSourceId);
    expect(withChicken.length).toBeGreaterThan(0);
    for (const r of withChicken) expect(ids.has(r.cookThroughSourceId!)).toBe(true);
  });
  it('returns copies and undefined for an unknown recipe', () => {
    expect(recipeById('nope')).toBeUndefined();
    const a = allRecipes();
    a[0].name = 'x';
    a[0].ingredients[0].grams = 1;
    expect(allRecipes()[0].name).not.toBe('x');
    const r = recipeById(a[1].id)!;
    r.steps.push('x');
    expect(recipeById(a[1].id)!.steps).not.toContain('x');
    pantryIngredients()[0].name = 'x';
    expect(pantryIngredients()[0].name).not.toBe('x');
  });
  it('has the swap foods as Cook recipes with the swap food weights, nutrition and a credit', () => {
    const ids = ['chicken-veg-nuggets', 'beef-veg-sausage-rolls', 'lentil-sweet-potato-patties', 'ginger-chicken-veg-stir-fry', 'san-choy-bow', 'simple-beef-nachos', 'chicken-avocado-soft-tacos', 'anzac-biscuits-home', 'carrot-date-oat-biscuit', 'banana-blueberry-smoothie', 'strawberry-yoghurt-smoothie',
      // batch 2 swap foods
      'avocado-salsa-pita-chips', 'spiced-mixed-nuts', 'tropical-frozen-yoghurt-bites', 'mini-omelettes', 'spinach-egg-roll-ups', 'banana-bread-slice', 'banana-blueberry-pikelets', 'pizza-scrolls', 'creamy-vegetable-pasta', 'chicken-pesto-pasta', 'tofu-noodle-veg-stir-fry', 'pumpkin-chickpea-coconut-curry'];
    for (const id of ids) {
      const r = recipeById(id)!;
      const n = culturalData.catalogue.nutrition.find((x) => x.itemId === id)!;
      expect(r, id).toBeDefined();
      expect(r.nutrition.perServe.energyKj, id).toBe(n.energyKj);
      expect(r.nutrition.perServe.proteinG, id).toBe(n.proteinG);
      expect(r.ingredients.length).toBeLessThanOrEqual(9);
      expect(r.credit, id).toMatch(/Method written by us\.$/);
      expect(r.steps.length).toBeLessThanOrEqual(6);
    }
    expect(recipeById('san-choy-bow')!.cookThroughSourceId).toBe('nsw-fa-cooking-temps');
    expect(recipeById('chicken-pesto-pasta')!.cookThroughSourceId).toBe('nsw-fa-cooking-temps');
    expect(recipeById('mini-omelettes')!.safetySourceId).toBe('nsw-fa-eggs');
    // still too costly (about $5.80 a serve) and too many rows (13, only 3 minor)
    expect(recipeById('baked-fish-capsicum')).toBeUndefined();
    expect(recipeById('beef-taco-roll')).toBeUndefined();
  });
  it('does not change the cultural data: the cultural catalogue still has its 49 foods plus cravings', () => {
    expect(culturalData.catalogue.items.length).toBeGreaterThanOrEqual(51);
  });
});
