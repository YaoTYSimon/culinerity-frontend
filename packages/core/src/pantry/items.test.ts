import { describe, expect, it } from 'vitest';
import { addItem, clearPantry, parseGrams, removeItem, setServes, setStaple, updateItem } from './items';
import { PANTRY_CAP, type PantryState } from './types';

const NOW = new Date(2026, 9, 29, 10, 0, 0);
const empty: PantryState = { items: [], staples: [], serves: 2 };
let n = 0;
const id = () => `id${++n}`;

describe('addItem', () => {
  it('adds a matched item', () => {
    const r = addItem(empty, { ingredientId: 'rice', name: ' Rice ', grams: 500 }, NOW, id);
    expect(r.error).toBeUndefined();
    expect(r.state.items[0]).toMatchObject({ ingredientId: 'rice', name: 'Rice', grams: 500, addedAt: NOW.toISOString() });
    expect(empty.items).toEqual([]);
  });
  it('rejects an empty name', () => {
    expect(addItem(empty, { name: ' ​ ' }, NOW, id)).toEqual({ state: empty, error: 'empty' });
  });
  it('refuses the 201st and leaves state unchanged', () => {
    const full: PantryState = { ...empty, items: Array.from({ length: PANTRY_CAP }, (_, i) => ({ id: `f${i}`, name: `x${i}`, addedAt: NOW.toISOString() })) };
    const r = addItem(full, { name: 'one more' }, NOW, id);
    expect(r.error).toBe('full');
    expect(r.state).toBe(full);
  });
  it.each([0, -1, 1.5, NaN, 50001])('rejects grams %s', (g) => {
    expect(addItem(empty, { name: 'a', grams: g }, NOW, id).error).toBe('bad-grams');
  });
  it('rejects impossible dates and half dates', () => {
    expect(addItem(empty, { name: 'a', dateKind: 'use-by', date: '2026-02-30' }, NOW, id).error).toBe('bad-date');
    expect(addItem(empty, { name: 'a', date: '2026-11-01' }, NOW, id).error).toBe('bad-date');
    expect(addItem(empty, { name: 'a', dateKind: 'use-by' }, NOW, id).error).toBe('bad-date');
  });
  it('rejects dates more than 5 years ahead, accepts a past use-by', () => {
    expect(addItem(empty, { name: 'a', dateKind: 'best-before', date: '2031-10-30' }, NOW, id).error).toBe('bad-date');
    expect(addItem(empty, { name: 'a', dateKind: 'best-before', date: '2031-10-29' }, NOW, id).error).toBeUndefined();
    expect(addItem(empty, { name: 'a', dateKind: 'use-by', date: '2026-10-01' }, NOW, id).error).toBeUndefined();
  });
  it('merges same ingredient when neither has a date, adding grams', () => {
    const a = addItem(empty, { ingredientId: 'rice', name: 'Rice', grams: 100 }, NOW, id).state;
    const b = addItem(a, { ingredientId: 'rice', name: 'Rice', grams: 200 }, NOW, id).state;
    expect(b.items).toHaveLength(1);
    expect(b.items[0].grams).toBe(300);
  });
  it('merged grams cap at 50000 and a blank quantity stays blank ("enough")', () => {
    const a = addItem(empty, { ingredientId: 'rice', name: 'Rice', grams: 40000 }, NOW, id).state;
    expect(addItem(a, { ingredientId: 'rice', name: 'Rice', grams: 40000 }, NOW, id).state.items[0].grams).toBe(50000);
    const b = addItem(empty, { ingredientId: 'egg', name: 'Egg' }, NOW, id).state;
    expect(addItem(b, { ingredientId: 'egg', name: 'Egg', grams: 60 }, NOW, id).state.items[0].grams).toBeUndefined();
  });
  it('does not merge when either has a date', () => {
    const a = addItem(empty, { ingredientId: 'milk', name: 'Milk', dateKind: 'use-by', date: '2026-11-01' }, NOW, id).state;
    const b = addItem(a, { ingredientId: 'milk', name: 'Milk' }, NOW, id).state;
    const c = addItem(b, { ingredientId: 'milk', name: 'Milk', dateKind: 'use-by', date: '2026-11-05' }, NOW, id).state;
    expect(c.items).toHaveLength(3);
  });
  it('de-duplicates free text case-insensitively', () => {
    const a = addItem(empty, { name: 'Dukkah' }, NOW, id).state;
    expect(addItem(a, { name: 'DUKKAH' }, NOW, id).state.items).toHaveLength(1);
  });
  it('merging into a full list is allowed', () => {
    const items = Array.from({ length: PANTRY_CAP }, (_, i) => ({ id: `f${i}`, name: `x${i}`, ingredientId: `i${i}`, addedAt: NOW.toISOString() }));
    const r = addItem({ ...empty, items }, { ingredientId: 'i3', name: 'x3' }, NOW, id);
    expect(r.error).toBeUndefined();
    expect(r.state.items).toHaveLength(PANTRY_CAP);
  });
});

