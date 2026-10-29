import { sanitizeSpendEntries } from '../budget/entries';
import { isScoreEntry, MAX_HISTORY } from '../domain/history';
import type { Aud, Profile } from '../domain/types';
import { sanitizeMeals } from '../food/meals';
import { sanitizeFoodProfile } from '../food/sanitize';
import { sanitizePantry, sanitizeShopping } from '../pantry/sanitize';
import { sanitizeTradeoffs } from '../tradeoffs/entries';
import { isWeekSwap, MAX_WEEK_SWAPS } from '../domain/week';

/** Persistence port. Implementations (browser or native storage, memory) are injected by the app. */
export interface ProfileStore {
  load(): Profile;
  save(p: Profile): void;
  clear(): void;
}

/** Meals per week used to turn a weekly food budget into a per-serve budget. */
const SERVES_PER_WEEK = 21;

const NUMBER_FIELDS = ['foodBudgetWeekly', 'incomeWeekly', 'score'] as const;
const STRING_FIELDS = ['suburb', 'scoreTakenAt'] as const;

/** Keep only known fields of the right type. */
export function sanitizeProfile(value: unknown): Profile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: Profile = {};
  for (const k of NUMBER_FIELDS) {
    const x = v[k];
    if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  }
  for (const k of STRING_FIELDS) {
    const x = v[k];
    if (typeof x === 'string') out[k] = x;
  }
  if (typeof v.welcomeSeen === 'boolean') out.welcomeSeen = v.welcomeSeen;
  if (Array.isArray(v.scoreHistory)) out.scoreHistory = v.scoreHistory.filter(isScoreEntry).slice(-MAX_HISTORY);
  if (Array.isArray(v.weekSwaps)) out.weekSwaps = v.weekSwaps.filter(isWeekSwap).slice(-MAX_WEEK_SWAPS);
  if (Array.isArray(v.spendEntries)) out.spendEntries = sanitizeSpendEntries(v.spendEntries);
  const food = sanitizeFoodProfile(v.foodProfile);
  if (food) out.foodProfile = food;
  if (Array.isArray(v.culturalMeals)) {
    const meals = sanitizeMeals(v.culturalMeals);
    if (meals.length > 0) out.culturalMeals = meals;
  }
  if (Array.isArray(v.tradeoffs)) {
    const tradeoffs = sanitizeTradeoffs(v.tradeoffs);
    if (tradeoffs.length > 0) out.tradeoffs = tradeoffs;
  }
  const pantry = sanitizePantry(v.pantry);
  if (pantry) out.pantry = pantry;
  const shoppingList = sanitizeShopping(v.shoppingList);
  if (shoppingList) out.shoppingList = shoppingList;
  return out;
}

/** Parse a stored JSON string into a Profile. Never throws; {} for empty/corrupt input. */
export function parseProfile(raw: string | null | undefined): Profile {
  if (!raw) return {};
  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Weekly food budget spread over 21 serves; null when not set or not positive. */
export function budgetPerServe(p: Profile): Aud | null {
  const w = p.foodBudgetWeekly;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w / SERVES_PER_WEEK : null;
}
