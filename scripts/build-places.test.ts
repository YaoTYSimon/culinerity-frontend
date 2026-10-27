// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPlaces, validatePlaces, DATA_PATH, OUT_PATH } from './build-places.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const errorsFor = (mut: (d: any) => void) => {
  const d = data();
  mut(d);
  return validatePlaces(d).join('\n');
};

describe('build-places', () => {
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildPlaces(data()));
  });
  it('accepts the committed dataset', () => {
    expect(validatePlaces(data())).toEqual([]);
  });
  it('rejects a duplicate place id', () => {
    expect(errorsFor((d) => d.places.push({ ...d.places[0] }))).toMatch(/duplicate place id/i);
  });
  it('rejects an unknown sourceId', () => {
    expect(errorsFor((d) => (d.places[0].sourceId = 'nope'))).toMatch(/nope/);
  });
  it('rejects a non-https source url and a missing licence', () => {
    expect(errorsFor((d) => (d.sources[0].url = 'http://example.com'))).toMatch(/https/);
    expect(errorsFor((d) => (d.sources[0].licence = ''))).toMatch(/licence/);
    expect(errorsFor((d) => delete d.sources[0].licence)).toMatch(/licence/);
  });
  it('rejects checked dates in the future or not YYYY-MM-DD', () => {
    expect(errorsFor((d) => (d.places[0].checked = '2999-01-01'))).toMatch(/checked/);
    expect(errorsFor((d) => (d.places[0].checked = '27/10/2026'))).toMatch(/checked/);
    expect(errorsFor((d) => (d.places[0].checked = '2026-02-31'))).toMatch(/checked/);
  });
  it('rejects coordinates outside Greater Melbourne', () => {
    expect(errorsFor((d) => (d.places[0].lat = -33.9))).toMatch(/lat/);
    expect(errorsFor((d) => (d.places[0].lng = 151.2))).toMatch(/lng/);
    expect(errorsFor((d) => (d.places[0].lat = '-37.8'))).toMatch(/lat/);
  });
  it('rejects bad kind, priceBand, fit and access', () => {
    expect(errorsFor((d) => (d.places[0].kind = 'shop'))).toMatch(/kind/);
    expect(errorsFor((d) => (d.places[0].priceBand = 'cheap'))).toMatch(/priceBand/);
    expect(errorsFor((d) => (d.places[0].fit = ['fresh', 'tasty']))).toMatch(/fit/);
    expect(errorsFor((d) => (d.places[0].fit = 'fresh'))).toMatch(/fit/);
    // An empty list means the source does not say what is sold.
    expect(errorsFor((d) => (d.places[0].fit = []))).toBe('');
    expect(errorsFor((d) => (d.places[0].access = 'vip'))).toMatch(/access/);
    expect(errorsFor((d) => (d.places[0].verification = 'press'))).toMatch(/verification/);
  });
  it('rejects an empty address and an empty hours string', () => {
    expect(errorsFor((d) => (d.places[0].address = ' '))).toMatch(/address/);
    expect(errorsFor((d) => (d.places[0].hours = ''))).toMatch(/hours/);
  });
  it('requires notFound to be a list of non-empty strings', () => {
    expect(errorsFor((d) => (d.notFound = [''])).toString()).toMatch(/notFound/);
  });
  it('throws when building an invalid dataset', () => {
    const d = data();
    d.places[0].sourceId = 'nope';
    expect(() => buildPlaces(d)).toThrow();
  });
});
