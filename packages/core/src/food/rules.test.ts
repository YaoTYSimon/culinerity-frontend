import { describe, expect, it } from 'vitest';
import { certifiedMeatNote, fitsAllergies, fitsProfile, fitsRules } from './rules';
import type { DietRule, FoodInfo, FoodProfile, RuleFlags, TriState } from './types';

const flags = (o: Partial<RuleFlags> = {}): RuleFlags => ({
  halal: 'yes', kosher: 'yes', vegetarian: 'yes', vegan: 'yes', beef: 'no', pork: 'no', alcohol: 'no', gluten: 'no',
  allergens: [], allergensKnown: true, certifiedMeat: false, ...o,
});
const info = (o: Partial<RuleFlags> = {}): FoodInfo => ({ itemId: 'x', traditions: [], flags: flags(o) });
const profile = (o: Partial<FoodProfile> = {}): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: [], dismissed: [], ...o });

const TABLE: Array<[DietRule, keyof RuleFlags, TriState, TriState]> = [
  ['halal', 'halal', 'yes', 'no'],
  ['kosher', 'kosher', 'yes', 'no'],
  ['vegetarian', 'vegetarian', 'yes', 'no'],
  ['vegan', 'vegan', 'yes', 'no'],
  ['noBeef', 'beef', 'no', 'yes'],
  ['noPork', 'pork', 'no', 'yes'],
  ['noAlcohol', 'alcohol', 'no', 'yes'],
  ['glutenFree', 'gluten', 'no', 'yes'],
];

describe('fitsRules', () => {
  it('no info is check when a rule is on, fits when none', () => {
    expect(fitsRules(undefined, ['halal'])).toBe('check');
    expect(fitsRules(undefined, [])).toBe('fits');
  });
  it.each(TABLE)('%s: met, excluded and unknown', (rule, flag, met, excl) => {
    expect(fitsRules(info({ [flag]: met }), [rule])).toBe('fits');
    expect(fitsRules(info({ [flag]: excl }), [rule])).toBe('out');
    expect(fitsRules(info({ [flag]: 'unknown' }), [rule])).toBe('check');
  });
  it('unknown never passes, even among passing flags', () => {
    expect(fitsRules(info({ halal: 'unknown' }), ['halal', 'vegan'])).toBe('check');
  });
  it('a single no beats an unknown', () => {
    expect(fitsRules(info({ halal: 'no', kosher: 'unknown' }), ['halal', 'kosher'])).toBe('out');
    expect(fitsRules(info({ kosher: 'unknown', halal: 'no' }), ['kosher', 'halal'])).toBe('out');
  });
  it('rules that are off are ignored', () => {
    expect(fitsRules(info({ halal: 'no' }), ['vegan'])).toBe('fits');
  });
});

describe('fitsAllergies', () => {
  it('out when an avoided allergen is present', () => {
    expect(fitsAllergies(info({ allergens: ['peanut'] }), ['peanut'], [])).toBe('out');
  });
  it('out beats check when the list is incomplete but already shows the allergen', () => {
    expect(fitsAllergies(info({ allergens: ['peanut'], allergensKnown: false }), ['peanut'], ['citrus'])).toBe('out');
  });
  it('check when allergens are not fully known', () => {
    expect(fitsAllergies(info({ allergensKnown: false }), ['peanut'], [])).toBe('check');
  });
  it('check when no info record', () => {
    expect(fitsAllergies(undefined, ['peanut'], [])).toBe('check');
  });
  it('an unmatched word makes every item check', () => {
    expect(fitsAllergies(info(), [], ['citrus'])).toBe('check');
    expect(fitsAllergies(info({ allergens: ['milk'] }), ['peanut'], ['citrus'])).toBe('check');
  });
  it('fits when known and absent; no allergies always fits', () => {
    expect(fitsAllergies(info({ allergens: ['milk'] }), ['peanut'], [])).toBe('fits');
    expect(fitsAllergies(undefined, [], [])).toBe('fits');
    expect(fitsAllergies(info({ allergensKnown: false }), [], [])).toBe('fits');
  });
});

describe('fitsProfile', () => {
  it('no profile or nothing chosen fits, even without info', () => {
    expect(fitsProfile(undefined, undefined)).toBe('fits');
    expect(fitsProfile(undefined, profile({ traditions: ['greek'], occasions: ['ramadan'] }))).toBe('fits');
  });
  it('combines: out beats check beats fits', () => {
    const p = profile({ rules: ['halal'], allergies: ['peanuts'] });
    expect(fitsProfile(info(), p)).toBe('fits');
    expect(fitsProfile(info({ halal: 'unknown' }), p)).toBe('check');
    expect(fitsProfile(info({ allergensKnown: false }), p)).toBe('check');
    expect(fitsProfile(info({ halal: 'unknown', allergens: ['peanut'] }), p)).toBe('out');
    expect(fitsProfile(info({ halal: 'no' }), p)).toBe('out');
  });
  it('an unmappable allergy word makes everything check', () => {
    expect(fitsProfile(info(), profile({ allergies: ['citrus'] }))).toBe('check');
  });
  it('no info with any rule or allergy is check', () => {
    expect(fitsProfile(undefined, profile({ rules: ['vegan'] }))).toBe('check');
    expect(fitsProfile(undefined, profile({ allergies: ['milk'] }))).toBe('check');
  });
});

describe('certifiedMeatNote', () => {
  it('names halal or kosher only when the dish uses certified meat and the rule is on', () => {
    expect(certifiedMeatNote(info({ certifiedMeat: true }), ['halal'])).toBe('halal');
    expect(certifiedMeatNote(info({ certifiedMeat: true }), ['kosher'])).toBe('kosher');
    expect(certifiedMeatNote(info({ certifiedMeat: true }), ['vegan'])).toBeNull();
    expect(certifiedMeatNote(info({ certifiedMeat: false }), ['halal'])).toBeNull();
    expect(certifiedMeatNote(undefined, ['halal'])).toBeNull();
  });
  it('halal wins when both are on', () => {
    expect(certifiedMeatNote(info({ certifiedMeat: true }), ['kosher', 'halal'])).toBe('halal');
  });
});
