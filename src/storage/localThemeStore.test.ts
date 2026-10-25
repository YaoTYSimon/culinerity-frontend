import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalThemeStore } from './localThemeStore';

const KEY = 'culinerity.theme.v1';

describe('LocalThemeStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('defaults to tobacco when nothing is stored', () => {
    expect(new LocalThemeStore().load()).toBe('tobacco');
  });

  it('round-trips a theme', () => {
    const s = new LocalThemeStore();
    s.save('walnut');
    expect(localStorage.getItem(KEY)).toBe('walnut');
    expect(new LocalThemeStore().load()).toBe('walnut');
  });

  it.each(['purple', '', '{"a":1}', 'SAND'])('falls back to tobacco for %j', (v) => {
    localStorage.setItem(KEY, v);
    expect(new LocalThemeStore().load()).toBe('tobacco');
  });

  it('never throws when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    const s = new LocalThemeStore();
    expect(s.load()).toBe('tobacco');
    expect(() => s.save('sand')).not.toThrow();
  });
});
