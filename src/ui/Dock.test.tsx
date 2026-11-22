import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DOCK_ITEMS, Dock } from './Dock';
import type { View } from './views';

const NAMES = ['Home', 'Nearby', 'Budget', 'Cook'];

describe('Dock', () => {
  it('is one "Main" navigation landmark with four named buttons, one word each', () => {
    render(<Dock current="swaps" onNavigate={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(NAMES);
    NAMES.forEach((name) => expect(within(nav).getByRole('button', { name })).toBeInTheDocument());
    expect(DOCK_ITEMS.map((i) => i.to)).toEqual(['home', 'nearby', 'budget', 'cook']);
  });

  it.each<[View, string]>([
    ['swaps', 'Home'],
    ['number', 'Home'],
    ['nearby', 'Nearby'],
    ['budget', 'Budget'],
    ['cook', 'Cook'],
  ])('marks %s as the current page: %s', (view, name) => {
    render(<Dock current={view} onNavigate={() => {}} />);
    const current = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current.map((b) => b.textContent)).toEqual([name]);
  });

  it('marks nothing as current on a view the dock does not hold', () => {
    render(<Dock current="week" onNavigate={() => {}} />);
    expect(screen.getAllByRole('button').some((b) => b.hasAttribute('aria-current'))).toBe(false);
  });

  it('navigates with the target on click', () => {
    const onNavigate = vi.fn();
    render(<Dock current="swaps" onNavigate={onNavigate} />);
    for (const [name, to] of [['Nearby', 'nearby'], ['Budget', 'budget'], ['Cook', 'cook'], ['Home', 'home']]) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(onNavigate).toHaveBeenLastCalledWith(to);
    }
  });

  it('keeps motion behind motion-safe, and every target is at least 56px', () => {
    render(<Dock current="swaps" onNavigate={() => {}} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toMatch(/motion-safe:transition/);
      expect(b.className).toMatch(/motion-safe:active:scale-\[0\.94\]/);
      expect(b.className).toMatch(/size-14|min-w-14/);
      expect(b.className).toContain('focus-ring');
      expect(b.className).not.toMatch(/(^|\s)(transition|duration-\d+)/);
    }
  });

  it('draws the icons decoratively and uses tokens only', () => {
    const { container } = render(<Dock current="swaps" onNavigate={() => {}} />);
    container.querySelectorAll('svg').forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'));
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}|shadow|border|blur/i);
  });
});
