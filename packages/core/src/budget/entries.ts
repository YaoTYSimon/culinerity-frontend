import { isIsoDate } from '../domain/history';
import type { SpendEntry } from '../domain/types';
import { addLocalDays, weekStartMonday } from './week';

export const SPEND_CATEGORIES = ['groceries', 'takeaway', 'market', 'other'] as const;
export const MAX_SPEND_AMOUNT = 10_000;
export const MAX_SPEND_ENTRIES = 200;
export const MAX_SPEND_NOTE = 40;

const roundCents = (n: number): number => Math.round(n * 100) / 100;

export function isSpendEntry(x: unknown): x is SpendEntry {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    e.id !== '' &&
    typeof e.amount === 'number' &&
    Number.isFinite(e.amount) &&
    e.amount > 0 &&
    e.amount <= MAX_SPEND_AMOUNT &&
    (SPEND_CATEGORIES as readonly unknown[]).includes(e.category) &&
    (e.note === undefined || (typeof e.note === 'string' && e.note.length <= MAX_SPEND_NOTE)) &&
    isIsoDate(e.at)
  );
}

/** A clean copy with only known fields. */
function cleanEntry(e: SpendEntry): SpendEntry {
  const out: SpendEntry = { id: e.id, amount: roundCents(e.amount), category: e.category, at: e.at };
  if (e.note !== undefined) out.note = e.note;
  return out;
}

/** Oldest first by date (stable), then keep the newest MAX_SPEND_ENTRIES. */
export function capNewest(entries: SpendEntry[]): SpendEntry[] {
  return entries
    .map((e, i) => ({ e, i, t: Date.parse(e.at) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.e)
    .slice(-MAX_SPEND_ENTRIES);
}

/** Drop invalid entries and keep the newest MAX_SPEND_ENTRIES (used when loading a stored profile). */
export const sanitizeSpendEntries = (list: unknown[]): SpendEntry[] => capNewest(list.filter(isSpendEntry).map(cleanEntry));

/**
 * Add an entry dated now or earlier, within the current or previous Monday week.
 * Anything invalid leaves the list unchanged (same array).
 */
export function addSpend(entries: SpendEntry[] | undefined, entry: SpendEntry, now: Date): SpendEntry[] {
  const list = entries ?? [];
  if (!isSpendEntry(entry) || list.some((e) => e.id === entry.id)) return list;
  const at = Date.parse(entry.at);
  const earliest = addLocalDays(weekStartMonday(now), -7).getTime();
  if (at > now.getTime() || at < earliest) return list;
  return capNewest([...list, cleanEntry(entry)]);
}

export function removeSpend(entries: SpendEntry[] | undefined, id: string): { entries: SpendEntry[]; removed?: SpendEntry } {
  const list = entries ?? [];
  const removed = list.find((e) => e.id === id);
  return removed ? { entries: list.filter((e) => e.id !== id), removed } : { entries: list };
}

/** Undo a removal. Skips the date-range check, because the entry was valid when it was first added. */
export function restoreSpend(entries: SpendEntry[] | undefined, entry: SpendEntry): SpendEntry[] {
  const list = entries ?? [];
  if (!isSpendEntry(entry) || list.some((e) => e.id === entry.id)) return list;
  return capNewest([...list, cleanEntry(entry)]);
}
