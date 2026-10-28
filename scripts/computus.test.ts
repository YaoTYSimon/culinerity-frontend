// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { gregorianEaster, orthodoxEaster, computedRange } from './computus.mjs';

// Published Western and Eastern Orthodox Easter dates (Wikipedia "Date of Easter" for 2026-2027; the others
// are the widely printed church-calendar dates).
const WESTERN: Record<number, string> = {
  1818: '1818-03-22', 1943: '1943-04-25', 2008: '2008-03-23', 2016: '2016-03-27', 2017: '2017-04-16', 2018: '2018-04-01',
  2019: '2019-04-21', 2020: '2020-04-12', 2021: '2021-04-04', 2022: '2022-04-17', 2023: '2023-04-09', 2024: '2024-03-31',
  2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28',
};
const ORTHODOX: Record<number, string> = {
  2008: '2008-04-27', 2010: '2010-04-04', 2016: '2016-05-01', 2017: '2017-04-16', 2018: '2018-04-08', 2019: '2019-04-28',
  2020: '2020-04-19', 2021: '2021-05-02', 2022: '2022-04-24', 2023: '2023-04-16', 2024: '2024-05-05', 2025: '2025-04-20',
  2026: '2026-04-12', 2027: '2027-05-02',
};

describe('computus', () => {
  it.each(Object.entries(WESTERN))('Western Easter %s', (y, d) => expect(gregorianEaster(Number(y))).toBe(d));
  it.each(Object.entries(ORTHODOX))('Orthodox Easter %s', (y, d) => expect(orthodoxEaster(Number(y))).toBe(d));
  it('outputs the spec table for 2027 to 2029', () => {
    expect([2027, 2028, 2029].map(gregorianEaster)).toEqual(['2027-03-28', '2028-04-16', '2029-04-01']);
    expect([2027, 2028, 2029].map(orthodoxEaster)).toEqual(['2027-05-02', '2028-04-16', '2029-04-08']);
  });
  it('derives the observance windows', () => {
    expect(computedRange('easter', 2027)).toEqual({ start: '2027-03-26', end: '2027-03-29' });
    expect(computedRange('lent', 2027)).toEqual({ start: '2027-02-10', end: '2027-03-27' });
    expect(computedRange('lent', 2028)).toEqual({ start: '2028-03-01', end: '2028-04-15' });
    expect(computedRange('lent', 2029)).toEqual({ start: '2029-02-14', end: '2029-03-31' });
    expect(computedRange('orthodox-great-lent', 2027)).toEqual({ start: '2027-03-15', end: '2027-05-01' });
    expect(computedRange('orthodox-great-lent', 2028)).toEqual({ start: '2028-02-28', end: '2028-04-15' });
    expect(computedRange('orthodox-great-lent', 2029)).toEqual({ start: '2029-02-19', end: '2029-04-07' });
    expect(computedRange('orthodox-easter', 2029)).toEqual({ start: '2029-04-08', end: '2029-04-08' });
  });
  it('rejects years outside the Julian-to-Gregorian offset it supports', () => {
    expect(() => orthodoxEaster(2150)).toThrow();
  });
});