describe('removeItem / clearPantry', () => {
  const s = addItem(addItem(empty, { name: 'a' }, NOW, () => 'A').state, { name: 'b' }, NOW, () => 'B').state;
  it('removes and offers undo with the previous state', () => {
    const r = removeItem(s, 'A');
    expect(r.state.items.map((i) => i.id)).toEqual(['B']);
    expect(r.undo).toBe(s);
  });
  it('an unknown id changes nothing', () => expect(removeItem(s, 'zzz').state.items).toHaveLength(2));
  it('clear empties items and staples, keeps serves, undo restores', () => {
    const full = { ...s, staples: ['salt'], serves: 4 };
    const r = clearPantry(full);
    expect(r.state).toEqual({ items: [], staples: [], serves: 4 });
    expect(r.undo).toBe(full);
  });
});

describe('setStaple / setServes', () => {
  it('toggles staples without duplicates', () => {
    const a = setStaple(empty, 'oil', true);
    expect(setStaple(a, 'oil', true).staples).toEqual(['oil']);
    expect(setStaple(a, 'oil', false).staples).toEqual([]);
  });
  it('caps staples at 40', () => {
    let st = empty;
    for (let i = 0; i < 45; i++) st = setStaple(st, `s${i}`, true);
    expect(st.staples).toHaveLength(40);
  });
  it('clamps serves to integers 1..8 and ignores junk', () => {
    expect(setServes(empty, 5).serves).toBe(5);
    expect(setServes(empty, 0).serves).toBe(1);
    expect(setServes(empty, 99).serves).toBe(8);
    expect(setServes(empty, 2.6).serves).toBe(3);
    expect(setServes({ ...empty, serves: 4 }, NaN).serves).toBe(4);
  });
});

describe('parseGrams', () => {
  it.each([
    ['250', 250],
    ['250g', 250],
    ['1.5kg', 1500],
    [' 2 KG ', 2000],
    ['0.5 kg', 500],
  ])('%s -> %s', (t, g) => expect(parseGrams(t)).toBe(g));
  it.each(['0', '-5', 'NaN', '1e9', '', 'abc', '60000', '51kg', '0.2', 'Infinity', '1,5kg'])('rejects %s', (t) => {
    expect(parseGrams(t)).toBeNull();
  });
});

describe('updateItem', () => {
  const base: PantryState = {
    ...empty,
    items: [{ id: 'a', ingredientId: 'rice', name: 'Rice', grams: 500, dateKind: 'use-by', date: '2026-11-02', addedAt: NOW.toISOString() }],
  };
  it('sets and clears the quantity', () => {
    expect(updateItem(base, 'a', { grams: 1500 }, NOW).state.items[0].grams).toBe(1500);
    expect('grams' in updateItem(base, 'a', { grams: null }, NOW).state.items[0]).toBe(false);
  });
  it('sets and clears the date', () => {
    const set = updateItem(base, 'a', { date: { kind: 'best-before', day: '2026-12-01' } }, NOW).state.items[0];
    expect(set).toMatchObject({ dateKind: 'best-before', date: '2026-12-01' });
    const cleared = updateItem(base, 'a', { date: null }, NOW).state.items[0];
    expect('date' in cleared || 'dateKind' in cleared).toBe(false);
  });
  it('rejects a bad quantity or date and keeps the old state', () => {
    expect(updateItem(base, 'a', { grams: 0 }, NOW)).toEqual({ state: base, error: 'bad-grams' });
    expect(updateItem(base, 'a', { date: { kind: 'use-by', day: '2026-02-30' } }, NOW)).toEqual({ state: base, error: 'bad-date' });
    expect(updateItem(base, 'a', { date: { kind: 'use-by', day: '2040-01-01' } }, NOW).error).toBe('bad-date');
  });
  it('leaves state alone for an unknown id and keeps position', () => {
    expect(updateItem(base, 'zzz', { grams: 5 }, NOW).state).toBe(base);
  });
});
