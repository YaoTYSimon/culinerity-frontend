import { describe, expect, it } from 'vitest';
import { MockCatalogue } from '../sources/mock/mockCatalogue';
import { cravingsForTraditions, traditionsWithFoods } from './coverage';

const catalogue = new MockCatalogue();

describe('traditionsWithFoods', () => {
  it('holds the traditions that have a catalogue food, as lower-case ids', () => {
    const have = traditionsWithFoods(catalogue);
    for (const id of ['greek', 'chinese', 'indian-north', 'levantine', 'sri-lankan']) expect(have.has(id)).toBe(true);
    expect(have.has('korean')).toBe(false);
  });
});

describe('cravingsForTraditions', () => {
  it('is empty for no traditions or for ones with no cravings', () => {
    expect(cravingsForTraditions(catalogue, [], 5)).toEqual([]);
    expect(cravingsForTraditions(catalogue, ['korean'], 5)).toEqual([]);
  });

  it('lists tradition cravings that are not among the popular ten, up to the limit', () => {
    const popular = new Set(catalogue.popularCravings().map((c) => c.id));
    const got = cravingsForTraditions(catalogue, ['indian-north', 'italian'], 5);
    expect(got.map((c) => c.id)).toEqual(expect.arrayContaining(['butter-chicken-jar-sauce', 'lasagne-frozen']));
    expect(got.every((c) => !popular.has(c.id))).toBe(true);
    expect(cravingsForTraditions(catalogue, ['indian-north', 'italian'], 1)).toHaveLength(1);
  });
});
