import { ingredientName } from '../recipes/source';
import type { MissingItem } from './match';
import { SHOPPING_CAP, type ShoppingEntry } from './types';

const TEN_CENTS = 10;

/** Add the missing items. Ingredients already on the list are skipped; the list never passes 100. `undo` is the list before. */
export function addMissingToList(list: ShoppingEntry[], missing: MissingItem[], recipeId: string, now: Date, newId: () => string): { list: ShoppingEntry[]; added: number; undo: ShoppingEntry[] } {
  const seen = new Set(list.flatMap((e) => (e.ingredientId ? [e.ingredientId] : [])));
  const next = [...list];
  for (const m of missing) {
    if (next.length >= SHOPPING_CAP) break;
    if (seen.has(m.ingredient)) continue;
    seen.add(m.ingredient);
    next.push({ id: newId(), ingredientId: m.ingredient, name: ingredientName(m.ingredient), recipeId, grams: m.grams, addedAt: now.toISOString() });
  }
  return { list: next, added: next.length - list.length, undo: list };
}

export function removeEntry(list: ShoppingEntry[], id: string): { list: ShoppingEntry[]; undo: ShoppingEntry[] } {
  return { list: list.filter((e) => e.id !== id), undo: list };
}

export function clearList(list: ShoppingEntry[]): { list: ShoppingEntry[]; undo: ShoppingEntry[] } {
  return { list: [], undo: list };
}

/** Sample total rounded up to 10c, only when every entry has a quantity and a price; otherwise null (never 0). */
export function listTotalCents(list: ShoppingEntry[], prices: Map<string, number>): number | null {
  if (list.length === 0) return null;
  let sum = 0;
  for (const e of list) {
    const perKg = e.ingredientId ? prices.get(e.ingredientId) : undefined;
    if (perKg === undefined || e.grams === undefined) return null;
    sum += (e.grams * Math.round(perKg * 100)) / 1000;
  }
  return Math.ceil(Math.round(sum) / TEN_CENTS) * TEN_CENTS;
}
