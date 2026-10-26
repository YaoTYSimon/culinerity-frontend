import { describe, expect, it } from 'vitest';
import { formatDollars, shareOfIncome } from './money';

describe('formatDollars', () => {
  it('shows whole dollars plainly and fractions with cents', () => {
    expect(formatDollars(42)).toBe('$42');
    expect(formatDollars(12.5)).toBe('$12.50');
    expect(formatDollars(0)).toBe('$0');
  });
});

describe('shareOfIncome', () => {
  it('is the percentage of income to one decimal, or null without income', () => {
    expect(shareOfIncome(63, 600)).toBe(10.5);
    expect(shareOfIncome(10, 0)).toBeNull();
    expect(shareOfIncome(10, undefined)).toBeNull();
  });
});
