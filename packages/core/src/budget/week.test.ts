import { describe, expect, it } from 'vitest';
import { addLocalDays, startOfLocalDay, weekStartMonday } from './week';

const d = (y: number, m: number, day: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, day, h, min, s);

describe('test environment', () => {
  it('runs in Melbourne time (AEDT in January, AEST in July)', () => {
    expect(d(2026, 1, 15, 12).getTimezoneOffset()).toBe(-660);
    expect(d(2026, 7, 15, 12).getTimezoneOffset()).toBe(-600);
  });
});

describe('weekStartMonday', () => {
  it('Monday 00:00 is its own week start', () => {
    expect(weekStartMonday(d(2026, 10, 26, 0, 0, 0)).getTime()).toBe(d(2026, 10, 26).getTime());
  });
  it('Sunday 23:59 belongs to the week that began the previous Monday', () => {
    expect(weekStartMonday(d(2026, 11, 1, 23, 59, 59)).getTime()).toBe(d(2026, 10, 26).getTime());
  });
  it('Monday 00:00 one second after Sunday 23:59:59 starts a new week', () => {
    expect(weekStartMonday(d(2026, 11, 2, 0, 0, 0)).getTime()).toBe(d(2026, 11, 2).getTime());
  });
  it('does not mutate its input', () => {
    const now = d(2026, 10, 28, 12);
    weekStartMonday(now);
    expect(now.getTime()).toBe(d(2026, 10, 28, 12).getTime());
  });
  it('is local midnight across the 5 April 2026 DST end (25-hour Sunday)', () => {
    expect(weekStartMonday(d(2026, 4, 5, 23, 59)).getTime()).toBe(d(2026, 3, 30).getTime());
    expect(weekStartMonday(d(2026, 4, 6, 0, 0)).getTime()).toBe(d(2026, 4, 6).getTime());
  });
  it('is local midnight across the 4 October 2026 DST start (23-hour Sunday)', () => {
    expect(weekStartMonday(d(2026, 10, 4, 23, 59)).getTime()).toBe(d(2026, 9, 28).getTime());
    expect(weekStartMonday(d(2026, 10, 5, 0, 0)).getTime()).toBe(d(2026, 10, 5).getTime());
  });
});

describe('local day helpers', () => {
  it('addLocalDays keeps local midnight over a DST change', () => {
    expect(addLocalDays(d(2026, 10, 3), 2).getTime()).toBe(d(2026, 10, 5).getTime());
    expect(addLocalDays(d(2026, 4, 4), 2).getTime()).toBe(d(2026, 4, 6).getTime());
    expect(addLocalDays(d(2026, 10, 5), -7).getTime()).toBe(d(2026, 9, 28).getTime());
  });
  it('startOfLocalDay drops the time', () => {
    expect(startOfLocalDay(d(2026, 10, 28, 13, 45, 12)).getTime()).toBe(d(2026, 10, 28).getTime());
  });
});
