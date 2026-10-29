import { describe, expect, it } from 'vitest';
import { TRADEOFF_LABELS, TRADEOFF_TIER } from './categories';
import { addTradeoff, isTradeoffEntry, removeTradeoff, restoreTradeoff, sanitizeTradeoffs, tradeoffLabel, tradeoffWeeks } from './entries';
import { MAX_NOTE, MAX_TRADEOFFS, TRADEOFF_CATEGORIES, TRADEOFF_RETENTION_WEEKS, type TradeoffEntry } from './types';

const NOW = new Date(2026, 9, 29, 12); // Thursday
const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);
const entry = (id: string, at: Date, o: Partial<TradeoffEntry> = {}): TradeoffEntry => ({ id, at: at.toISOString(), category: 'meal-skipped', ...o });

describe('constants and tables', () => {
  it('are 150, 140 and 8 with ten categories, each labelled and tiered', () => {
    expect([MAX_TRADEOFFS, MAX_NOTE, TRADEOFF_RETENTION_WEEKS, TRADEOFF_CATEGORIES.length]).toEqual([150, 140, 8, 10]);
    for (const c of TRADEOFF_CATEGORIES) {
      expect(TRADEOFF_LABELS[c]).toBeTruthy();
      expect(TRADEOFF_TIER[c]).toBeTruthy();
    }
    expect(TRADEOFF_TIER['child-meal']).toBe('food+child');
    expect(TRADEOFF_TIER['health-skipped']).toBe('health');
  });
});

describe('validation', () => {
  it('rejects an unknown category', () => {
    expect(isTradeoffEntry({ ...entry('a', NOW), category: 'robots' })).toBe(false);
    expect(addTradeoff([], { ...entry('a', NOW), category: 'robots' as never }, NOW)).toEqual([]);
  });
  it('drops an entry with unknown category on load but keeps the rest', () => {
    const good = entry('b', NOW);
    expect(sanitizeTradeoffs([{ ...entry('a', NOW), category: 'x' }, good, null, 3, { id: '' }])).toEqual([good]);
  });
  it('first id wins', () => {
    const a = entry('a', NOW);
    expect(sanitizeTradeoffs([a, { ...a, category: 'borrowed' }])).toEqual([a]);
    expect(addTradeoff([a], { ...a, category: 'borrowed' }, NOW)).toEqual([a]);
  });
});

describe('notes', () => {
  it('note is cleaned: trims, NFC, strips zero-width and control chars, collapses spaces', () => {
    const out = addTradeoff([], entry('a', NOW, { note: '  café ​bus\u0007   fare \n ' }), NOW);
    expect(out[0].note).toBe('café bus fare');
  });
  it('a 141 character note is refused by addTradeoff and its note is dropped (entry kept) by sanitizeTradeoffs', () => {
    const long = entry('a', NOW, { note: 'x'.repeat(141) });
    expect(addTradeoff([], long, NOW)).toEqual([]);
    expect(sanitizeTradeoffs([long])).toEqual([entry('a', NOW)]);
    expect(addTradeoff([], entry('b', NOW, { note: 'x'.repeat(140) }), NOW)[0].note).toHaveLength(140);
  });
  it('blank note is omitted', () => {
    expect(addTradeoff([], entry('a', NOW, { note: ' ​ ' }), NOW)[0]).not.toHaveProperty('note');
    expect(sanitizeTradeoffs([entry('a', NOW, { note: '' })])[0]).not.toHaveProperty('note');
  });
  it('emoji and RTL notes pass through unchanged', () => {
    for (const note of ['no treats \u{1F375}', 'مرحبا שלום']) {
      expect(addTradeoff([], entry('a', NOW, { note }), NOW)[0].note).toBe(note);
    }
  });
  it('a non-string note is dropped on load', () => {
    expect(sanitizeTradeoffs([{ ...entry('a', NOW), note: 5 }])).toEqual([entry('a', NOW)]);
  });
});

