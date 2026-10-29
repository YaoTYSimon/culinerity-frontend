import { describe, expect, it } from 'vitest';
import { addMissingToList, clearList, listTotalCents, removeEntry } from './shopping';
import { NOW } from './fixtures.testutil';
import type { MissingItem } from './match';
import type { ShoppingEntry } from './types';

const miss = (ingredient: string, grams = 100): MissingItem => ({ ingredient, grams, reason: 'absent', costCents: null });
const ids = () => { let n = 0; return () => `n${++n}`; };

describe('addMissingToList', () => {
  it('adds missing items with the ingredient name and recipe id', () => {
    const r = addMissingToList([], [miss('rice', 150)], 'rec', NOW, ids());
    expect(r.added).toBe(1);
    expect(r.list[0]).toMatchObject({ id: 'n1', ingredientId: 'rice', recipeId: 'rec', grams: 150, addedAt: NOW.toISOString() });
    expect(r.list[0].name.length).toBeGreaterThan(0);
    expect(r.undo).toEqual([]);
  });
  it('skips duplicates already in the list and within the batch', () => {
    const first = addMissingToList([], [miss('rice')], 'rec', NOW, ids());
    const r = addMissingToList(first.list, [miss('rice'), miss('egg'), miss('egg')], 'rec2', NOW, ids());
    expect(r.added).toBe(1);
    expect(r.list.map((e) => e.ingredientId)).toEqual(['rice', 'egg']);
    expect(r.undo).toBe(first.list);
  });
  it('respects the 100 cap', () => {
    const full: ShoppingEntry[] = Array.from({ length: 99 }, (_, i) => ({ id: `e${i}`, ingredientId: `x${i}`, name: 'x', addedAt: 'a' }));
    const r = addMissingToList(full, [miss('rice'), miss('egg')], 'rec', NOW, ids());
    expect(r.added).toBe(1);
    expect(r.list).toHaveLength(100);
  });
});

describe('removeEntry and clearList', () => {
  const list: ShoppingEntry[] = [{ id: '1', name: 'a', addedAt: 'x' }, { id: '2', name: 'b', addedAt: 'x' }];
  it('remove keeps the rest and undo restores', () => {
    const r = removeEntry(list, '1');
    expect(r.list.map((e) => e.id)).toEqual(['2']);
    expect(r.undo).toBe(list);
    expect(removeEntry(list, 'zz').list).toEqual(list);
  });
  it('clear empties with undo', () => {
    const r = clearList(list);
    expect(r.list).toEqual([]);
    expect(r.undo).toBe(list);
  });
});

describe('listTotalCents', () => {
  const prices = new Map([['a', 10], ['b', 7.3]]);
  const e = (ingredientId: string | undefined, grams?: number): ShoppingEntry => ({ id: ingredientId ?? 'f', ingredientId, name: 'n', grams, addedAt: 'x' });
  it('sums quantity times price, rounded up to 10c', () => {
    // 100g*10 = 100c; 100g*7.3 = 73c; 173 -> 180
    expect(listTotalCents([e('a', 100), e('b', 100)], prices)).toBe(180);
  });
  it('null when any entry is unpriced, has no quantity, is free text, or the list is empty', () => {
    expect(listTotalCents([e('a', 100), e('zz', 100)], prices)).toBeNull();
    expect(listTotalCents([e('a')], prices)).toBeNull();
    expect(listTotalCents([e(undefined, 100)], prices)).toBeNull();
    expect(listTotalCents([], prices)).toBeNull();
  });
});
