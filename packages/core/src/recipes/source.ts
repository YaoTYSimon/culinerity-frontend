import { recipesData } from './generated/recipes.generated';
import type { IngredientRow, Recipe, RecipesData, Substitution } from './types';
import type { SourceRecord } from '../food/types';

export { recipesData };

const copyRecipe = (r: Recipe): Recipe => structuredClone(r);

/** Every recipe, in file order. Callers get copies. */
export function allRecipes(data: RecipesData = recipesData): Recipe[] {
  return data.recipes.map(copyRecipe);
}

export function recipeById(id: string, data: RecipesData = recipesData): Recipe | undefined {
  const r = data.recipes.find((x) => x.id === id);
  return r ? copyRecipe(r) : undefined;
}

/** The pantry ingredient table: the cultural rows plus the extras added for recipes. */
export function pantryIngredients(data: RecipesData = recipesData): IngredientRow[] {
  return data.ingredients.map((i) => structuredClone(i));
}

/** Display name of an ingredient id; an unknown id returns itself. */
export function ingredientName(id: string, data: RecipesData = recipesData): string {
  return data.ingredients.find((i) => i.id === id)?.name ?? id;
}

/** Sample price in dollars per kg, or undefined when no price is recorded. */
export function priceOf(id: string, data: RecipesData = recipesData): number | undefined {
  return data.prices.find((p) => p.ingredient === id)?.perKg;
}

/** Sample prices as an ingredient id to dollars-per-kg map: the one place it is built. A fresh Map each call. */
export function priceTable(data: RecipesData = recipesData): Map<string, number> {
  return new Map(data.prices.map((p) => [p.ingredient, p.perKg]));
}

/** Every substitution, in file order. Callers get copies. */
export function allSubstitutions(data: RecipesData = recipesData): Substitution[] {
  return data.substitutions.map((s) => ({ ...s }));
}

/** Substitutions that can stand in for `id` (same diet flags and allergens by construction). */
export function substitutionsFor(id: string, data: RecipesData = recipesData): Substitution[] {
  return data.substitutions.filter((s) => s.from === id).map((s) => ({ ...s }));
}

export const STARTER_IDS: readonly string[] = [...recipesData.starters];

export function recipeSources(data: RecipesData = recipesData): SourceRecord[] {
  return data.sources.map((s) => ({ ...s }));
}
