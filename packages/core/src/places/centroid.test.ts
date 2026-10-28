import { describe, expect, it } from 'vitest';
import { normaliseName, suburbCentroid, type CentroidTable } from './centroid';
import { centroidTable } from './generated/centroids.generated';

const table: CentroidTable = {
  suburbs: [
    { name: 'Footscray', lat: -37.798, lng: 144.897 },
    { name: 'Fitzroy', lat: -37.801, lng: 144.979 },
    { name: 'Fitzroy North', lat: -37.783, lng: 144.979 },
    { name: 'Richmond', lat: -37.82, lng: 145.002 },
  ],
  postcodes: [{ code: '3011', lat: -37.799, lng: 144.896, label: 'Footscray' }],
  source: { publisher: 'p', title: 't', url: 'https://example.com', licence: 'CC BY 4.0', accessed: '2026-10-27' },
};

describe('normaliseName', () => {
  it('lowercases, strips diacritics and punctuation, drops vic, collapses spaces', () => {
    expect(normaliseName('  FOOTSCRAY, VIC ')).toBe('footscray');
    expect(normaliseName('Fîtzroy  North')).toBe('fitzroy north');
    expect(normaliseName('Richmond Victoria')).toBe('richmond');
  });
});

describe('suburbCentroid with real data and abbreviations', () => {
  it.each([['Mt Waverley', 'Mount Waverley'], ['Mt. Waverley', 'Mount Waverley'], ['Sth Yarra', 'South Yarra'], ['Sth. Yarra', 'South Yarra'], ['Nth Melbourne', 'North Melbourne'], ['Nth. Melbourne', 'North Melbourne'], ['St Kilda', 'St Kilda']])('%s finds %s', (t, label) => {
    expect(suburbCentroid(t, centroidTable)).toMatchObject({ kind: 'match', label });
  });
});

describe('suburbCentroid', () => {
  it.each(['Footscray', '  FOOTSCRAY, VIC ', 'footscray vic', 'Footscray 3011', '3011'])('matches %j', (t) => {
    const r = suburbCentroid(t, table);
    expect(r).toMatchObject({ kind: 'match', label: 'Footscray' });
  });
  it('exact beats prefix', () => {
    expect(suburbCentroid('fitzroy', table)).toMatchObject({ kind: 'match', label: 'Fitzroy' });
  });
  it('matches through diacritics', () => {
    expect(suburbCentroid('Fîtzroy', table)).toMatchObject({ kind: 'match', label: 'Fitzroy' });
  });
  it('a single prefix match is a match', () => {
    expect(suburbCentroid('rich', table)).toMatchObject({ kind: 'match', label: 'Richmond' });
  });
  it('ambiguous prefix suggests', () => {
    expect(suburbCentroid('fitz', table)).toEqual({ kind: 'suggest', options: ['Fitzroy', 'Fitzroy North'] });
  });
  it.each(['Melborne', '', '   ', '🍕', '99999', '3999'])('returns none for %j', (t) => {
    expect(suburbCentroid(t, table)).toEqual({ kind: 'none' });
  });
  it('never throws on odd input', () => {
    for (const t of ['\u0000', '(((', 'a'.repeat(10000), '3011 3011'] as string[]) expect(() => suburbCentroid(t, table)).not.toThrow();
  });
  it('caps suggestions at five', () => {
    const many: CentroidTable = { ...table, suburbs: Array.from({ length: 9 }, (_, i) => ({ name: `Bay ${i}`, lat: -37.8, lng: 145 })) };
    const r = suburbCentroid('bay', many);
    expect(r.kind === 'suggest' && r.options.length).toBe(5);
  });
});

describe('committed table', () => {
  it('has known suburbs and every row inside the Melbourne box', () => {
    const names = centroidTable.suburbs.map((s) => s.name);
    for (const n of ['Footscray', 'Carlton', 'Clayton']) expect(names).toContain(n);
    for (const r of [...centroidTable.suburbs, ...centroidTable.postcodes]) {
      expect(r.lat).toBeGreaterThanOrEqual(-38.6);
      expect(r.lat).toBeLessThanOrEqual(-37.4);
      expect(r.lng).toBeGreaterThanOrEqual(144.3);
      expect(r.lng).toBeLessThanOrEqual(145.8);
    }
  });
  it('resolves a real suburb and postcode', () => {
    expect(suburbCentroid('Footscray')).toMatchObject({ kind: 'match' });
    expect(suburbCentroid('3000')).toMatchObject({ kind: 'match' });
  });
});

describe('typed text that names an inherited property', () => {
  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])('%s is just an unmatched suburb', (word) => {
    expect(() => suburbCentroid(word, { suburbs: [], postcodes: [] } as any)).not.toThrow();
    expect(suburbCentroid(`mt ${word}`, { suburbs: [], postcodes: [] } as any).kind).not.toBe('match');
  });
});