describe('cap and retention', () => {
  it('caps at 150 keeping newest', () => {
    const many = Array.from({ length: 160 }, (_, i) => entry(`e${i}`, new Date(NOW.getTime() - (160 - i) * 60000)));
    const out = sanitizeTradeoffs(many);
    expect(out).toHaveLength(150);
    expect(out[0].id).toBe('e10');
    expect(out[149].id).toBe('e159');
  });
  it('prunes older than 8 weeks only when now is given', () => {
    const old = entry('old', d(2026, 8, 1, 12));
    const fresh = entry('fresh', d(2026, 10, 20, 12));
    expect(sanitizeTradeoffs([old, fresh]).map((e) => e.id)).toEqual(['old', 'fresh']);
    expect(sanitizeTradeoffs([old, fresh], NOW).map((e) => e.id)).toEqual(['fresh']);
  });
});

describe('add window', () => {
  it('refuses a future entry and one before last Monday', () => {
    expect(addTradeoff([], entry('f', new Date(NOW.getTime() + 60000)), NOW)).toEqual([]);
    expect(addTradeoff([], entry('o', d(2026, 10, 18, 23, 59)), NOW)).toEqual([]);
    expect(addTradeoff([], entry('k', d(2026, 10, 19, 0, 0)), NOW)).toHaveLength(1);
  });
  it('returns the same array on refusal', () => {
    const list = [entry('a', NOW)];
    expect(addTradeoff(list, entry('a', NOW), NOW)).toBe(list);
  });
  it('removeTradeoff returns the removed entry, or the same list when absent', () => {
    const a = entry('a', NOW);
    expect(removeTradeoff([a], 'a')).toEqual({ entries: [], removed: a });
    const list = [a];
    expect(removeTradeoff(list, 'zzz')).toEqual({ entries: list });
  });
  it('restoreTradeoff skips the date check but not validity', () => {
    const old = entry('o', d(2026, 9, 1, 12));
    expect(restoreTradeoff([], old)).toEqual([old]);
    expect(restoreTradeoff([], { ...old, category: 'x' as never })).toEqual([]);
    expect(restoreTradeoff([old], old)).toEqual([old]);
  });
});

describe('week maths', () => {
  it('Sunday 23:59 counts in that week and Monday 00:01 in the next', () => {
    const now = d(2026, 10, 28, 12);
    const sun = entry('s', d(2026, 10, 25, 23, 59));
    const mon = entry('m', d(2026, 10, 26, 0, 1));
    const w = tradeoffWeeks([sun, mon], now);
    expect(w.thisWeek.map((e) => e.id)).toEqual(['m']);
    expect(w.lastWeek.map((e) => e.id)).toEqual(['s']);
  });
  it('a week containing 4 Oct 2026 (DST start) groups all seven days', () => {
    const now = d(2026, 10, 12, 12);
    const days = [28, 29, 30].map((x, i) => entry(`a${i}`, d(2026, 9, x, 12))).concat([1, 2, 3, 4].map((x) => entry(`b${x}`, d(2026, 10, x, 12))));
    const w = tradeoffWeeks(days, now);
    expect(w.earlier).toHaveLength(1);
    expect(w.earlier[0].entries).toHaveLength(7);
    expect(w.earlier[0].start).toEqual(d(2026, 9, 28));
  });
  it('tradeoffWeeks omits empty weeks and orders newest first', () => {
    const a = entry('a', d(2026, 10, 27, 9));
    const b = entry('b', d(2026, 10, 28, 9));
    const c = entry('c', d(2026, 10, 14, 9));
    const e = entry('e', d(2026, 9, 2, 9));
    const f = entry('f', d(2026, 9, 3, 9));
    const w = tradeoffWeeks([a, e, c, f, b], NOW);
    expect(w.thisWeek.map((x) => x.id)).toEqual(['b', 'a']);
    expect(w.lastWeek).toEqual([]);
    expect(w.earlier.map((g) => g.entries.map((x) => x.id))).toEqual([['c'], ['f', 'e']]);
    expect(tradeoffWeeks(undefined, NOW)).toEqual({ thisWeek: [], lastWeek: [], earlier: [] });
  });
});

describe('tradeoffLabel', () => {
  it('for other with and without note', () => {
    expect(tradeoffLabel(entry('a', NOW, { category: 'other', note: 'a haircut' }))).toBe('Something else: a haircut');
    expect(tradeoffLabel(entry('a', NOW, { category: 'other' }))).toBe('Something else');
    expect(tradeoffLabel(entry('a', NOW, { note: 'ignored' }))).toBe('Skipped or shrank a meal myself');
  });
});
