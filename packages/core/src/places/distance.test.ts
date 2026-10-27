import { describe, expect, it } from 'vitest';
import { formatDistance, haversineMetres, roundOrigin } from './distance';

const flinders = { lat: -37.8183, lng: 144.9671 };
const southernCross = { lat: -37.8184, lng: 144.9524 };

describe('haversineMetres', () => {
  it('measures a known pair', () => {
    const m = haversineMetres(flinders, southernCross);
    expect(m).toBeGreaterThan(1250);
    expect(m).toBeLessThan(1350);
  });
  it('is symmetric and zero for identical points', () => {
    expect(haversineMetres(flinders, southernCross)).toBe(haversineMetres(southernCross, flinders));
    expect(haversineMetres(flinders, flinders)).toBe(0);
  });
  it('returns NaN for non-finite input', () => {
    expect(haversineMetres({ lat: NaN, lng: 1 }, flinders)).toBeNaN();
    expect(haversineMetres(flinders, { lat: 1, lng: Infinity })).toBeNaN();
  });
});

describe('formatDistance', () => {
  it.each([
    [0, 'under 100 m'],
    [99, 'under 100 m'],
    [100, '100 m'],
    [349, '350 m'],
    [999, '1 km'],
    [1000, '1 km'],
    [1234, '1.2 km'],
    [9949, '9.9 km'],
    [10000, '10 km'],
    [12400, '12 km'],
    [NaN, 'distance unknown'],
    [-5, 'distance unknown'],
    [Infinity, 'distance unknown'],
  ])('%s -> %s', (m, expected) => {
    expect(formatDistance(m)).toBe(expected);
  });
});

describe('roundOrigin', () => {
  it('rounds to 3 decimals', () => {
    expect(roundOrigin({ lat: -37.81234, lng: 144.96321 })).toEqual({ lat: -37.812, lng: 144.963 });
  });
});
