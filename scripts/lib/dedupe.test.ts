// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addressKey, dedupe, dedupeDetailed, nameTokens, namesAlike } from './overtureFilter.mjs';

// TEST DATA ONLY: invented places. 0.001 degrees of latitude is about 111 m.
const M = 1 / 111195; // one metre of latitude in degrees
const mk = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id: `ovt-${id}`, name, kind: 'takeaway', lat: -37.8, lng: 144.9, address: '1035 Test Road', postcode: '3029', confidence: 0.9, ...over,
});
const ids = (list: any[]) => list.map((p) => p.id).sort();

describe('nameTokens and namesAlike', () => {
  it('ignores case, punctuation, diacritics, "and" and "&", and a leading "the"', () => {
    expect(nameTokens("The Fish & Chips, McCafé's")).toEqual(['fish', 'chips', 'mccafes']);
    expect(namesAlike(nameTokens('Fish and Chips'), nameTokens('FISH & CHIPS'))).toBe('exact');
    expect(namesAlike(nameTokens("Mc Donald's"), nameTokens('McDonalds'))).toBe('exact');
  });
  it('treats a name that extends the other with up to three trailing words as a variant (a suburb or branch suffix)', () => {
    expect(namesAlike(nameTokens('KFC'), nameTokens('KFC Tarneit North'))).toBe('variant');
    expect(namesAlike(nameTokens('Kebab Club Tarneit'), nameTokens('Kebab Club'))).toBe('variant');
    expect(namesAlike(nameTokens('Kebab Club'), nameTokens('Kebab Club A B C D'))).toBeNull();
  });
  it('does not match different names, a bare kind word, or a prefix inside a word', () => {
    expect(namesAlike(nameTokens('Pizza Hut'), nameTokens("Domino's Pizza"))).toBeNull();
    expect(namesAlike(nameTokens('Thai'), nameTokens('Thai Orchid'))).toBeNull();
    expect(namesAlike(nameTokens('Cafe'), nameTokens('Cafe Roma'))).toBeNull();
    expect(namesAlike(nameTokens('Su'), nameTokens('Su Shi'))).toBeNull();
    expect(namesAlike([], [])).toBeNull();
  });
});

describe('addressKey', () => {
  it('reduces to street number and street with abbreviations expanded, without unit or centre text', () => {
    expect(addressKey('1035 Dohertys Rd')).toBe('1035 dohertys road');
    expect(addressKey('Shop 5, 1035 Dohertys Road')).toBe('1035 dohertys road');
    expect(addressKey('6/1035 Dohertys Rd.')).toBe('1035 dohertys road');
    expect(addressKey('Tarneit Central, 1035 Dohertys Road')).toBe('1035 dohertys road');
    expect(addressKey('Cnr High St & Low Ave')).toBeNull();
    expect(addressKey('')).toBeNull();
  });
});

