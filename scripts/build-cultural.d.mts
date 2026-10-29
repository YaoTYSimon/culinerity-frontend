export const DATA_PATH: string;
export const OUT_PATH: string;
export function validateCultural(data: any, today?: string, options?: { freshness?: boolean }): string[];
export function buildCultural(data: any, today?: string): string;
export function calendarWarning(data: any, today?: string): string | null;
export function melbourneToday(now?: Date): string;
export function deriveFlags(
  ingredients: any[],
  lookup?: (id: string) => any,
): {
  halal: 'yes' | 'no' | 'unknown';
  kosher: 'yes' | 'no' | 'unknown';
  vegetarian: 'yes' | 'no' | 'unknown';
  vegan: 'yes' | 'no' | 'unknown';
  beef: 'yes' | 'no' | 'unknown';
  pork: 'yes' | 'no' | 'unknown';
  alcohol: 'yes' | 'no' | 'unknown';
  gluten: 'yes' | 'no' | 'unknown';
  allergens: string[];
  allergensKnown: boolean;
  certifiedMeat: boolean;
};
export function validateIngredientRow(row: any, sourceIds: Set<string>): string[];
