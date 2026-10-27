import { describe, expect, it } from 'vitest';
import { homeFor, resolveView } from './views';

describe('resolveView', () => {
  it('shows the number only when there is a score; otherwise falls back to home', () => {
    expect(resolveView('number', {})).toBe('swaps');
    expect(resolveView('number', { score: 40 })).toBe('number');
    expect(homeFor({ score: 0 })).toBe('number');
  });
  it('leaves other views alone', () => {
    expect(resolveView('week', {})).toBe('week');
  });

  it('accepts nearby with or without a score', () => {
    expect(resolveView('nearby', {})).toBe('nearby');
    expect(resolveView('nearby', { score: 10 })).toBe('nearby');
  });
});