describe('dedupe', () => {
  it('collapses a suburb variant that shares the address although the two sit 150 m and 800 m away', () => {
    const list = [mk('a', 'KFC Tarneit North', { lat: -37.8 + 150 * M, confidence: 0.9 }), mk('b', 'KFC', { lat: -37.8 + 800 * M, confidence: 0.95 }), mk('c', 'Other Shop', { lat: -37.8 })];
    expect(ids(dedupe(list))).toEqual(['ovt-b', 'ovt-c']);
  });
  it('collapses alike names within 100 m with different addresses, but not the same name 60 m apart at different addresses', () => {
    expect(dedupe([mk('a', 'Kebab Club Tarneit', { address: '1 A St' }), mk('b', 'Kebab Club', { address: '9 B St', lat: -37.8 + 80 * M })])).toHaveLength(1);
    expect(dedupe([mk('a', 'Kebab Club Tarneit', { address: '1 A St' }), mk('b', 'Kebab Club', { address: '9 B St', lat: -37.8 + 120 * M })])).toHaveLength(2);
    expect(dedupe([mk('a', 'Subway', { address: '1 A St' }), mk('b', 'Subway', { address: '9 B St', lat: -37.8 + 60 * M })])).toHaveLength(2);
    expect(dedupe([mk('a', 'Subway', { address: '1 A St' }), mk('b', 'Subway', { address: '9 B St', lat: -37.8 + 40 * M })])).toHaveLength(1);
  });
  it('keeps same-address places 2 km apart, with a different postcode, or with different names', () => {
    expect(dedupe([mk('a', 'KFC'), mk('b', 'KFC Tarneit', { lat: -37.8 + 2000 * M })])).toHaveLength(2);
    expect(dedupe([mk('a', 'KFC'), mk('b', 'KFC Tarneit', { postcode: '3030', lat: -37.8 + 400 * M })])).toHaveLength(2);
    expect(dedupe([mk('a', 'Sushi Train'), mk('b', 'Noodle Box', { lat: -37.8 + 10 * M })])).toHaveLength(2);
  });
  it('keeps the highest confidence, then the lowest id, of the same kind', () => {
    expect(ids(dedupe([mk('a', 'KFC', { confidence: 0.8 }), mk('b', 'KFC', { confidence: 0.9 })]))).toEqual(['ovt-b']);
    expect(ids(dedupe([mk('b', 'KFC'), mk('a', 'KFC')]))).toEqual(['ovt-a']);
  });
  it('when the kinds differ (the #8 case) collapses only at one address or within 50 m, keeping the more specific kind', () => {
    const bakery = mk('a', 'Crumbs', { kind: 'bakery', confidence: 0.75 });
    const cafe = mk('b', 'Crumbs', { kind: 'cafe-restaurant', confidence: 0.99 });
    expect(ids(dedupe([bakery, cafe]))).toEqual(['ovt-a']);
    expect(ids(dedupe([cafe, bakery]))).toEqual(['ovt-a']);
    const take = mk('c', 'Crumbs', { kind: 'takeaway', confidence: 0.99 });
    expect(ids(dedupe([take, cafe]))).toEqual(['ovt-c']);
    // different address and 70 m apart: two different places that share a name
    const far = { address: '77 Other St', lat: -37.8 + 70 * M };
    expect(dedupe([bakery, { ...cafe, ...far }])).toHaveLength(2);
    expect(dedupe([bakery, { ...cafe, ...far, lat: -37.8 + 30 * M }])).toHaveLength(1);
  });
  it('does not merge a variant of another kind unless the address matches', () => {
    const shop = mk('a', 'Preston Market', { kind: 'supermarket', address: '30A The Centreway', lat: -37.8 });
    const inside = mk('b', 'Preston Market Health Foods', { kind: 'greengrocer', address: '237 Earle St', lat: -37.8 + 30 * M });
    expect(dedupe([shop, inside])).toHaveLength(2);
    expect(dedupe([shop, { ...inside, address: '30A The Centreway' }])).toHaveLength(1);
  });
  it('is deterministic whatever the input order, and does not change its input', () => {
    const list = [mk('a', 'KFC Tarneit'), mk('b', 'KFC', { lat: -37.8 + 300 * M }), mk('c', 'KFC', { confidence: 0.9 }), mk('d', 'Pie Face')];
    const copy = JSON.stringify(list);
    expect(ids(dedupe([...list].reverse()))).toEqual(ids(dedupe(list)));
    expect(JSON.stringify(list)).toBe(copy);
  });
  it('reports what each removed record was a duplicate of', () => {
    const r = dedupeDetailed([mk('a', 'KFC Tarneit', { confidence: 0.8 }), mk('b', 'KFC', { confidence: 0.9 })]);
    expect(r.removed).toEqual([{ id: 'ovt-a', of: 'ovt-b', rule: 'same-address' }]);
  });
  it('handles 20,000 places without comparing every pair', () => {
    const list = Array.from({ length: 20000 }, (_, i) => mk(`p${i}`, `Shop ${i}`, { lat: -38 + (i % 200) * 0.005, lng: 144.5 + Math.floor(i / 200) * 0.005, address: `${i} Road` }));
    const t = Date.now();
    expect(dedupe(list)).toHaveLength(20000);
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
