import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InMemoryThemeStore, THEME_IDS, THEME_NAMES } from '@culinerity/core';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ThemeSwatches } from './ThemeSwatches';

const setup = (initial?: 'sand') =>
  render(<ThemeProvider store={new InMemoryThemeStore(initial)}><ThemeSwatches /></ThemeProvider>);

describe('ThemeSwatches', () => {
  it('has no ring or border on the swatches (flat colour only)', () => {
    const { container } = setup();
    expect(container.innerHTML).not.toMatch(/ring-|border|shadow|stroke-width="[^"]*"[^>]*stroke="(?!currentColor)/);
  });

  it('renders one button per theme in the list, named by theme, exactly one pressed', () => {
    setup();
    for (const id of THEME_IDS) expect(screen.getByRole('button', { name: THEME_NAMES[id] })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(THEME_IDS.length);
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking changes the theme and marks only that swatch with a check', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Mono' }));
    expect(screen.getByRole('button', { name: 'Mono' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('mono');
    expect(document.querySelectorAll('svg path[stroke-linecap="round"]')).toHaveLength(1);
  });

  it('is operable from the keyboard', async () => {
    setup();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(document.documentElement.dataset.theme).toBe('tobacco');
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(document.documentElement.dataset.theme).toBe('sand');
  });
});
