import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

const ITEMS = ['Home', 'Swaps', 'Check-in', 'Budget', 'Food support', 'My week', 'Welcome', 'Data and policy'];

describe('Menu', () => {
  it('lists destinations in order', () => {
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(ITEMS);
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
});
