import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_THEME, parseTheme, type ThemeId, type ThemeStore } from '@culinerity/core';
import { LocalThemeStore } from '../storage/localThemeStore';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme(id: ThemeId): void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: DEFAULT_THEME, setTheme: () => {} });

interface Props {
  store?: ThemeStore;
  children: ReactNode;
}

/** Owns the chosen theme: applies it as `data-theme` on <html> (the only place themes are switched) and persists it. */
export function ThemeProvider({ store, children }: Props) {
  const [fallbackStore] = useState<ThemeStore>(() => new LocalThemeStore());
  const themeStore = store ?? fallbackStore;
  const [theme, setThemeState] = useState<ThemeId>(() => themeStore.load());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback(
    (id: ThemeId) => {
      const next = parseTheme(id);
      setThemeState(next);
      themeStore.save(next);
    },
    [themeStore],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
