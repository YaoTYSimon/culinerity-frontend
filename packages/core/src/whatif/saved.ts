import type { Profile } from '../domain/types';
import { cleanText } from '../food/sanitize';
import { LIMITS, validateScenario } from './scenario';
import type { Baseline, Cents, Scenario } from './types';
import { toCents } from './units';

/** A saved change. Holds the inputs only: never results and never the person's baseline numbers. */
export interface SavedWhatIf {
  id: string;
  name: string;
  scenario: Scenario;
  savedAt: string;
}

export const MAX_SAVED_WHATIFS = 10;
export const MAX_WHATIF_NAME = 40;

export type SaveError = 'full' | 'invalid' | 'duplicate-id';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Trimmed name of 1 to 40 characters, or null. A longer name is refused, never cut. */
function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const clean = cleanText(name, MAX_WHATIF_NAME + 1);
  return clean.length >= 1 && clean.length <= MAX_WHATIF_NAME ? clean : null;
}

/** A clean copy of a well-formed item, or null. */
function cleanItem(raw: unknown): SavedWhatIf | null {
  if (!isObj(raw)) return null;
  const { id, savedAt } = raw;
  if (typeof id !== 'string' || id === '' || typeof savedAt !== 'string' || savedAt === '') return null;
  const name = cleanName(raw.name);
  const v = validateScenario(raw.scenario);
  return name !== null && v.ok ? { id, name, scenario: v.scenario, savedAt } : null;
}

/** Add an item. On any error the very same array comes back. The oldest is never dropped to make room. */
export function saveWhatIf(list: SavedWhatIf[] | undefined, item: SavedWhatIf): { list: SavedWhatIf[]; error?: SaveError } {
  const current = list ?? [];
  const clean = cleanItem(item);
  if (!clean) return { list: current, error: 'invalid' };
  if (current.some((x) => x.id === clean.id)) return { list: current, error: 'duplicate-id' };
  if (current.length >= MAX_SAVED_WHATIFS) return { list: current, error: 'full' };
  return { list: [...current, clean] };
}

/** Rename in place; the same array comes back for a bad name or an unknown id. */
export function renameWhatIf(list: SavedWhatIf[], id: string, name: string): SavedWhatIf[] {
  const clean = cleanName(name);
  if (clean === null || !list.some((x) => x.id === id)) return list;
  return list.map((x) => (x.id === id ? { ...x, name: clean } : x));
}

export function removeWhatIf(list: SavedWhatIf[], id: string): { list: SavedWhatIf[]; removed?: SavedWhatIf; index?: number } {
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) return { list };
  return { list: list.filter((_, i) => i !== index), removed: list[index], index };
}

/** Undo for remove: back at its old place (clamped). Refused, same array, if its id is back or the list is full. */
export function restoreWhatIf(list: SavedWhatIf[], item: SavedWhatIf, index: number): SavedWhatIf[] {
  if (list.length >= MAX_SAVED_WHATIFS || list.some((x) => x.id === item.id)) return list;
  const at = Math.max(0, Math.min(list.length, Number.isFinite(index) ? Math.trunc(index) : list.length));
  return [...list.slice(0, at), item, ...list.slice(at)];
}

/** Keep the valid items (first duplicate id wins), at most 10. Never throws. */
export function sanitizeWhatIfs(raw: unknown[]): SavedWhatIf[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SavedWhatIf[] = [];
  for (const r of raw) {
    if (out.length >= MAX_SAVED_WHATIFS) break;
    const item = cleanItem(r);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

const PROFILE_TO_BASELINE = [
  ['incomeWeekly', 'incomeWeekly', LIMITS.income],
  ['housingWeekly', 'housingWeekly', LIMITS.housing],
  ['otherFixedWeekly', 'otherFixedWeekly', LIMITS.otherFixed],
  ['foodBudgetWeekly', 'foodBudgetWeekly', LIMITS.food],
] as const satisfies readonly (readonly [keyof Profile, keyof Baseline, Cents])[];

/** The person's dollars as cents. Absent stays absent; negative, non-finite or over-limit values are ignored. */
export function baselineFromProfile(p: Profile): Baseline {
  const out: Baseline = {};
  for (const [from, to, max] of PROFILE_TO_BASELINE) {
    const dollars = p[from];
    if (typeof dollars !== 'number' || !Number.isFinite(dollars) || dollars < 0) continue;
    const cents = toCents(dollars);
    if (cents <= max) out[to] = cents;
  }
  return out;
}
