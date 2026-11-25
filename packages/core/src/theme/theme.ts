/** The one list of themes: ids and short names. Everything else (types, ids, names, switcher) derives from it. */
export const THEMES = [
  { id: 'tobacco', name: 'Tobacco' },
  { id: 'sand', name: 'Sand' },
  { id: 'walnut', name: 'Walnut' },
  { id: 'cream', name: 'Cream' },
  { id: 'ink', name: 'Ink' },
  { id: 'sage', name: 'Sage' },
  { id: 'clay', name: 'Clay' },
  { id: 'sunrise', name: 'Sunrise' },
  { id: 'mono', name: 'Mono' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const THEME_IDS: readonly ThemeId[] = THEMES.map((t) => t.id);
export const DEFAULT_THEME: ThemeId = 'tobacco';
export const THEME_NAMES = Object.fromEntries(THEMES.map((t) => [t.id, t.name])) as Record<ThemeId, string>;

/** Unknown or corrupt values fall back to the default theme. */
export function parseTheme(v: unknown): ThemeId {
  return THEME_IDS.find((id) => id === v) ?? DEFAULT_THEME;
}

/** Persistence port for the chosen theme. Implementations never throw. */
export interface ThemeStore {
  load(): ThemeId;
  save(id: ThemeId): void;
}

export class InMemoryThemeStore implements ThemeStore {
  private id: ThemeId;
  constructor(initial?: ThemeId) {
    this.id = parseTheme(initial);
  }
  load(): ThemeId {
    return this.id;
  }
  save(id: ThemeId): void {
    this.id = parseTheme(id);
  }
}
