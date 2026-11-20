// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPlaces, melbourneToday, validatePlaces, DATA_PATH, OUT_PATH } from './build-places.mjs';

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
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    expect(errorsFor((d) => (d.places[0].checked = '2026-11-21'))).toBe('');
    expect(errorsFor((d) => (d.places[0].checked = '2026-11-22'))).toMatch(/checked/);
  });
});
