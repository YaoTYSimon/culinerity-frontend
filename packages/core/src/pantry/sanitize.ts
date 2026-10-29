import { isIsoDateTime } from '../budget/entries';
import { isIsoDay } from './dates';
import {
  DATE_KINDS,
  DEFAULT_SERVES,
  MAX_GRAMS,
  MAX_SERVES,
  MIN_SERVES,
  NAME_MAX,
  PANTRY_CAP,
  SHOPPING_CAP,
  STAPLES_CAP,
  type DateKind,
  type PantryItem,
  type PantryState,
  type ShoppingEntry,
} from './types';

const ID_MAX = 64;

/** NFKC, control and zero-width characters removed, spaces collapsed, trimmed, at most 40 characters. Always literal text. */
export function cleanName(text: string): string {
  const flat = text.normalize('NFKC').replace(/\s/g, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/ +/g, ' ').trim();
  let out = '';
  for (const ch of flat) {
    if (out.length + ch.length > NAME_MAX) break;
    out += ch;
  }
  return out.trim();
}

export const isGrams = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= MAX_GRAMS;
export const isServes = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= MIN_SERVES && x <= MAX_SERVES;
const isDateKind = (x: unknown): x is DateKind => (DATE_KINDS as readonly unknown[]).includes(x);
const isId = (x: unknown): x is string => typeof x === 'string' && x !== '' && x.length <= ID_MAX;
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

function cleanItem(x: unknown): PantryItem | null {
  if (!isRecord(x) || !isId(x.id) || typeof x.name !== 'string' || !isIsoDateTime(x.addedAt)) return null;
  const name = cleanName(x.name);
  if (!name) return null;
  const out: PantryItem = { id: x.id, name, addedAt: x.addedAt };
  if (isId(x.ingredientId)) out.ingredientId = x.ingredientId;
  if (isGrams(x.grams)) out.grams = x.grams;
  if (isDateKind(x.dateKind) && isIsoDay(x.date)) {
    out.dateKind = x.dateKind;
    out.date = x.date;
  }
  return out;
}

function cleanItems(list: unknown): PantryItem[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: PantryItem[] = [];
  for (const x of list) {
    if (out.length >= PANTRY_CAP) break;
    const item = cleanItem(x);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function cleanStaples(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const x of list) {
    if (out.size >= STAPLES_CAP) break;
    if (isId(x)) out.add(x);
  }
  return [...out];
}

/** A clean PantryState, or undefined when it holds nothing worth storing. Never throws. */
export function sanitizePantry(value: unknown): PantryState | undefined {
  if (!isRecord(value)) return undefined;
  try {
    const state: PantryState = {
      items: cleanItems(value.items),
      staples: cleanStaples(value.staples),
      serves: isServes(value.serves) ? value.serves : DEFAULT_SERVES,
    };
    return state.items.length === 0 && state.staples.length === 0 && state.serves === DEFAULT_SERVES ? undefined : state;
  } catch {
    return undefined;
  }
}

function cleanEntry(x: unknown): ShoppingEntry | null {
  if (!isRecord(x) || !isId(x.id) || typeof x.name !== 'string' || !isIsoDateTime(x.addedAt)) return null;
  const name = cleanName(x.name);
  if (!name) return null;
  const out: ShoppingEntry = { id: x.id, name, addedAt: x.addedAt };
  if (isId(x.ingredientId)) out.ingredientId = x.ingredientId;
  if (isId(x.recipeId)) out.recipeId = x.recipeId;
  if (isGrams(x.grams)) out.grams = x.grams;
  return out;
}

/** Valid shopping entries in stored order (first of a repeated id wins), at most 100; undefined when none. Never throws. */
export function sanitizeShopping(value: unknown): ShoppingEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  try {
    const seen = new Set<string>();
    const kept: ShoppingEntry[] = [];
    for (const x of value) {
      if (kept.length >= SHOPPING_CAP) break;
      const e = cleanEntry(x);
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      kept.push(e);
    }
    return kept.length > 0 ? kept : undefined;
  } catch {
    return undefined;
  }
}
