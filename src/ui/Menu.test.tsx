import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

const GROUPS: Record<string, string[]> = {
  Today: ['Home', 'Swaps', 'Check-in', 'My week'],
  Money: ['Budget', 'What if', 'Trade-offs'],
  Food: ['Cook with what you have', 'My pantry', 'My food', 'Meals that felt like home', 'Food safety'],
  Help: ['Nearby', 'Food support'],
  About: ['Welcome', 'Data and policy'],
};
const ITEMS = Object.values(GROUPS).flat();

describe('Menu', () => {
  it('lists every destination under its one-word group heading', () => {
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(ITEMS);
    for (const [heading, labels] of Object.entries(GROUPS)) {
      const list = screen.getByRole('list', { name: heading });
      expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(labels);
    }
  });

  it('has no explanatory sentences: only headings and short labels', () => {
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    expect(screen.getByRole('navigation', { name: 'Menu' }).textContent).not.toMatch(/[.,]/);
  });

  it('is closed until the Menu button is pressed, then lists every destination', () => {
    render(<Menu current="swaps" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Swaps' })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    ITEMS.forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });

  it('navigates, then closes and returns focus to the Menu button', () => {
    const onNavigate = vi.fn();
    render(<Menu current="swaps" onNavigate={onNavigate} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'My week' }));
    expect(onNavigate).toHaveBeenCalledWith('week');
    expect(screen.queryByRole('button', { name: 'My week' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('Home navigates to "home"', () => {
    const onNavigate = vi.fn();
    render(<Menu current="swaps" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

  it('moves focus into the list on open and Escape closes it, returning focus', () => {
    render(<Menu current="swaps" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Home' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Swaps' }), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('marks the current view', () => {
    render(<Menu current="support" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Food support' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Swaps' })).not.toHaveAttribute('aria-current');
  });

  it('marks Home on the number screen, which is what Home opens once there is a score', () => {
    render(<Menu current="number" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Swaps' })).not.toHaveAttribute('aria-current');
  });

  it('Nearby is under Help with Food support and navigates to nearby', () => {
    const onNavigate = vi.fn();
    render(<Menu current="swaps" onNavigate={onNavigate} open />);
    expect(within(screen.getByRole('list', { name: 'Help' })).getByRole('button', { name: 'Food support' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
    expect(onNavigate).toHaveBeenCalledWith('nearby');
  });

  it('the trigger and panel are linked and the panel is one block', () => {
    render(<Menu current="swaps" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(button);
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toContainElement(screen.getByRole('navigation', { name: 'Menu' }));
  });
});
