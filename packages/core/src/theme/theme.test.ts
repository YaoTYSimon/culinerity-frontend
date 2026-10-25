import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, InMemoryThemeStore, parseTheme, THEME_IDS, THEME_NAMES } from './theme';

describe('parseTheme', () => {
  it.each(['tobacco', 'sand', 'walnut', 'cream'])('accepts %s', (t) => expect(parseTheme(t)).toBe(t));
  it.each(['purple', undefined, null, 5, {}, ''])('falls back for %j', (v) => expect(parseTheme(v)).toBe('tobacco'));
});

describe('theme constants', () => {
  it('default is tobacco and every id has a name', () => {
    expect(DEFAULT_THEME).toBe('tobacco');
    expect(THEME_IDS).toEqual(['tobacco', 'sand', 'walnut', 'cream']);
    for (const id of THEME_IDS) expect(THEME_NAMES[id].length).toBeGreaterThan(0);
  });
});

describe('InMemoryThemeStore', () => {
  it('defaults, saves and loads', () => {
    const s = new InMemoryThemeStore();
    expect(s.load()).toBe('tobacco');
    s.save('walnut');
    expect(s.load()).toBe('walnut');
  });
  it('can start from a corrupt value', () => {
    expect(new InMemoryThemeStore('nope' as never).load()).toBe('tobacco');
  });
});
