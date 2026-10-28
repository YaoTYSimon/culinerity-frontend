import { ALLERGEN_IDS, type FoodInfo } from '../../food/types';
import type { FoodItem, Nutrition, PricePoint, SupportPlace, SwapCandidate } from '../../domain/types';

/** The slice of fetch the HTTP sources use; tests inject stubs. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const DEFAULT_BASE_URL = '/api';
const TIMEOUT_MS = 8000;

/** GET and parse JSON. Resolves undefined on a network error, non-200 status or malformed JSON. */
export async function getJson(fetchFn: FetchLike, url: string): Promise<unknown> {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok || res.status !== 200) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

/** Keep the array elements that pass the guard; anything but an array gives []. */
export function listOf<T>(value: unknown, guard: (v: unknown) => v is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (o: Record<string, unknown>, k: string) => typeof o[k] === 'string';
const num = (o: Record<string, unknown>, k: string) => typeof o[k] === 'number';

export const isFoodItem = (v: unknown): v is FoodItem =>
  isObject(v) && str(v, 'id') && str(v, 'name') && str(v, 'category') && Array.isArray(v.keywords);

export const isSwapCandidate = (v: unknown): v is SwapCandidate =>
  isObject(v) && isFoodItem(v.craving) && isFoodItem(v.alternative) && str(v, 'note');

export const isPricePoint = (v: unknown): v is PricePoint =>
  isObject(v) &&
  str(v, 'itemId') &&
  str(v, 'store') &&
  num(v, 'pricePerServe') &&
  str(v, 'unitLabel') &&
  str(v, 'observedAt') &&
  typeof v.isSample === 'boolean';

export const isNutrition = (v: unknown): v is Nutrition =>
  isObject(v) &&
  str(v, 'itemId') &&
  ['energyKj', 'proteinG', 'fibreG', 'sugarG', 'sodiumMg'].every((k) => num(v, k));

export const isSupportPlace = (v: unknown): v is SupportPlace =>
  isObject(v) &&
  str(v, 'id') &&
  str(v, 'name') &&
  str(v, 'kind') &&
  str(v, 'suburb') &&
  str(v, 'notes') &&
  typeof v.isSample === 'boolean';

const TRI = ['yes', 'no', 'unknown'];
const FLAG_KEYS = ['halal', 'kosher', 'vegetarian', 'vegan', 'beef', 'pork', 'alcohol', 'gluten'];

export const isFoodInfo = (v: unknown): v is FoodInfo =>
  isObject(v) &&
  str(v, 'itemId') &&
  Array.isArray(v.traditions) &&
  v.traditions.every((t) => typeof t === 'string') &&
  isObject(v.flags) &&
  FLAG_KEYS.every((k) => TRI.includes((v.flags as Record<string, unknown>)[k] as string)) &&
  Array.isArray(v.flags.allergens) &&
  v.flags.allergens.every((a) => typeof a === 'string' && (ALLERGEN_IDS as readonly string[]).includes(a)) &&
  typeof v.flags.allergensKnown === 'boolean' &&
  typeof v.flags.certifiedMeat === 'boolean';
