import { describe, expect, it } from 'vitest';
import { healthLabel, SIMILAR_BAND } from './healthLabel';

describe('healthLabel', () => {
  it('compares against the craving', () => {
    expect(healthLabel(70, 40)).toBe('Healthier');
    expect(healthLabel(20, 40)).toBe('Less healthy');
    expect(healthLabel(44, 40)).toBe('Similar');
  });
  it('treats the band edge as similar', () => {
    expect(healthLabel(40 + SIMILAR_BAND, 40)).toBe('Similar');
    expect(healthLabel(40 - SIMILAR_BAND, 40)).toBe('Similar');
  });
  it('returns null with no baseline or bad numbers', () => {
    expect(healthLabel(70, null)).toBeNull();
    expect(healthLabel(NaN, 40)).toBeNull();
  });
});
