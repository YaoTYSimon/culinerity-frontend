import { describe, expect, it } from 'vitest';
import { addMeal, culturalWeek, isCulturalMeal, MAX_MEALS, MEAL_RETENTION_WEEKS, removeMeal, restoreMeal, sanitizeMeals } from './meals';
import type { CulturalMeal } from './types';

const d = (y: number, m: number, day: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, day, h, min, s);
const meal = (id: string, at: Date, o: Partial<CulturalMeal> = {}): CulturalMeal => ({ id, at: at.toISOString(), tradition: 'greek', ...o });
const NOW = d(2026, 10, 28, 12); // Wednesday

describe('constants', () => {
  it('are 200 and 8', () => {
    expect(MAX_MEALS).toBe(200);
    expect(MEAL_RETENTION_WEEKS).toBe(8);
  });
});

describe('isCulturalMeal', () => {
  const ok = meal('a', NOW);
  it('accepts valid meals with optional dish and with', () => {
    expect(isCulturalMeal(ok)).toBe(true);
    expect(isCulturalMeal({ ...ok, dish: 'moussaka', with: 'family' })).toBe(true);
  });
  it('rejects bad shapes', () => {
    for (const bad of [null, 'x', [], 3, { ...ok, id: '' }, { ...ok, id: 4 }, { ...ok, at: 'nope' }, { ...ok, at: '2026-02-30T00:00:00Z' },
      { ...ok, tradition: '' }, { ...ok, tradition: 'x'.repeat(41) }, { ...ok, dish: 'x'.repeat(41) }, { ...ok, dish: 3 },
      { ...ok, with: 'robots' }]) expect(isCulturalMeal(bad)).toBe(false);
  });
});

describe('addMeal', () => {
  it('accepts now, yesterday and Monday 00:00 of last week', () => {
    for (const at of [NOW, d(2026, 10, 27, 9), d(2026, 10, 19, 0, 0)]) {
      const out = addMeal(undefined, meal('a', at), NOW);
      expect(out).toHaveLength(1);
    }
  });
  it('rejects tomorrow and Sunday 23:59 two weeks back (same array)', () => {
    const list = [meal('x', NOW)];
    expect(addMeal(list, meal('a', d(2026, 10, 29, 8)), NOW)).toBe(list);
    expect(addMeal(list, meal('b', d(2026, 10, 18, 23, 59)), NOW)).toBe(list);
  });
  it('rejects an existing id and invalid meals (same array)', () => {
    const list = [meal('a', NOW)];
    expect(addMeal(list, meal('a', d(2026, 10, 27)), NOW)).toBe(list);
    expect(addMeal(list, { ...meal('b', NOW), tradition: '' }, NOW)).toBe(list);
  });
  it('returns a copy with only known fields', () => {
    const out = addMeal([], { ...meal('a', NOW), dish: 'soup', secret: 1 } as CulturalMeal, NOW);
    expect(out[0]).toEqual({ ...meal('a', NOW), dish: 'soup' });
  });
  it('keeps the newest 200', () => {
    const many = Array.from({ length: MAX_MEALS }, (_v, i) => meal(`m${i}`, new Date(d(2026, 10, 20).getTime() + i * 60_000)));
    const out = addMeal(many, meal('new', NOW), NOW);
    expect(out).toHaveLength(MAX_MEALS);
    expect(out.some((m) => m.id === 'new')).toBe(true);
    expect(out.some((m) => m.id === 'm0')).toBe(false);
  });
});

describe('removeMeal and restoreMeal', () => {
  it('round-trip', () => {
    const a = meal('a', NOW);
    const b = meal('b', d(2026, 10, 27));
    const r = removeMeal([a, b], 'a');
    expect(r.removed).toEqual(a);
    expect(r.meals).toEqual([b]);
    expect(restoreMeal(r.meals, r.removed!).map((m) => m.id).sort()).toEqual(['a', 'b']);
  });
  it('unknown id removes nothing; undefined list is fine', () => {
    expect(removeMeal(undefined, 'z')).toEqual({ meals: [] });
    const list = [meal('a', NOW)];
    expect(removeMeal(list, 'z')).toEqual({ meals: list });
  });
  it('restore works after the week rolled over and skips duplicates', () => {
    const old = meal('o', d(2026, 10, 1));
    expect(restoreMeal([], old)).toEqual([old]);
    const list = [old];
    expect(restoreMeal(list, old)).toBe(list);
    expect(restoreMeal(list, { id: '' } as CulturalMeal)).toBe(list);
  });
});

