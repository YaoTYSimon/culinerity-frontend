export type DateKind = 'use-by' | 'best-before' | 'cooked' | 'opened';

export const DATE_KINDS: readonly DateKind[] = ['use-by', 'best-before', 'cooked', 'opened'];

export interface PantryItem {
  id: string;
  /** Present when matched to the ingredient table; absent for free text. */
  ingredientId?: string;
  name: string;
  /** Optional quantity, integer 1..50000. */
  grams?: number;
  /** Both date fields or neither. */
  dateKind?: DateKind;
  /** YYYY-MM-DD, local day. */
  date?: string;
  /** ISO date-time. */
  addedAt: string;
}

export interface PantryState {
  items: PantryItem[];
  /** Ingredient ids the person says they always have. */
  staples: string[];
  serves: number;
}

export interface ShoppingEntry {
  id: string;
  ingredientId?: string;
  name: string;
  recipeId?: string;
  addedAt: string;
}

export const PANTRY_CAP = 200;
export const STAPLES_CAP = 40;
export const SHOPPING_CAP = 100;
export const NAME_MAX = 40;
export const DEFAULT_SERVES = 2;
export const MIN_SERVES = 1;
export const MAX_SERVES = 8;
export const MAX_GRAMS = 50000;
