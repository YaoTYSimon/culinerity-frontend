import { describe, expect, it } from 'vitest';
import { sanitizePantry, sanitizeShopping, cleanName } from './sanitize';

const item = (o: Record<string, unknown> = {}) => ({ id: 'a', name: 'Rice', addedAt: '2026-10-29T01:00:00.000Z', ...o });

describe('cleanName', () => {
  it('trims and keeps case', () => expect(cleanName('  RICE ')).toBe('RICE'));
  it('cuts to 40', () => expect(cleanName('x'.repeat(500))).toHaveLength(40));
  it('keeps markup as literal text', () => expect(cleanName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>'.slice(0, 40)));
  it('removes zero-width and control characters, collapses spaces', () => {
    expect(cleanName('a​b\u0007c  \t d')).toBe('abc d');
  });
  it('does not split an emoji at the limit', () => {
    const s = cleanName('a'.repeat(39) + '🍚');
    expect(s).toBe('a'.repeat(39));
  });
  it('NFKC folds compatibility forms', () => expect(cleanName('ＲＩＣＥ')).toBe('RICE'));
  it('empty is empty', () => expect(cleanName('   ')).toBe(''));
});

describe('sanitizePantry', () => {
  it.each([['str', 'x'], ['array', []], ['null', null], ['number', 3]])('%s is undefined', (_n, v) => {
    expect(sanitizePantry(v)).toBeUndefined();
  });
  it('an empty default state is absent', () => {
    expect(sanitizePantry({ items: [], staples: [], serves: 2 })).toBeUndefined();
  });
  it('caps 10000 items at 200', () => {
    const items = Array.from({ length: 10000 }, (_, i) => item({ id: `i${i}` }));
    expect(sanitizePantry({ items })?.items).toHaveLength(200);
  });
  it('drops NaN, fractional and huge grams but keeps the item', () => {
    const p = sanitizePantry({ items: [item({ id: 'a', grams: NaN }), item({ id: 'b', grams: 1.5 }), item({ id: 'c', grams: 1e9 }), item({ id: 'd', grams: 250 })] });
    expect(p?.items.map((i) => i.grams)).toEqual([undefined, undefined, undefined, 250]);
  });
  it('drops a date without a kind, and a kind without a date', () => {
    const p = sanitizePantry({ items: [item({ id: 'a', date: '2026-11-01' }), item({ id: 'b', dateKind: 'use-by' }), item({ id: 'c', dateKind: 'use-by', date: '2026-11-01' })] });
    expect(p?.items.map((i) => [i.dateKind, i.date])).toEqual([[undefined, undefined], [undefined, undefined], ['use-by', '2026-11-01']]);
  });
  it('drops bad dates and unknown kinds', () => {
    const p = sanitizePantry({ items: [item({ dateKind: 'use-by', date: '2026-02-30' }), item({ id: 'b', dateKind: 'fresh', date: '2026-11-01' })] });
    expect(p?.items.every((i) => i.date === undefined && i.dateKind === undefined)).toBe(true);
  });
  it('keeps the first of duplicate ids', () => {
    const p = sanitizePantry({ items: [item({ name: 'First' }), item({ name: 'Second' })] });
    expect(p?.items.map((i) => i.name)).toEqual(['First']);
  });
  it('drops items with no id, no name or a bad addedAt', () => {
    const p = sanitizePantry({ items: [item({ id: '' }), item({ id: 'x', name: '  ' }), item({ id: 'y', addedAt: 'nope' }), null, 4, item({ id: 'ok' })] });
    expect(p?.items.map((i) => i.id)).toEqual(['ok']);
  });
  it('cleans staples: strings only, unique, capped at 40', () => {
    const staples = ['rice', 'rice', 3, '', ...Array.from({ length: 100 }, (_, i) => `s${i}`)];
    const p = sanitizePantry({ items: [item()], staples });
    expect(p?.staples).toHaveLength(40);
    expect(p?.staples.slice(0, 2)).toEqual(['rice', 's0']);
  });
  it('serves defaults to 2 unless an integer 1..8', () => {
    expect(sanitizePantry({ items: [item()], serves: 99 })?.serves).toBe(2);
    expect(sanitizePantry({ items: [item()], serves: 1.5 })?.serves).toBe(2);
    expect(sanitizePantry({ items: [item()], serves: 4 })?.serves).toBe(4);
  });
  it('a lone non-default serves is kept', () => {
    expect(sanitizePantry({ serves: 3 })).toEqual({ items: [], staples: [], serves: 3 });
  });
  it('cleans the name and keeps ingredientId', () => {
    const p = sanitizePantry({ items: [item({ name: '  Rice​ ', ingredientId: 'rice' })] });
    expect(p?.items[0]).toMatchObject({ name: 'Rice', ingredientId: 'rice' });
  });
});

describe('sanitizeShopping grams', () => {
  const e = (o: Record<string, unknown> = {}) => ({ id: 's1', name: 'Rice', addedAt: '2026-10-29T01:00:00.000Z', ...o });
  it('keeps a valid quantity and drops a bad one', () => {
    expect(sanitizeShopping([e({ grams: 150 })])?.[0].grams).toBe(150);
    expect(sanitizeShopping([e({ grams: -3 })])?.[0]).not.toHaveProperty('grams');
    expect(sanitizeShopping([e({ grams: 1.5 })])?.[0]).not.toHaveProperty('grams');
  });
});

describe('sanitizeShopping', () => {
  const e = (o: Record<string, unknown> = {}) => ({ id: 's1', name: 'Rice', addedAt: '2026-10-29T01:00:00.000Z', ...o });
  it('junk and empty are undefined', () => {
    expect(sanitizeShopping('x')).toBeUndefined();
    expect(sanitizeShopping([])).toBeUndefined();
    expect(sanitizeShopping([null, { id: '' }])).toBeUndefined();
  });
  it('keeps valid entries once per id and caps at 100', () => {
    const list = [e(), e({ name: 'dupe' }), ...Array.from({ length: 300 }, (_, i) => e({ id: `n${i}` }))];
    const out = sanitizeShopping(list);
    expect(out).toHaveLength(100);
    expect(out?.[0].name).toBe('Rice');
  });
  it('keeps recipeId and ingredientId strings', () => {
    expect(sanitizeShopping([e({ recipeId: 'r', ingredientId: 'rice' })])?.[0]).toMatchObject({ recipeId: 'r', ingredientId: 'rice' });
  });
});
