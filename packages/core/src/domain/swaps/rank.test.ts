import { describe, expect, it } from 'vitest';
import type { FoodItem, Nutrition, PricePoint, SwapCandidate } from '../types';
import { healthScore } from './health';
import { rankSwaps } from './rank';

const item = (id: string): FoodItem => ({ id, name: id, category: 'x', keywords: [] });
const craving = item('craving');
const cand = (id: string): SwapCandidate => ({ craving, alternative: item(id), note: '' });
const price = (itemId: string, pricePerServe: number): PricePoint => ({
  itemId, store: 'Coles', pricePerServe, unitLabel: '1', observedAt: '2026-10-01', isSample: true,
});
const nut = (itemId: string, o: Partial<Nutrition> = {}): Nutrition => ({
  itemId, energyKj: 1000, proteinG: 5, fibreG: 2, sugarG: 5, sodiumMg: 300, ...o,
});

// cheap = cheapest but unhealthy; healthy = healthiest but dearer; none = no price
const candidates = [cand('cheap'), cand('healthy'), cand('none')];
const prices = {
  craving: [price('craving', 8)],
  cheap: [price('cheap', 0.5), price('cheap', 0.9)],
  healthy: [price('healthy', 5)],
  none: [],
};
const nutrition = {
  cheap: nut('cheap', { sugarG: 40, proteinG: 0, fibreG: 0, sodiumMg: 900 }),
  healthy: nut('healthy', { proteinG: 30, fibreG: 10, sugarG: 1, sodiumMg: 100, energyKj: 800 }),
  none: nut('none'),
};
const base = { candidates, prices, nutrition, budgetPerServe: 3 };
const ids = (r: ReturnType<typeof rankSwaps>) => r.map((x) => x.candidate.alternative.id);

describe('rankSwaps', () => {
  it('low score favours the cheapest swap', () => {
    expect(ids(rankSwaps({ ...base, score: 10 }))[0]).toBe('cheap');
  });
  it('high score favours the healthiest swap', () => {
    expect(ids(rankSwaps({ ...base, score: 90 }))[0]).toBe('healthy');
  });
  it('null score equals 50', () => {
    expect(rankSwaps({ ...base, score: null })).toEqual(rankSwaps({ ...base, score: 50 }));
  });
  it('NaN score equals 50', () => {
    expect(rankSwaps({ ...base, score: NaN })).toEqual(rankSwaps({ ...base, score: 50 }));
  });
  it('falls back to the dearest swap as price reference when the craving is unpriced', () => {
    const noCravingPrice = { ...prices, craving: [] };
    const low = rankSwaps({ ...base, prices: noCravingPrice, score: 0 });
    expect(ids(low)).toEqual(['cheap', 'healthy', 'none']);
    const high = rankSwaps({ ...base, prices: noCravingPrice, score: 100 });
    expect(ids(high)).toEqual(['healthy', 'cheap', 'none']);
  });
  it('null budget gives null withinBudget', () => {
    const r = rankSwaps({ ...base, score: 50, budgetPerServe: null });
    expect(r.every((x) => x.withinBudget === null)).toBe(true);
  });
  it('unpriced swaps have null cost and rank last', () => {
    for (const s of [0, 50, 100]) {
      const r = rankSwaps({ ...base, score: s });
      expect(r[r.length - 1].candidate.alternative.id).toBe('none');
      expect(r[r.length - 1].cost).toBeNull();
      expect(r[r.length - 1].price).toBeNull();
      expect(r[r.length - 1].withinBudget).toBeNull();
    }
  });
  it('uses lowest price as cost and flags over-budget but keeps them', () => {
    const r = rankSwaps({ ...base, score: 50 });
    const byId = Object.fromEntries(r.map((x) => [x.candidate.alternative.id, x]));
    expect(byId.cheap.cost).toBe(0.5);
    expect(byId.cheap.price?.pricePerServe).toBe(0.5);
    expect(byId.cheap.withinBudget).toBe(true);
    expect(byId.healthy.withinBudget).toBe(false);
    expect(r).toHaveLength(3);
  });
  it('returns [] for no candidates', () => {
    expect(rankSwaps({ ...base, candidates: [], score: 50 })).toEqual([]);
  });
});

import { NUTRITION } from '../../sources/mock/data';
const mock = (id: string) => healthScore(NUTRITION.find((n) => n.itemId === id)!);

describe('healthScore on mock nutrition', () => {
  it('orders sparkling water > baked drumsticks > burger', () => {
    expect(mock('sparkling-lemon')).toBeGreaterThan(mock('baked-drumsticks'));
    expect(mock('baked-drumsticks')).toBeGreaterThan(mock('burger'));
  });
  it('soft drink is below sparkling water', () => {
    expect(mock('soft-drink')).toBeLessThan(mock('sparkling-lemon'));
  });
  it('does not flatten soft drink and bubble tea to the same value', () => {
    expect(mock('soft-drink')).not.toBe(mock('bubble-tea'));
    expect(mock('bubble-tea')).toBeGreaterThan(0);
    expect(mock('soft-drink')).toBeGreaterThan(0);
  });
  it('every mock item stays within [0,100]', () => {
    for (const n of NUTRITION) {
      expect(healthScore(n)).toBeGreaterThanOrEqual(0);
      expect(healthScore(n)).toBeLessThanOrEqual(100);
    }
  });
});

describe('healthScore', () => {
  it('stays within [0,100] at extremes', () => {
    const hi = healthScore(nut('a', { proteinG: 500, fibreG: 500, sugarG: 0, sodiumMg: 0, energyKj: 0 }));
    const lo = healthScore(nut('b', { proteinG: 0, fibreG: 0, sugarG: 900, sodiumMg: 99999, energyKj: 99999 }));
    expect(hi).toBeLessThanOrEqual(100);
    expect(lo).toBeGreaterThanOrEqual(0);
  });
  it('scores high-sugar below high-fibre', () => {
    expect(healthScore(nut('s', { sugarG: 60, fibreG: 0 }))).toBeLessThan(
      healthScore(nut('f', { sugarG: 2, fibreG: 9 })),
    );
  });
});
