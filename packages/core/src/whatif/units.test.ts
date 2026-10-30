import { describe, expect, it } from 'vitest';
import { deltaBp, formatCents, parsePercentBp, toCents, toWeeklyCents } from './units';

describe('toCents', () => {
  it('rounds dollars to whole cents, half away from zero', () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0)).toBe(0);
  });
  it('never returns NaN', () => {
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
  });
});

describe('toWeeklyCents', () => {
  it('keeps weekly, halves fortnightly, converts monthly by 12/52 (half up)', () => {
    expect(toWeeklyCents({ cents: 100000, per: 'week' })).toBe(100000);
    expect(toWeeklyCents({ cents: 45000, per: 'fortnight' })).toBe(22500);
    expect(toWeeklyCents({ cents: 100000, per: 'month' })).toBe(23077); // 23076.92
    expect(toWeeklyCents({ cents: 4501, per: 'fortnight' })).toBe(2251); // 2250.5 rounds up
  });
});

describe('deltaBp', () => {
  it('rounds half away from zero', () => {
    expect(deltaBp(12345, 1000)).toBe(1235); // 1234.5
    expect(deltaBp(90000, 1000)).toBe(9000);
    expect(deltaBp(0, 10000)).toBe(0);
  });
});

describe('parsePercentBp', () => {
  const max = 10000;
  it('accepts plain and percent text', () => {
    expect(parsePercentBp('10%', { max })).toBe(1000);
    expect(parsePercentBp('10', { max })).toBe(1000);
    expect(parsePercentBp('7.25', { max })).toBe(725);
    expect(parsePercentBp(' 7.5 % ', { max })).toBe(750);
    expect(parsePercentBp('100', { max })).toBe(10000);
  });
  it.each(['', '-5', '1e3', 'Infinity', 'NaN', '7.255', '101', '%', '.', '7.'])('refuses %j', (t) => {
    expect(parsePercentBp(t, { max })).toBeNull();
  });
});

describe('formatCents', () => {
  it('shows whole dollars without cents and others with two decimals', () => {
    expect(formatCents(4200)).toBe('$42');
    expect(formatCents(1250)).toBe('$12.50');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(2000000)).toBe('$20,000');
  });
});
