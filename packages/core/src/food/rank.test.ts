import { describe, expect, it } from 'vitest';
import type { RankedSwap } from '../domain/swaps/rank';
import { KITCHEN_BOOST, rankForProfile } from './rank';
import type { FoodInfo, FoodProfile, RuleFlags } from './types';

const swap = (id: string, value: number | null): RankedSwap => ({
  candidate: { craving: { id: 'c', name: 'c', category: 'x', keywords: [] }, alternative: { id, name: id, category: 'x', keywords: [] }, note: '' },
  price: null, cost: value === null ? null : 1, health: 50, withinBudget: null, value,
});
const flags = (o: Partial<RuleFlags> = {}): RuleFlags => ({
  halal: 'yes', kosher: 'yes', vegetarian: 'yes', vegan: 'yes', beef: 'no', pork: 'no', alcohol: 'no', gluten: 'no',
  allergens: [], allergensKnown: true, certifiedMeat: false, ...o,
});
const profile = (o: Partial<FoodProfile> = {}): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: [], dismissed: [], ...o });
const make = (m: Record<string, { traditions?: string[]; flags?: Partial<RuleFlags> }>) => (id: string): FoodInfo | undefined =>
  m[id] ? { itemId: id, traditions: m[id].traditions ?? [], flags: flags(m[id].flags) } : undefined;
const ids = (r: { shown: Array<{ swap: RankedSwap }> }) => r.shown.map((s) => s.swap.candidate.alternative.id);

describe('rankForProfile', () => {
  it('KITCHEN_BOOST is 8', () => expect(KITCHEN_BOOST).toBe(8));

  it('a tradition match outranks a higher-value non-match by less than the boost, but not by 15', () => {
    const infoOf = make({ a: { traditions: ['greek'] }, b: {}, c: { traditions: ['greek'] }, d: {} });
    const p = profile({ traditions: ['greek'] });
    const near = rankForProfile([swap('b', 70), swap('a', 63)], infoOf, p);
    expect(ids(near)).toEqual(['a', 'b']);
    expect(near.shown[0].kitchen).toBe(true);
    expect(near.shown[1].kitchen).toBe(false);
    expect(ids(rankForProfile([swap('d', 80), swap('c', 65)], infoOf, p))).toEqual(['d', 'c']);
  });
  it('tradition match is case-insensitive and keeps own text', () => {
    const infoOf = make({ a: { traditions: ['Nonna Rosa'] } });
    expect(rankForProfile([swap('a', 1)], infoOf, profile({ traditions: ['nonna rosa'] })).shown[0].kitchen).toBe(true);
  });
  it('check items sort after every fits item', () => {
    const infoOf = make({ a: { flags: { halal: 'unknown' } }, b: {}, c: {} });
    const r = rankForProfile([swap('a', 99), swap('b', 10), swap('c', 20)], infoOf, profile({ rules: ['halal'] }));
    expect(ids(r)).toEqual(['c', 'b', 'a']);
    expect(r.shown.map((s) => s.fit)).toEqual(['fits', 'fits', 'check']);
  });
  it('drops out items and counts them as hidden', () => {
    const infoOf = make({ a: { flags: { halal: 'no' } }, b: {}, c: { flags: { halal: 'no' } } });
    const r = rankForProfile([swap('a', 90), swap('b', 10), swap('c', 80)], infoOf, profile({ rules: ['halal'] }));
    expect(ids(r)).toEqual(['b']);
    expect(r.hidden).toBe(2);
  });
  it('items with no info are check when a rule is on', () => {
    const r = rankForProfile([swap('zzz', 50)], make({}), profile({ rules: ['vegan'] }));
    expect(r.shown[0].fit).toBe('check');
  });
  it('unpriced swaps stay last within their fit group, ties keep input order', () => {
    const infoOf = make({});
    const r = rankForProfile([swap('u', null), swap('a', 50), swap('b', 50), swap('c', 60)], infoOf, undefined);
    expect(ids(r)).toEqual(['c', 'a', 'b', 'u']);
  });
  it('a boosted unpriced swap does not move ahead of priced ones', () => {
    const infoOf = make({ u: { traditions: ['greek'] } });
    const r = rankForProfile([swap('a', 1), swap('u', null)], infoOf, profile({ traditions: ['greek'] }));
    expect(ids(r)).toEqual(['a', 'u']);
  });
  it('an empty profile or none returns the input order with values unchanged', () => {
    const input = [swap('a', 70), swap('b', 40), swap('c', null)];
    for (const p of [undefined, profile()]) {
      const r = rankForProfile(input, make({}), p);
      expect(r.hidden).toBe(0);
      expect(r.shown.map((s) => s.swap)).toEqual(input);
      expect(r.shown.every((s) => s.fit === 'fits' && !s.kitchen && s.certifiedMeat === null)).toBe(true);
    }
  });
  it('reports the certified-meat note', () => {
    const infoOf = make({ a: { flags: { certifiedMeat: true } } });
    expect(rankForProfile([swap('a', 1)], infoOf, profile({ rules: ['kosher'] })).shown[0].certifiedMeat).toBe('kosher');
  });
  it('text that names an inherited property is unmatched and never throws', () => {
    const hostile = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
    const infoOf = make({ a: { traditions: ['greek'] } });
    const r = rankForProfile([swap('a', 1)], infoOf, profile({ allergies: hostile, traditions: hostile }));
    expect(r.hidden).toBe(0);
    expect(r.shown).toHaveLength(1);
    expect(r.shown[0].kitchen).toBe(false);
  });
});
