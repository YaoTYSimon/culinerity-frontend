import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { GROUPS as MENU_GROUPS, Menu } from './Menu';
import { GROUP_ICONS } from './menuIcons';

const GROUPS: Record<string, string[]> = {
  Today: ['Home', 'Swaps', 'Check-in', 'My week'],
  Money: ['Budget', 'What if', 'Trade-offs'],
  Food: ['Cook with what you have', 'My pantry', 'My food', 'Meals that felt like home', 'Food safety'],
  'Find food': ['Nearby', 'Food support'],
  About: ['Welcome', 'Data and policy'],
};
const ITEMS = Object.values(GROUPS).flat();

function openAll() {
  for (const heading of Object.keys(GROUPS)) {
    const b = screen.getByRole('button', { name: heading });
    if (b.getAttribute('aria-expanded') === 'false') fireEvent.click(b);
  }
}

describe('Menu', () => {
  it('every group has a decorative icon, keyed by its id, drawn inside the heading', () => {
    expect(MENU_GROUPS.map((g) => g.heading)).toEqual(Object.keys(GROUPS));
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    for (const { id, heading } of MENU_GROUPS) {
      expect(GROUP_ICONS[id]).toBeTypeOf('function');
      expect(screen.getByRole('button', { name: heading }).querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('every group has a decorative icon, keyed by its id, drawn before the heading', () => {
    expect(MENU_GROUPS.map((g) => g.heading)).toEqual(Object.keys(GROUPS));
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    for (const { id, heading } of MENU_GROUPS) {
      expect(GROUP_ICONS[id]).toBeTypeOf('function');
      const svg = screen.getByRole('button', { name: heading }).querySelector('svg[aria-hidden="true"]');
      expect(svg).not.toBeNull();
    }
  });

  it('lists every destination under its one-word group heading', () => {
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    openAll();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(ITEMS);
    for (const [heading, labels] of Object.entries(GROUPS)) {
      const list = screen.getByRole('list', { name: heading });
      expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(labels);
    }
  });

  it('has no explanatory sentences: only headings and short labels', () => {
    render(<Menu current="swaps" onNavigate={() => {}} open />);
    openAll();
    expect(screen.getByRole('navigation', { name: 'Menu' }).textContent).not.toMatch(/[.,]/);
  });

  it('is closed until the Menu button is pressed, then lists every destination', () => {
    render(<Menu current="swaps" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Swaps' })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    openAll();
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
    expect(screen.getByRole('button', { name: 'Find food' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Food support' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Swaps' })).not.toHaveAttribute('aria-current');
  });

  it('marks Home on the number screen, which is what Home opens once there is a score', () => {
    render(<Menu current="number" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Swaps' })).not.toHaveAttribute('aria-current');
  });

  it('Nearby is under Find food with Food support and navigates to nearby', () => {
    const onNavigate = vi.fn();
    render(<Menu current="swaps" onNavigate={onNavigate} open />);
    fireEvent.click(screen.getByRole('button', { name: 'Find food' }));
    expect(within(screen.getByRole('list', { name: 'Find food' })).getByRole('button', { name: 'Food support' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
    expect(onNavigate).toHaveBeenCalledWith('nearby');
  });

  it('the trigger and panel are linked and the panel is one block', () => {
    render(<Menu current="swaps" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(button);
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toContainElement(screen.getByRole('navigation', { name: 'Menu' }));
  });

  describe('collapsible groups', () => {
    const heading = (name: string) => screen.getByRole('button', { name });

    it('opens Today and the group of the current page; the others start closed', () => {
      render(<Menu current="budget" onNavigate={() => {}} open />);
      expect(heading('Today')).toHaveAttribute('aria-expanded', 'true');
      expect(heading('Money')).toHaveAttribute('aria-expanded', 'true');
      for (const h of ['Food', 'Find food', 'About']) expect(heading(h)).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('button', { name: 'Budget' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Nearby' })).not.toBeInTheDocument();
    });

    it('on the number screen only Today is open (Home is current)', () => {
      render(<Menu current="number" onNavigate={() => {}} open />);
      expect(heading('Today')).toHaveAttribute('aria-expanded', 'true');
      expect(heading('Money')).toHaveAttribute('aria-expanded', 'false');
    });

    it('a heading toggles its group and aria-controls points at the list', () => {
      render(<Menu current="swaps" onNavigate={() => {}} open />);
      const food = heading('Food');
      expect(screen.queryByRole('button', { name: 'My pantry' })).not.toBeInTheDocument();
      fireEvent.click(food);
      expect(food).toHaveAttribute('aria-expanded', 'true');
      expect(document.getElementById(food.getAttribute('aria-controls')!)).toContainElement(screen.getByRole('button', { name: 'My pantry' }));
      fireEvent.click(food);
      expect(food).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'My pantry' })).not.toBeInTheDocument();
    });

    it('Today can be closed too, and the heading is keyboard operable (Enter and Space)', async () => {
      const user = userEvent.setup();
      render(<Menu current="swaps" onNavigate={() => {}} open />);
      heading('Today').focus();
      await user.keyboard('{Enter}');
      expect(heading('Today')).toHaveAttribute('aria-expanded', 'false');
      await user.keyboard(' ');
      expect(heading('Today')).toHaveAttribute('aria-expanded', 'true');
    });

    it('Escape on a heading still closes the menu and returns focus', async () => {
      const user = userEvent.setup();
      render(<Menu current="swaps" onNavigate={() => {}} />);
      const button = screen.getByRole('button', { name: 'Menu' });
      await user.click(button);
      heading('Find food').focus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('button', { name: 'Find food' })).not.toBeInTheDocument();
      expect(button).toHaveFocus();
    });

    it('open groups are forgotten when the menu is closed and reopened', () => {
      render(<Menu current="swaps" onNavigate={() => {}} />);
      const button = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(button);
      fireEvent.click(heading('About'));
      fireEvent.click(button);
      fireEvent.click(button);
      expect(heading('About')).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
