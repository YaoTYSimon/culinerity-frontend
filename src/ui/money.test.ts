import { describe, expect, it } from 'vitest';
import { formatDollars } from './money';

describe('formatDollars', () => {
  it('shows whole dollars plainly and fractions with cents', () => {
    expect(formatDollars(42)).toBe('$42');
    expect(formatDollars(12.5)).toBe('$12.50');
    expect(formatDollars(0)).toBe('$0');
  });
});
