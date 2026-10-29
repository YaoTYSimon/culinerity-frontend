import { ingredientName, scaledGrams, type FoodProfile, type MissingItem, type PantryItem, type Recipe, type RecipeIngredient, type RecipeMatch } from '@culinerity/core';
import { BEST_BEFORE_CHECK } from './pantryCopy';
import { dayLabel } from './foodCopy';

/** Any food rule or allergy is on (the same test as the swaps screen). */
export const hasFoodRules = (food: FoodProfile | undefined): boolean =>
  (food?.rules.length ?? 0) > 0 || (food?.allergies.some((a) => a.trim() !== '') ?? false);

/** Dollars from cents, always two places: "$1.30". */
export const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export const timeAndServes = (recipe: Recipe, serves: number): string => `${recipe.minutes} min · serves ${serves}`;

/** "Need one more thing: Tomatoes, tinned (about $0.50, sample price)". The price clause is left out when any price is unknown. */
export function statusLine(label: string, match: RecipeMatch): string {
  const names = match.missing.map((m) => ingredientName(m.ingredient)).join('; ');
  return match.missingCostCents === null ? `${label}: ${names}` : `${label}: ${names} (about ${dollars(match.missingCostCents)}, sample price)`;
}

const dateWords = { 'use-by': 'use by', 'best-before': 'best before' } as const;

/** "Uses your spinach (use by Sat 31 Oct)" for each pantry item the recipe uses that is due soon. */
function soonLines(match: RecipeMatch, items: PantryItem[]): string[] {
  return match.usesSoon.flatMap((id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return [];
    const when = item.date && (item.dateKind === 'use-by' || item.dateKind === 'best-before') ? ` (${dateWords[item.dateKind]} ${dayLabel(item.date)})` : '';
    return [`Uses your ${item.name.toLowerCase()}${when}`];
  });
}

const shortName = (id: string): string => ingredientName(id).split(',')[0].toLowerCase();

/** "Using green lentils instead of red": the words both names share are dropped from the second. */
function subLine(from: string, to: string): string {
  const a = shortName(from).split(' ');
  const b = shortName(to).split(' ');
  let shared = 0;
  while (shared < a.length - 1 && shared < b.length && a[a.length - 1 - shared] === b[b.length - 1 - shared]) shared += 1;
  return `Using ${b.join(' ')} instead of ${a.slice(0, a.length - shared).join(' ')}`;
}

/** The lines under a recipe: what it uses up soon, what it swaps, and which dated items to look at. */
export function noteLines(match: RecipeMatch, items: PantryItem[]): string[] {
  const check = match.checkDates.flatMap((id) => {
    const item = items.find((i) => i.id === id);
    return item ? [`${item.name}: ${BEST_BEFORE_CHECK.charAt(0).toLowerCase()}${BEST_BEFORE_CHECK.slice(1)}`] : [];
  });
  return [...soonLines(match, items), ...match.subs.map((s) => subLine(s.from, s.to)), ...check];
}

/** How one ingredient row stands: in the pantry, a swap, missing with a price, or optional. */
export function ingredientStatus(row: RecipeIngredient, match: RecipeMatch): string {
  const missing: MissingItem | undefined = match.missing.find((m) => m.ingredient === row.ingredient);
  if (missing) {
    const price = missing.costCents === null ? '' : `, about ${dollars(missing.costCents)}`;
    if (missing.reason === 'not-enough') return `not enough, ${missing.grams} g more${price}`;
    return `${missing.reason === 'past-date' ? 'missing, yours is past its date' : 'missing'}${price}`;
  }
  const sub = match.subs.find((s) => s.from === row.ingredient);
  if (sub) return `swap: ${ingredientName(sub.to)}`;
  return row.optional ? 'optional' : 'in your pantry';
}

export const gramsFor = (row: RecipeIngredient, recipe: Recipe, serves: number): number => scaledGrams(row.grams, serves, recipe.serves);
