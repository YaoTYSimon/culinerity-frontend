import type { Nutrition } from '../domain/types';
import type { FoodInfo, IngredientAttr, SourceRecord } from '../food/types';

export interface RecipeIngredient {
  /** An ingredient id from the pantry ingredient table. */
  ingredient: string;
  grams: number;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  /** The app's own words, at most 100 characters. */
  blurb: string;
  /** Tradition ids from the cultural data; empty for everyday basics. */
  traditions: string[];
  serves: number;
  minutes: number;
  /** 2 to 9 counted rows (optional rows are counted). */
  ingredients: RecipeIngredient[];
  /** Shown as text only; never counted, never missing. */
  seasonings: Array<'salt' | 'pepper'>;
  steps: string[];
  /** Drives the fixed NSW Food Authority lines. */
  safety: Array<'rice' | 'pasta' | 'leftovers'>;
  basis: string;
  /** Swap recipes only: the credit for the ingredient list, ending "Method written by us." */
  credit?: string;
  /** Minor seasoning ingredient ids left out of the counted rows; still in the nutrition. Shown as a line of text. */
  uncounted?: string[];
  /** Set on recipes with raw poultry or mince: the source for the "cook right through" step. */
  cookThroughSourceId?: string;
  /** Set when a step prints a temperature or a time for food safety. */
  safetySourceId?: string;
  nutrition: { perServe: Omit<Nutrition, 'itemId'>; sodiumModelled: false };
  info: FoodInfo;
}

export interface Substitution {
  from: string;
  to: string;
  note: string;
}

/** A cultural ingredient row plus pantry search aliases and the high-risk flag. */
export type IngredientRow = IngredientAttr & {
  nutritionName?: string;
  basis?: string;
  aliases?: string[];
  /** Meat, fish, eggs, milk and soft cheese: a past best-before date is treated like a use-by. */
  highRisk?: boolean;
};

export interface IngredientPrice {
  ingredient: string;
  /** Sample estimate in dollars per kg, rounded to 10c. */
  perKg: number;
}

export interface RecipesData {
  generatedAt: string;
  sources: SourceRecord[];
  ingredients: IngredientRow[];
  prices: IngredientPrice[];
  substitutions: Substitution[];
  recipes: Recipe[];
  starters: string[];
  notFound: string[];
}
