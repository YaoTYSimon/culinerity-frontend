import type { FoodInfo, FoodProfile, RuleFlags } from '../food/types';
import type { Recipe, RecipeIngredient } from '../recipes/types';
import type { PantryItem, PantryState } from './types';

export const NOW = new Date(2026, 9, 29, 15, 30, 0);

export const flags = (o: Partial<RuleFlags> = {}): RuleFlags => ({
  halal: 'yes', kosher: 'yes', vegetarian: 'yes', vegan: 'yes', beef: 'no', pork: 'no', alcohol: 'no', gluten: 'no',
  allergens: [], allergensKnown: true, certifiedMeat: false, ...o,
});

export function recipe(id: string, ingredients: Array<string | RecipeIngredient>, o: Partial<Recipe> = {}, flagOverride: Partial<RuleFlags> = {}): Recipe {
  const info: FoodInfo = { itemId: id, traditions: [], flags: flags(flagOverride) };
  return {
    id, name: id, blurb: 'b', traditions: [], serves: 2, minutes: 20,
    ingredients: ingredients.map((i) => (typeof i === 'string' ? { ingredient: i, grams: 100 } : i)),
    seasonings: [], steps: ['a', 'b'], safety: [], basis: 'x',
    nutrition: { perServe: { energyKj: 0, proteinG: 0, fibreG: 0, sugarsG: 0, sodiumMg: 0 } as Recipe['nutrition']['perServe'], sodiumModelled: false },
    info, ...o,
  };
}

export const item = (id: string, o: Partial<PantryItem> = {}): PantryItem => ({ id: `i-${id}`, ingredientId: id, name: id, addedAt: '2026-10-01T00:00:00.000Z', ...o });
export const pantry = (items: PantryItem[], o: Partial<PantryState> = {}): PantryState => ({ items, staples: [], serves: 2, ...o });
export const food = (o: Partial<FoodProfile> = {}): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: [], dismissed: [], ...o });
