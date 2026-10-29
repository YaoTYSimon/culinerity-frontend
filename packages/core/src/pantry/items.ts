import { isIsoDay, withinFiveYears } from './dates';
import { cleanName, isGrams, isServes } from './sanitize';
import { MAX_GRAMS, MAX_SERVES, MIN_SERVES, PANTRY_CAP, STAPLES_CAP, type DateKind, type PantryItem, type PantryState } from './types';

export interface AddItemInput {
  ingredientId?: string;
  name: string;
  grams?: number;
  dateKind?: DateKind;
  date?: string;
}
export type AddItemError = 'full' | 'empty' | 'bad-grams' | 'bad-date';

const GRAMS_TEXT = /^(\d+(?:\.\d+)?)\s*(kg|g)?$/i;

/** "250", "250g", "1.5kg" to whole grams; null when blank, not a plain number, below 1 or above 50000. */
export function parseGrams(text: string): number | null {
  const m = GRAMS_TEXT.exec(text.trim());
  if (!m) return null;
  const grams = Math.round(Number(m[1]) * (m[2]?.toLowerCase() === 'kg' ? 1000 : 1));
  return isGrams(grams) ? grams : null;
}

const sameThing = (a: PantryItem, name: string, ingredientId: string | undefined): boolean =>
  ingredientId !== undefined ? a.ingredientId === ingredientId : a.ingredientId === undefined && a.name.toLowerCase() === name.toLowerCase();

function validDate(input: AddItemInput, now: Date): boolean {
  if (input.dateKind === undefined && input.date === undefined) return true;
  return input.dateKind !== undefined && isIsoDay(input.date) && withinFiveYears(input.date, now);
}

/** Add an item. Same ingredient (or same free text) with no date on either side merges. Invalid input returns the same state. */
export function addItem(state: PantryState, input: AddItemInput, now: Date, newId: () => string): { state: PantryState; error?: AddItemError } {
  const name = cleanName(input.name);
  if (!name) return { state, error: 'empty' };
  if (input.grams !== undefined && !isGrams(input.grams)) return { state, error: 'bad-grams' };
  if (!validDate(input, now)) return { state, error: 'bad-date' };
  const dated = input.date !== undefined;
  const twin = dated ? undefined : state.items.find((i) => i.date === undefined && sameThing(i, name, input.ingredientId));
  if (twin) {
    const grams = twin.grams !== undefined && input.grams !== undefined ? Math.min(MAX_GRAMS, twin.grams + input.grams) : undefined;
    const merged: PantryItem = { ...twin, grams };
    if (grams === undefined) delete merged.grams;
    return { state: { ...state, items: state.items.map((i) => (i === twin ? merged : i)) } };
  }
  if (state.items.length >= PANTRY_CAP) return { state, error: 'full' };
  const item: PantryItem = { id: newId(), name, addedAt: now.toISOString() };
  if (input.ingredientId !== undefined) item.ingredientId = input.ingredientId;
  if (input.grams !== undefined) item.grams = input.grams;
  if (input.dateKind !== undefined && input.date !== undefined) {
    item.dateKind = input.dateKind;
    item.date = input.date;
  }
  return { state: { ...state, items: [...state.items, item] } };
}

/** Remove one item. `undo` is the state before, so position and date come back with it. */
export function removeItem(state: PantryState, id: string): { state: PantryState; undo: PantryState } {
  return { state: { ...state, items: state.items.filter((i) => i.id !== id) }, undo: state };
}

/** Empty the items and the "always have" list; the serves choice stays. */
export function clearPantry(state: PantryState): { state: PantryState; undo: PantryState } {
  return { state: { items: [], staples: [], serves: state.serves }, undo: state };
}

export function setStaple(state: PantryState, ingredientId: string, on: boolean): PantryState {
  const has = state.staples.includes(ingredientId);
  if (on === has || (on && state.staples.length >= STAPLES_CAP)) return state;
  return { ...state, staples: on ? [...state.staples, ingredientId] : state.staples.filter((s) => s !== ingredientId) };
}

/** Serves rounded and clamped to 1..8; a non-number leaves the state alone. */
export function setServes(state: PantryState, n: number): PantryState {
  if (typeof n !== 'number' || !Number.isFinite(n)) return state;
  const serves = Math.min(MAX_SERVES, Math.max(MIN_SERVES, Math.round(n)));
  return isServes(serves) ? { ...state, serves } : state;
}
