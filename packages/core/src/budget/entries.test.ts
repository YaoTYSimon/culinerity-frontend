import { describe, expect, it } from 'vitest';
import type { SpendEntry } from '../domain/types';
import { addSpend, isSpendEntry, MAX_SPEND_ENTRIES, removeSpend, restoreSpend, sanitizeSpendEntries } from './entries';

const d = (y: number, m: number, day: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, day, h, min, s);
const NOW = d(2026, 10, 28, 12); // Wednesday
const mk = (id: string, amount: number, at: Date, extra: Partial<SpendEntry> = {}): SpendEntry => ({
  id,
  amount,
  category: 'groceries',
  at: at.toISOString(),
  ...extra,
});

describe('isSpendEntry', () => {
  const good = mk('a', 5, NOW);
  it('accepts a good entry, with or without a short note', () => {
    expect(isSpendEntry(good)).toBe(true);
    expect(isSpendEntry({ ...good, note: 'x'.repeat(40) })).toBe(true);
  });
  it.each([
    ['null', null],
    ['no id', { ...good, id: '' }],
    ['string amount', { ...good, amount: '5' }],
    ['zero amount', { ...good, amount: 0 }],
    ['negative', { ...good, amount: -1 }],
    ['NaN', { ...good, amount: NaN }],
    ['Infinity', { ...good, amount: Infinity }],
    ['sub-cent amount', { ...good, amount: 0.004 }],
    ['date-only at', { ...good, at: '2026-10-27' }],
    ['numeric-string at', { ...good, at: '5' }],
    ['non-ISO at', { ...good, at: 'Oct 27 2026' }],
    ['impossible date', { ...good, at: '2026-02-31T10:00:00Z' }],
    ['over 10,000', { ...good, amount: 10_000.01 }],
    ['unknown category', { ...good, category: 'rent' }],
    ['note too long', { ...good, note: 'x'.repeat(41) }],
    ['note not a string', { ...good, note: 4 }],
    ['bad date', { ...good, at: 'nope' }],
  ])('rejects %s', (_n, v) => {
    expect(isSpendEntry(v)).toBe(false);
  });
  it('accepts 0.005 (rounds to a cent) and offset date-times', () => {
    expect(isSpendEntry({ ...good, amount: 0.005 })).toBe(true);
    expect(isSpendEntry({ ...good, amount: 10_000.004 })).toBe(true); // rounds to 10,000.00
    expect(isSpendEntry({ ...good, at: '2026-10-27T10:00:00+11:00' })).toBe(true);
    expect(isSpendEntry({ ...good, at: '2026-10-27T10:00:00Z' })).toBe(true);
  });
  it('accepts exactly 10,000', () => {
    expect(isSpendEntry({ ...good, amount: 10_000 })).toBe(true);
  });
});

