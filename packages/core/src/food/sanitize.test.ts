import { describe, expect, it } from 'vitest';
import { cleanText, MAX_DISMISSED, MAX_TAGS, normaliseTradition, sanitizeFoodProfile } from './sanitize';

const empty = { traditions: [], rules: [], allergies: [], occasions: [], dismissed: [] };

describe('constants', () => {
  it('are 12 and 20', () => {
    expect(MAX_TAGS).toBe(12);
    expect(MAX_DISMISSED).toBe(20);
  });
});

describe('cleanText', () => {
  it('trims, collapses whitespace and normalises to NFC', () => {
    expect(cleanText('  a \t\n b  ')).toBe('a b');
    expect(cleanText('é')).toBe('é');
  });
  it('strips control and zero-width characters', () => {
    expect(cleanText('gr​e‍ek\u0000\u0007﻿')).toBe('greek');
    expect(cleanText('‮evil')).toBe('evil');
  });
  it('limits to 40 characters, never splitting an emoji', () => {
    expect(cleanText('x'.repeat(500))).toHaveLength(40);
    const e = cleanText('\u{1F600}'.repeat(100));
    expect(e.length).toBeLessThanOrEqual(40);
    expect(e).not.toMatch(/[\uD800-\uDBFF]$/);
  });
  it('keeps hostile markup as literal text', () => {
    const t = cleanText('<script>alert(1)</script>');
    expect(t.length).toBeLessThanOrEqual(40);
    expect(t).toBe('<script>alert(1)</script>');
  });
});

describe('normaliseTradition', () => {
  it('maps starter ids and labels, case-insensitively and trimmed', () => {
    expect(normaliseTradition('  GREEK ')).toBe('greek');
    expect(normaliseTradition('Greek')).toBe('greek');
    expect(normaliseTradition('Indian, North')).toBe('indian-north');
    expect(normaliseTradition('indian-south')).toBe('indian-south');
  });
  it('keeps the person\'s own text as typed (cleaned)', () => {
    expect(normaliseTradition('  Nonna   Rosa ')).toBe('Nonna Rosa');
    expect(normaliseTradition('x'.repeat(500))).toHaveLength(40);
  });
});

describe('sanitizeFoodProfile', () => {
  it('returns undefined for non-objects and for all-empty input', () => {
    for (const v of ['x', [], null, undefined, 3, true]) expect(sanitizeFoodProfile(v)).toBeUndefined();
    expect(sanitizeFoodProfile(empty)).toBeUndefined();
    expect(sanitizeFoodProfile({})).toBeUndefined();
    expect(sanitizeFoodProfile({ traditions: 'greek', rules: 'halal' })).toBeUndefined();
  });
  it('keeps valid values and strips extra keys', () => {
    const out = sanitizeFoodProfile({
      traditions: ['greek'], rules: ['halal', 'vegan'], allergies: ['peanuts'], occasions: ['ramadan'], dismissed: ['ramadan-2027'], extra: 1, __proto__: { x: 1 },
    });
    expect(out).toEqual({ traditions: ['greek'], rules: ['halal', 'vegan'], allergies: ['peanuts'], occasions: ['ramadan'], dismissed: ['ramadan-2027'] });
  });
  it('filters unknown rules and occasions and dedupes them', () => {
    const out = sanitizeFoodProfile({ rules: ['halal', 'halal', 'bogus', 3, 'yom-kippur'], occasions: ['lent', 'lent', 'nope', 'yom-kippur'] });
    expect(out?.rules).toEqual(['halal']);
    expect(out?.occasions).toEqual(['lent']);
  });
  it('maps starter labels to ids and dedupes case-insensitively', () => {
    const out = sanitizeFoodProfile({ traditions: ['  GREEK ', 'greek', 'Nonna Rosa', 'nonna rosa', '', '   ', 5] });
    expect(out?.traditions).toEqual(['greek', 'Nonna Rosa']);
  });
  it('allergies are cleaned and deduped case-insensitively', () => {
    expect(sanitizeFoodProfile({ allergies: ['Peanuts', 'peanuts ', 'citrus', '​'] })?.allergies).toEqual(['Peanuts', 'citrus']);
  });
  it('caps tags at 12 and dismissed at 20 (keeping the newest dismissals)', () => {
    const many = Array.from({ length: 10_000 }, (_v, i) => `tag ${i}`);
    const out = sanitizeFoodProfile({ traditions: many, allergies: many });
    expect(out?.traditions).toHaveLength(12);
    expect(out?.allergies).toHaveLength(12);
    const dis = Array.from({ length: 30 }, (_v, i) => `occasion-${2000 + i}`);
    const o2 = sanitizeFoodProfile({ dismissed: dis });
    expect(o2?.dismissed).toHaveLength(20);
    expect(o2?.dismissed[19]).toBe('occasion-2029');
  });
  it('dismissed must look like id-year', () => {
    expect(sanitizeFoodProfile({ dismissed: ['ramadan-2027', 'Ramadan-2027', 'x', 'ramadan-27', '<b>-2027', 'ramadan-2027', 7] })?.dismissed).toEqual(['ramadan-2027']);
  });
  it('keeps hostile text literal and short; 500 characters are trimmed to 40', () => {
    const out = sanitizeFoodProfile({ traditions: ['<script>alert(1)</script>', 'y'.repeat(500)] });
    expect(out?.traditions[0]).toBe('<script>alert(1)</script>');
    expect(out?.traditions[1]).toHaveLength(40);
  });
  it('never throws on odd input, including hostile getters', () => {
    const evil = { get traditions(): never { throw new Error('boom'); } };
    expect(() => sanitizeFoodProfile(evil)).not.toThrow();
    expect(sanitizeFoodProfile(evil)).toBeUndefined();
  });
});

describe('text that names an inherited property', () => {
  const hostile = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
  it('is kept as own text in traditions and allergies and never throws', () => {
    const v = sanitizeFoodProfile({ ...empty, traditions: hostile, allergies: hostile, dismissed: hostile, rules: hostile, occasions: hostile });
    expect(v?.traditions).toEqual(hostile);
    expect(v?.allergies).toEqual(hostile);
    expect(v?.rules).toEqual([]);
    expect(v?.occasions).toEqual([]);
    expect(v?.dismissed).toEqual([]);
    expect(() => normaliseTradition('__proto__', [])).not.toThrow();
  });
});
