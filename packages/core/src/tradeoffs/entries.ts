import { capNewestByAt, isIsoDateTime } from '../budget/entries';
import { addLocalDays, DAYS_PER_WEEK, isInWeek, weekBounds, weekStartMonday } from '../budget/week';
import { cleanText } from '../food/sanitize';
import { TRADEOFF_LABELS } from './categories';
import { MAX_NOTE, MAX_TRADEOFFS, TRADEOFF_CATEGORIES, TRADEOFF_RETENTION_WEEKS, type TradeoffCategory, type TradeoffEntry } from './types';

const isCategory = (x: unknown): x is TradeoffCategory => (TRADEOFF_CATEGORIES as readonly unknown[]).includes(x);
const shortNote = (x: unknown): x is string => typeof x === 'string' && x.length <= MAX_NOTE;

export function isTradeoffEntry(x: unknown): x is TradeoffEntry {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    e.id !== '' &&
    isIsoDateTime(e.at) &&
    isCategory(e.category) &&
    (e.note === undefined || shortNote(e.note))
  );
}

/** A clean copy with only known fields; a note that is blank once cleaned is omitted. */
function cleanEntry(e: TradeoffEntry): TradeoffEntry {
  const out: TradeoffEntry = { id: e.id, at: e.at, category: e.category };
  const note = e.note === undefined ? '' : cleanText(e.note, MAX_NOTE);
  if (note) out.note = note;
  return out;
}

const cap = (list: TradeoffEntry[]): TradeoffEntry[] => capNewestByAt(list, MAX_TRADEOFFS);

/** Add an entry dated now or earlier, within this or last Monday week. Anything invalid leaves the same array. */
export function addTradeoff(list: TradeoffEntry[] | undefined, entry: TradeoffEntry, now: Date): TradeoffEntry[] {
  const entries = list ?? [];
  if (!isTradeoffEntry(entry) || entries.some((e) => e.id === entry.id)) return entries;
  const at = Date.parse(entry.at);
  const earliest = addLocalDays(weekStartMonday(now), -DAYS_PER_WEEK).getTime();
  if (at > now.getTime() || at < earliest) return entries;
  return cap([...entries, cleanEntry(entry)]);
}

export function removeTradeoff(list: TradeoffEntry[] | undefined, id: string): { entries: TradeoffEntry[]; removed?: TradeoffEntry } {
  const entries = list ?? [];
  const removed = entries.find((e) => e.id === id);
  return removed ? { entries: entries.filter((e) => e.id !== id), removed } : { entries };
}

/** Undo a removal. Skips the date check, because the entry was valid when it was first added. */
export function restoreTradeoff(list: TradeoffEntry[] | undefined, entry: TradeoffEntry): TradeoffEntry[] {
  const entries = list ?? [];
  if (!isTradeoffEntry(entry) || entries.some((e) => e.id === entry.id)) return entries;
  return cap([...entries, cleanEntry(entry)]);
}

/** Drop invalid and repeated-id entries (first wins), keep an entry but drop an over-long note, prune past retention when `now` is given, keep the newest 150. */
export function sanitizeTradeoffs(list: unknown[], now?: Date): TradeoffEntry[] {
  const seen = new Set<string>();
  const oldest = now ? addLocalDays(now, -TRADEOFF_RETENTION_WEEKS * DAYS_PER_WEEK).getTime() : -Infinity;
  const valid = list
    .map(withoutBadNote)
    .filter(isTradeoffEntry)
    .filter((e) => !seen.has(e.id) && !!seen.add(e.id))
    .filter((e) => Date.parse(e.at) >= oldest);
  return cap(valid.map(cleanEntry));
}

function withoutBadNote(x: unknown): unknown {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
  const { note, ...rest } = x as Record<string, unknown>;
  return note === undefined || shortNote(note) ? x : rest;
}

const newestFirst = (a: TradeoffEntry, b: TradeoffEntry): number => Date.parse(b.at) - Date.parse(a.at);

/** This week and last week (Monday to Sunday), then older weeks, all newest first. Empty weeks are omitted. */
export function tradeoffWeeks(
  entries: TradeoffEntry[] | undefined,
  now: Date,
): { thisWeek: TradeoffEntry[]; lastWeek: TradeoffEntry[]; earlier: { start: Date; entries: TradeoffEntry[] }[] } {
  const sorted = [...(entries ?? [])].sort(newestFirst);
  const current = weekBounds(now);
  const previous = weekBounds(addLocalDays(current.start, -DAYS_PER_WEEK));
  const thisWeek = sorted.filter((e) => isInWeek(e.at, current));
  const lastWeek = sorted.filter((e) => isInWeek(e.at, previous));
  const earlier: { start: Date; entries: TradeoffEntry[] }[] = [];
  for (const e of sorted) {
    if (Date.parse(e.at) >= previous.start.getTime()) continue;
    const { start } = weekBounds(new Date(e.at));
    const last = earlier[earlier.length - 1];
    if (last && last.start.getTime() === start.getTime()) last.entries.push(e);
    else earlier.push({ start, entries: [e] });
  }
  return { thisWeek, lastWeek, earlier };
}

/** "Something else: <note>" for `other` with a note, else the category label. */
export function tradeoffLabel(e: TradeoffEntry): string {
  const label = TRADEOFF_LABELS[e.category];
  return e.category === 'other' && e.note ? `${label}: ${e.note}` : label;
}