describe('sanitizeMeals', () => {
  it('drops invalid entries and repeated ids (first wins)', () => {
    const a = meal('a', NOW);
    expect(sanitizeMeals([null, 'x', { id: 1 }, a, { ...a, tradition: 'other' }])).toEqual([a]);
  });
  it('caps at 200 keeping the newest', () => {
    const many = Array.from({ length: 210 }, (_v, i) => meal(`m${i}`, new Date(d(2026, 10, 1).getTime() + i * 60_000)));
    const out = sanitizeMeals(many);
    expect(out).toHaveLength(200);
    expect(out[out.length - 1].id).toBe('m209');
  });
  it('prunes entries older than 8 weeks only when now is given', () => {
    const old = meal('old', d(2026, 8, 1));
    const recent = meal('recent', d(2026, 10, 1));
    expect(sanitizeMeals([old, recent])).toHaveLength(2);
    expect(sanitizeMeals([old, recent], NOW).map((m) => m.id)).toEqual(['recent']);
  });
  it('handles a huge hostile array without throwing', () => {
    expect(() => sanitizeMeals(Array.from({ length: 10_000 }, () => ({ id: 'a' })))).not.toThrow();
  });
});

describe('culturalWeek', () => {
  it('is empty-safe', () => {
    const w = culturalWeek(undefined, NOW);
    expect(w).toEqual({ days: [false, false, false, false, false, false, false], todayIndex: 2, count: 0, thisWeek: [], lastWeek: [] });
  });
  it('puts Sunday 23:59 and Monday 00:00 in different weeks', () => {
    const sun = meal('sun', d(2026, 10, 25, 23, 59));
    const mon = meal('mon', d(2026, 10, 26, 0, 0));
    const w = culturalWeek([sun, mon], NOW);
    expect(w.thisWeek.map((m) => m.id)).toEqual(['mon']);
    expect(w.lastWeek.map((m) => m.id)).toEqual(['sun']);
    expect(w.days).toEqual([true, false, false, false, false, false, false]);
    expect(w.count).toBe(1);
  });
  it('lists newest first and marks days', () => {
    const a = meal('a', d(2026, 10, 26, 8));
    const b = meal('b', d(2026, 10, 28, 8));
    const c = meal('c', d(2026, 10, 28, 20));
    const w = culturalWeek([a, b, c], d(2026, 10, 28, 22));
    expect(w.thisWeek.map((m) => m.id)).toEqual(['c', 'b', 'a']);
    expect(w.days).toEqual([true, false, true, false, false, false, false]);
    expect(w.count).toBe(3);
  });
  it('ignores meals older than last week and future weeks', () => {
    const w = culturalWeek([meal('old', d(2026, 10, 10)), meal('future', d(2026, 11, 3))], NOW);
    expect(w.count).toBe(0);
    expect(w.lastWeek).toEqual([]);
  });
  it.each([
    ['first Sunday of April 2026 (25-hour day)', d(2026, 4, 5, 23, 30), d(2026, 4, 6, 0, 10), d(2026, 4, 5, 12)],
    ['first Sunday of October 2026 (23-hour day)', d(2026, 10, 4, 23, 30), d(2026, 10, 5, 0, 10), d(2026, 10, 4, 12)],
  ])('%s still has seven slots and the Sunday meal lands in days[6]', (_n, sunday, nextMonday, now) => {
    const w = culturalWeek([meal('s', sunday), meal('m', nextMonday)], now);
    expect(w.days).toHaveLength(7);
    expect(w.days[6]).toBe(true);
    expect(w.days.filter(Boolean)).toHaveLength(1);
    expect(w.thisWeek.map((m) => m.id)).toEqual(['s']);
    const next = culturalWeek([meal('s', sunday), meal('m', nextMonday)], nextMonday);
    expect(next.days).toHaveLength(7);
    expect(next.days[0]).toBe(true);
    expect(next.lastWeek.map((m) => m.id)).toEqual(['s']);
  });
});
