import { DEFAULT_THEME, parseTheme, type ThemeId, type ThemeStore } from '@culinerity/core';

/** Same key as the inline no-flash script in index.html. */
export const THEME_KEY = 'culinerity.theme.v1';

/** localStorage-backed theme choice. Never throws: storage can be blocked, full or corrupt. */
export class LocalThemeStore implements ThemeStore {
  load(): ThemeId {
    try {
      return parseTheme(localStorage.getItem(THEME_KEY));
    } catch {
      return DEFAULT_THEME;
    }
  }

  save(id: ThemeId): void {
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      // Storage unavailable or full: the choice lasts for this visit only.
    }
  }
}
