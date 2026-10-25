import { describe, expect, it } from 'vitest';
import { savingVsCraving } from './savings';

describe('savingVsCraving', () => {
  it('returns the positive difference rounded to cents', () => {
    expect(savingVsCraving(12.5, 4.2)).toBe(8.3);
    expect(savingVsCraving(0.3, 0.1)).toBe(0.2);
  });
  it('is null for zero, negative or sub-cent savings', () => {
    expect(savingVsCraving(5, 5)).toBeNull();
    expect(savingVsCraving(4, 6)).toBeNull();
    expect(savingVsCraving(5, 4.999)).toBeNull();
  });
  it('is null when either price is missing or not finite', () => {
    expect(savingVsCraving(null, 3)).toBeNull();
    expect(savingVsCraving(8, undefined)).toBeNull();
    expect(savingVsCraving(NaN, 3)).toBeNull();
    expect(savingVsCraving(8, Infinity)).toBeNull();
  });
});
