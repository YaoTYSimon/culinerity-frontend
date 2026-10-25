import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InMemoryThemeStore, THEME_IDS, THEME_NAMES } from '@culinerity/core';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ThemeDots } from './ThemeDots';

const setup = (initial?: 'sand') =>
  render(<ThemeProvider store={new InMemoryThemeStore(initial)}><ThemeDots /></ThemeProvider>);

describe('ThemeDots', () => {
  it('draws no hairline outline on the swatches (flat colour only)', () => {
    setup();
    expect(document.querySelectorAll('svg circle, svg [stroke-width]')).toHaveLength(0);
  });

  it('renders four buttons named by theme, exactly one pressed', () => {
    setup();
    for (const id of THEME_IDS) expect(screen.getByRole('button', { name: THEME_NAMES[id] })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking changes the theme', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Walnut' }));
    expect(screen.getByRole('button', { name: 'Walnut' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tobacco' })).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('walnut');
  });
});
