import { act, render, renderHook } from '@testing-library/react';
import { InMemoryThemeStore } from '@culinerity/core';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

describe('ThemeProvider', () => {
  it('applies the stored theme to <html> on mount', () => {
    render(<ThemeProvider store={new InMemoryThemeStore('sand')}><p>x</p></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe('sand');
  });

  it('applies and persists on setTheme', () => {
    const store = new InMemoryThemeStore();
    const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider store={store}>{children}</ThemeProvider>;
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('tobacco');
    act(() => result.current.setTheme('cream'));
    expect(result.current.theme).toBe('cream');
    expect(document.documentElement.dataset.theme).toBe('cream');
    expect(store.load()).toBe('cream');
  });

  it('useTheme works without a provider (default theme, no-op setter)', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('tobacco');
    expect(() => result.current.setTheme('sand')).not.toThrow();
  });
});