describe('addSpend', () => {
  it('adds a valid entry and does not mutate the input', () => {
    const before: SpendEntry[] = [];
    const out = addSpend(before, mk('a', 12.5, NOW), NOW);
    expect(out).toHaveLength(1);
    expect(before).toEqual([]);
  });
  it('treats undefined as an empty list', () => {
    expect(addSpend(undefined, mk('a', 3, NOW), NOW)).toHaveLength(1);
  });
  it.each([0, -5, NaN, Infinity, 10_000.01, 0.004])('rejects amount %d', (amount) => {
    const list = [mk('x', 1, NOW)];
    expect(addSpend(list, mk('a', amount, NOW), NOW)).toBe(list);
  });
  it('accepts exactly 10,000', () => {
    expect(addSpend([], mk('a', 10_000, NOW), NOW)).toHaveLength(1);
  });
  it('rejects a future-dated entry but accepts one dated exactly now', () => {
    expect(addSpend([], mk('a', 5, new Date(NOW.getTime() + 1)), NOW)).toEqual([]);
    expect(addSpend([], mk('a', 5, NOW), NOW)).toHaveLength(1);
  });
  it('accepts the previous Monday week from its Monday 00:00 and rejects the second before', () => {
    expect(addSpend([], mk('a', 5, d(2026, 10, 19, 0, 0, 0)), NOW)).toHaveLength(1);
    expect(addSpend([], mk('b', 5, d(2026, 10, 18, 23, 59, 59)), NOW)).toEqual([]);
  });
  it('rejects a malformed entry (bad category, long note, bad date)', () => {
    expect(addSpend([], { ...mk('a', 5, NOW), category: 'rent' as never }, NOW)).toEqual([]);
    expect(addSpend([], mk('a', 5, NOW, { note: 'x'.repeat(41) }), NOW)).toEqual([]);
    expect(addSpend([], { ...mk('a', 5, NOW), at: 'nope' }, NOW)).toEqual([]);
  });
  it('rejects a duplicate id', () => {
    const list = addSpend([], mk('a', 5, NOW), NOW);
    expect(addSpend(list, mk('a', 9, NOW), NOW)).toBe(list);
  });
  it('rounds to cents', () => {
    expect(addSpend([], mk('a', 1.005 + 0.1, NOW), NOW)[0].amount).toBe(1.11);
  });
  it('keeps entries ordered by date, oldest first', () => {
    let list = addSpend([], mk('new', 5, d(2026, 10, 28, 9)), NOW);
    list = addSpend(list, mk('old', 5, d(2026, 10, 27, 9)), NOW);
    expect(list.map((e) => e.id)).toEqual(['old', 'new']);
  });
  it('caps at 200, dropping the oldest by date', () => {
    let list: SpendEntry[] = [];
    for (let i = 0; i < MAX_SPEND_ENTRIES; i++) list = addSpend(list, mk(`e${i}`, 1, new Date(d(2026, 10, 20).getTime() + i * 60_000)), NOW);
    expect(list).toHaveLength(200);
    list = addSpend(list, mk('latest', 1, d(2026, 10, 28, 11)), NOW);
    expect(list).toHaveLength(200);
    expect(list.map((e) => e.id)).not.toContain('e0');
    expect(list[199].id).toBe('latest');
    // a backdated entry older than all 200 is itself the one dropped
    const again = addSpend(list, mk('ancient', 1, d(2026, 10, 19, 0, 0, 1)), NOW);
    expect(again.map((e) => e.id)).not.toContain('ancient');
    expect(again).toHaveLength(200);
  });
});

describe('removeSpend and restoreSpend (undo)', () => {
  const list = [mk('a', 5, d(2026, 10, 27, 9)), mk('b', 7, d(2026, 10, 28, 9)), mk('c', 9, d(2026, 10, 28, 10))];
  it('removes by id and returns the removed entry', () => {
    const r = removeSpend(list, 'b');
    expect(r.entries.map((e) => e.id)).toEqual(['a', 'c']);
    expect(r.removed).toEqual(list[1]);
    expect(list).toHaveLength(3);
  });
  it('an unknown id removes nothing', () => {
    const r = removeSpend(list, 'zzz');
    expect(r.entries).toEqual(list);
    expect(r.removed).toBeUndefined();
  });
  it('removeSpend of undefined is empty', () => {
    expect(removeSpend(undefined, 'a')).toEqual({ entries: [] });
  });
  it('restoreSpend puts the entry back in date order', () => {
    const r = removeSpend(list, 'b');
    expect(restoreSpend(r.entries, r.removed!)).toEqual(list);
  });
  it('restoreSpend works even when the entry is now older than the add window', () => {
    const old = mk('old', 5, d(2026, 9, 1));
    expect(restoreSpend([], old)).toEqual([old]);
  });
  it('restoreSpend rejects a sub-cent entry', () => {
    expect(restoreSpend([], mk('z', 0.004, NOW))).toEqual([]);
  });
  it('restoreSpend ignores an entry already present or invalid', () => {
    expect(restoreSpend(list, list[0])).toEqual(list);
    expect(restoreSpend(list, { ...list[0], id: 'q', amount: -1 })).toEqual(list);
  });
});

describe('sanitizeSpendEntries', () => {
  it('drops sub-cent amounts and date-only or numeric-string dates', () => {
    const ok = mk('a', 5, NOW);
    expect(sanitizeSpendEntries([ok, { ...ok, id: 'b', amount: 0.004 }, { ...ok, id: 'c', at: '5' }, { ...ok, id: 'd', at: '2026-10-27' }])).toEqual([ok]);
  });
  it('keeps the first of duplicate ids', () => {
    const first = mk('a', 5, d(2026, 10, 27));
    const dup = { ...mk('a', 9, d(2026, 10, 28)) };
    expect(sanitizeSpendEntries([first, dup, mk('b', 1, NOW)]).map((e) => e.amount)).toEqual([5, 1]);
  });
});
