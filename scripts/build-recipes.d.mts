export const DATA_PATH: string;
export const OUT_PATH: string;
export const MIN_RECIPES: number;
export const MIN_TRADITIONS: number;
export const MAX_COST_PER_SERVE: number;
export function mergedIngredients(data: any, cultural: any): any[];
export function recipeCostPerServe(recipe: { serves: number; ingredients: Array<{ ingredient: string; grams: number }> }, prices: Map<string, number>): number;
export function validateRecipes(data: any, cultural: any, today?: string): string[];
export function buildRecipes(data: any, cultural: any, today?: string): string;
