export type ThemeId = 'tobacco' | 'sand' | 'walnut' | 'cream';

export const THEME_IDS: readonly ThemeId[] = ['tobacco', 'sand', 'walnut', 'cream'];
export const DEFAULT_THEME: ThemeId = 'tobacco';
export const THEME_NAMES: Record<ThemeId, string> = {
  tobacco: 'Tobacco',
  sand: 'Sand',
  walnut: 'Walnut',
  cream: 'Cream',
};

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
