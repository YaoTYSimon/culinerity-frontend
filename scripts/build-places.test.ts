// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPlaces, findDuplicatePairs, melbourneToday, validatePlaces, DATA_PATH, OUT_PATH } from './build-places.mjs';

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
  it('rejects a bad priceBasis, an empty note and malformed notices', () => {
    expect(errorsFor((d) => (d.places[0].priceBasis = 'guess'))).toMatch(/priceBasis/);
    expect(errorsFor((d) => delete d.places[0].priceBasis)).toMatch(/priceBasis/);
    expect(errorsFor((d) => (d.places[0].note = ' '))).toMatch(/note/);
    expect(errorsFor((d) => (d.places[0].notices = 'closed'))).toMatch(/notices/);
    expect(errorsFor((d) => (d.places[0].notices = [{ text: '', until: '2026-11-03' }]))).toMatch(/notice/);
    expect(errorsFor((d) => (d.places[0].notices = [{ text: 'Closed', until: '3 Nov' }]))).toMatch(/notice/);
    // A notice may end in the future; that is what makes it a dated notice.
    expect(errorsFor((d) => (d.places[0].notices = [{ text: 'Closed', until: '2999-01-01' }]))).toBe('');
  });
});

describe('endsOn', () => {
  it('accepts a real YYYY-MM-DD date and rejects anything else', () => {
    expect(errorsFor((d) => (d.places[0].endsOn = '2999-01-01'))).toBe('');
    expect(errorsFor((d) => (d.places[0].endsOn = '30 Nov'))).toMatch(/endsOn/);
    expect(errorsFor((d) => (d.places[0].endsOn = '2026-02-31'))).toMatch(/endsOn/);
  });
});

describe('melbourneToday', () => {
  afterEach(() => vi.useRealTimers());
  it('uses the Australia/Melbourne calendar date, not UTC', () => {
    // 15:00 UTC on 27 Oct is 02:00 on 28 Oct in Melbourne (daylight saving).
    expect(melbourneToday(new Date('2026-10-27T15:00:00Z'))).toBe('2026-10-28');
    // 12 Jun 23:00 UTC is 09:00 on 13 Jun in Melbourne (standard time).
    expect(melbourneToday(new Date('2026-06-12T23:00:00Z'))).toBe('2026-06-13');
    expect(melbourneToday(new Date('2026-10-27T03:00:00Z'))).toBe('2026-10-27');
  });
  it('is the default basis for the future-date check', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    expect(errorsFor((d) => (d.places[0].checked = '2026-11-24'))).toBe('');
    expect(errorsFor((d) => (d.places[0].checked = '2026-11-25'))).toMatch(/checked/);
  });
});

describe('duplicate guard', () => {
  const src = (id: string, url: string) => ({ id, publisher: 'P', title: 't', url, licence: 'l', accessed: '2026-10-27' });
  const place = (id: string, name: string, sourceId: string, lat = -37.8, lng = 145) => ({
    id, name, kind: 'food-relief', lat, lng, address: '1 A St', suburb: 'X', priceBand: 'free', priceBasis: 'stated',
    fit: [], access: 'open', verification: 'primary', checked: '2026-10-27', sourceId,
  });
  // 0.0001 degrees of latitude is about 11 m.
  const dataset = (places: any[], distinctPairs?: any[]) => ({
    generatedAt: '2026-10-27',
    sources: [src('s1', 'https://a.example/x'), src('s2', 'https://b.example/y'), src('s3', 'https://a.example/x')],
    places,
    notFound: [],
    ...(distinctPairs ? { distinctPairs } : {}),
  });
  const errs = (d: any) => validatePlaces(d).join('\n');

  it('flags the same operator url within 25 m', () => {
    const d = dataset([place('a', 'Alpha Pantry', 's1'), place('b', 'Totally Different', 's3', -37.8001)]);
    expect(errs(d)).toMatch(/possible duplicate.*a.*b/i);
    expect(findDuplicatePairs(d.places, d.sources).map((x: any) => x.rule)).toEqual(['same-source-url']);
  });
  it('does not flag the same url when the places are further than 25 m apart', () => {
    expect(errs(dataset([place('a', 'Alpha Pantry', 's1'), place('b', 'Other', 's3', -37.8004)]))).toBe('');
  });
  it('flags a similar name within 50 m and not beyond', () => {
    expect(errs(dataset([place('a', 'The Community Grocer, Pakenham', 's1'), place('b', 'Pakenham Community Pantry', 's2', -37.80035)]))).toMatch(/possible duplicate/i);
    expect(errs(dataset([place('a', 'The Community Grocer, Pakenham', 's1'), place('b', 'Pakenham Community Pantry', 's2', -37.8008)]))).toBe('');
  });
  it('does not flag different names, or similar names with different sources far apart', () => {
    expect(errs(dataset([place('a', 'Alpha Pantry', 's1'), place('b', 'Beta Kitchen', 's2', -37.80035)]))).toBe('');
  });
  it('accepts a documented distinct pair and rejects a bad allow-list entry', () => {
    const places = [place('a', 'Alpha Pantry', 's1'), place('b', 'Beta', 's3')];
    const ok = { ids: ['a', 'b'], reason: 'Separate programs in one building', evidence: 'https://a.example/x lists both' };
    expect(errs(dataset(places, [ok]))).toBe('');
    expect(errs(dataset(places, [{ ...ok, reason: ' ' }]))).toMatch(/reason/);
    expect(errs(dataset(places, [{ ...ok, evidence: '' }]))).toMatch(/evidence/);
    expect(errs(dataset(places, [{ ...ok, ids: ['a', 'zzz'] }]))).toMatch(/zzz/);
    expect(errs(dataset(places, [{ ...ok, ids: ['a'] }]))).toMatch(/ids/);
  });
  it('the committed dataset has no unexplained duplicate pairs', () => {
    const d = data();
    expect(validatePlaces(d).filter((e: string) => /duplicate/i.test(e))).toEqual([]);
  });
});
