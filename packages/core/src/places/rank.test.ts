import { describe, expect, it } from 'vitest';
import type { Place, PriceBand } from './types';
import { nudgeFor, priceLabel, rankPlaces, rankSentence, PRICE_LABEL } from './rank';

const origin = { lat: -37.8, lng: 144.9 };
// ~111.2 m per 0.001 degree of latitude
const north = (m: number) => ({ lat: origin.lat + m / 111195, lng: origin.lng });

function place(
  id: string,
  m: number,
  priceBand: PriceBand,
  fresh: boolean,
  name = id,
  priceBasis: Place['priceBasis'] = 'stated',
): Place {
  const { lat, lng } = north(m);
  return {
    id,
    name,
    kind: 'grocer',
    lat,
    lng,
    address: '1 Test St',
    suburb: 'Testville',
    priceBand,
    priceBasis,
    fit: fresh ? ['fresh'] : ['packaged'],
    access: 'open',
    sourceId: 's',
    verification: 'primary',
    checked: '2026-01-01',
  } as Place;
}

const ids = (r: { place: Place }[]) => r.map((x) => x.place.id);

describe('distance bands dominate', () => {
  it('a free place at 3 km never beats a pricier one at 800 m', () => {
    const list = [place('far-free', 3000, 'free', true), place('near-pricey', 800, 'pricier', false)];
    for (const score of [10, 50, 90]) {
      expect(ids(rankPlaces(list, origin, score, 'all'))).toEqual(['near-pricey', 'far-free']);
    }
  });
  it('orders all five bands', () => {
    const list = [
      place('e', 11000, 'free', true),
      place('d', 6000, 'free', true),
      place('c', 3000, 'free', true),
      place('b', 1500, 'free', true),
      place('a', 500, 'free', true),
    ];
    expect(ids(rankPlaces(list, origin, 10, 'all'))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('in-band order per nudge', () => {
  const list = [
    place('mid-fresh-near', 100, 'mid', true),
    place('free-nofresh-far', 900, 'free', false),
    place('budget-fresh-mid', 500, 'budget', true),
    place('free-fresh-far', 800, 'free', true),
  ];
  it('cheapest: price, fresh, distance', () => {
    expect(ids(rankPlaces(list, origin, 10, 'all'))).toEqual([
      'free-fresh-far',
      'free-nofresh-far',
      'budget-fresh-mid',
      'mid-fresh-near',
    ]);
  });
  it('balanced: fresh, distance, price', () => {
    expect(ids(rankPlaces(list, origin, 50, 'all'))).toEqual([
      'mid-fresh-near',
      'budget-fresh-mid',
      'free-fresh-far',
      'free-nofresh-far',
    ]);
  });
  it('healthiest: fresh, price, distance', () => {
    expect(ids(rankPlaces(list, origin, 90, 'all'))).toEqual([
      'free-fresh-far',
      'budget-fresh-mid',
      'mid-fresh-near',
      'free-nofresh-far',
    ]);
  });
  it('undefined score behaves as balanced', () => {
    expect(ids(rankPlaces(list, origin, undefined, 'all'))).toEqual(ids(rankPlaces(list, origin, 50, 'all')));
  });
});

describe('tie-breaks', () => {
  it('exact distance, then name, then id', () => {
    const list = [
      place('3', 300, 'mid', true, 'Zed'),
      place('2', 300, 'mid', true, 'Alpha'),
      place('1', 300, 'mid', true, 'Alpha'),
      place('0', 299.9, 'mid', true, 'Zed'),
    ];
    // distances for 300 m entries are equal (same coordinates)
    expect(ids(rankPlaces(list, origin, 50, 'all'))).toEqual(['0', '1', '2', '3']);
  });
  it('sorts names with en-AU locale compare', () => {
    const list = [place('x', 300, 'mid', true, 'b'), place('y', 300, 'mid', true, 'A')];
    expect(ids(rankPlaces(list, origin, 50, 'all'))).toEqual(['y', 'x']);
  });
});

describe('filters', () => {
  const list = [
    place('free-fresh', 100, 'free', true),
    place('budget', 200, 'budget', false),
    place('mid-fresh', 300, 'mid', true),
    place('pricier', 400, 'pricier', false),
  ];
  it('all', () => expect(rankPlaces(list, origin, 50, 'all')).toHaveLength(4));
  it('fresh', () => expect(ids(rankPlaces(list, origin, 50, 'fresh')).sort()).toEqual(['free-fresh', 'mid-fresh']));
  it('free', () => expect(ids(rankPlaces(list, origin, 50, 'free'))).toEqual(['free-fresh']));
  it('low-cost is free or budget', () =>
    expect(ids(rankPlaces(list, origin, 50, 'low-cost')).sort()).toEqual(['budget', 'free-fresh']));
  it('never claims typical-basis prices as free or low cost', () => {
    const kcnh = place('kcnh', 50, 'free', true, 'kcnh', 'typical');
    const typicalBudget = place('tb', 60, 'budget', false, 'tb', 'typical');
    const all = [kcnh, typicalBudget, ...list];
    expect(ids(rankPlaces(all, origin, 50, 'free'))).toEqual(['free-fresh']);
    expect(ids(rankPlaces(all, origin, 50, 'low-cost')).sort()).toEqual(['budget', 'free-fresh']);
    expect(ids(rankPlaces(all, origin, 50, 'all'))).toContain('kcnh');
  });
  it('returns true distances', () => {
    const r = rankPlaces(list, origin, 50, 'all');
    expect(r[0]!.metres).toBeGreaterThan(95);
    expect(r[0]!.metres).toBeLessThan(105);
  });
});

describe('purity', () => {
  it('does not mutate input and is deterministic', () => {
    const list = [place('b', 900, 'mid', false), place('a', 100, 'free', true)];
    const copy = structuredClone(list);
    const one = rankPlaces(list, origin, 20, 'all');
    const two = rankPlaces(list, origin, 20, 'all');
    expect(list).toEqual(copy);
    expect(one).toEqual(two);
  });
  it('drops places with non-finite distance', () => {
    const bad = { ...place('bad', 100, 'free', true), lat: NaN };
    expect(ids(rankPlaces([bad, place('ok', 100, 'free', true)], origin, 50, 'all'))).toEqual(['ok']);
  });
});

describe('score mapping', () => {
  it.each([
    [undefined, 'balanced', 'Sorted by distance, then fresh produce.'],
    [0, 'cheapest', 'Sorted by distance, then cheapest first.'],
    [39, 'cheapest', 'Sorted by distance, then cheapest first.'],
    [40, 'balanced', 'Sorted by distance, then fresh produce.'],
    [59, 'balanced', 'Sorted by distance, then fresh produce.'],
    [60, 'healthiest', 'Sorted by distance, then fresh produce and price.'],
    [100, 'healthiest', 'Sorted by distance, then fresh produce and price.'],
  ] as const)('%s', (score, nudge, sentence) => {
    expect(nudgeFor(score)).toBe(nudge);
    expect(rankSentence(score)).toBe(sentence);
  });
});

describe('PRICE_LABEL', () => {
  it('names each band', () => {
    expect(PRICE_LABEL).toEqual({ free: 'Free', budget: 'Budget', mid: 'Mid', pricier: 'Pricier' });
  });
});

describe('priceLabel', () => {
  it('uses plain labels when stated', () => {
    expect(priceLabel(place('a', 1, 'free', true))).toBe('Free');
    expect(priceLabel(place('a', 1, 'budget', true))).toBe('Budget');
  });
  it('says Typically when the source does not state the price', () => {
    expect(priceLabel(place('a', 1, 'free', true, 'a', 'typical'))).toBe('Typically free');
    expect(priceLabel(place('a', 1, 'budget', true, 'a', 'typical'))).toBe('Typically budget');
    expect(priceLabel(place('a', 1, 'mid', true, 'a', 'typical'))).toBe('Typically mid');
    expect(priceLabel(place('a', 1, 'pricier', true, 'a', 'typical'))).toBe('Typically pricier');
  });
});
