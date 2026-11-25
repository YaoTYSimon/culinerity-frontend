import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { CravingSearch } from './CravingSearch';
import { PhotoCredits } from './PhotoCredits';
import { PHOTO_CREDITS } from '../assets/photos';

describe('popular craving tiles', () => {
  it('show photos, and the result header keeps the craving photo', async () => {
    render(<ServicesProvider services={createServices()}><CravingSearch profile={{}} onAddToWeek={() => {}} /></ServicesProvider>);
    const tile = screen.getByRole('button', { name: /takeaway burger/i });
    expect(tile.querySelector('img')).not.toBeNull();
    expect(tile.querySelector('img')!.className).toMatch(/rounded-full/);
    fireEvent.click(tile);
    const heading = await screen.findByRole('heading', { name: /swaps? for takeaway burger/i });
    expect(heading.parentElement!.querySelector('img')).not.toBeNull();
    // swap ideas stay drawn
    const list = screen.getAllByRole('list')[0];
    expect(list.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(list.querySelectorAll('img')).toHaveLength(0);
    expect(list.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});

describe('popular cravings and traditions', () => {
  const names = () => screen.getAllByRole('button').filter((b) => !b.closest('[role=group]')).map((b) => b.textContent).filter((t) => t && t !== 'Find swaps');
  const food = (traditions: string[]) => ({ foodProfile: { traditions, rules: [], allergies: [], occasions: [], dismissed: [] } });
  const show = (profile: object) => render(<ServicesProvider services={createServices()}><CravingSearch profile={profile} onAddToWeek={() => {}} /></ServicesProvider>);

  it('are the same ten without a tradition', () => {
    show({});
    const plain = names();
    expect(plain).toHaveLength(10);
    cleanup();
    show(food([]));
    expect(names()).toEqual(plain);
    cleanup();
    show(food(['korean']));
    expect(names()).toEqual(plain);
  });

  it('list the cravings of the person\'s traditions first, then the ten', () => {
    show({});
    const plain = names();
    cleanup();
    show(food(['indian-north', 'italian']));
    const got = names();
    expect(got.slice(0, 2)).toEqual(expect.arrayContaining([expect.stringMatching(/butter chicken/i), expect.stringMatching(/lasagne/i)]));
    expect(got.slice(-10)).toEqual(plain);
  });
});

describe('PhotoCredits', () => {
  it('lists every credit with safe external links', () => {
    const { container } = render(<PhotoCredits />);
    expect(container.querySelector('details summary')).toHaveTextContent('Photo credits');
    expect(container.querySelectorAll('li')).toHaveLength(PHOTO_CREDITS.length);
    expect(screen.getAllByText('CC0')[0]).toHaveAttribute('href', expect.stringContaining('creativecommons.org'));
    expect(screen.queryByText(/CC BY/)).toBeNull();
    for (const a of container.querySelectorAll('a')) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
    }
  });
});

describe('browse cravings by type', () => {
  const show = () => render(<ServicesProvider services={createServices()}><CravingSearch profile={{}} onAddToWeek={() => {}} /></ServicesProvider>);
  const tiles = () => screen.getAllByRole('button').filter((b) => !b.closest('[role=group]') && b.textContent !== 'Find swaps');

  it('starts on All with the popular ten and aria-pressed pills', () => {
    show();
    const pills = screen.getAllByRole('button').filter((b) => b.closest('[role=group]'));
    expect(pills.map((p) => p.textContent)).toEqual(['All', 'Fast food', 'Sweet', 'Salty and crunchy', 'Hot meals', 'Drinks', 'Bakery']);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(tiles()).toHaveLength(10);
  });

  it('shows every craving of a type with a count, then All restores the ten', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Salty and crunchy' }));
    expect(screen.getByRole('button', { name: 'Salty and crunchy' })).toHaveAttribute('aria-pressed', 'true');
    expect(tiles().map((t) => t.textContent)).toEqual(expect.arrayContaining(['Nachos (takeaway)', 'Chicken nuggets', 'Hot chips']));
    expect(screen.getByText('3 cravings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(tiles()).toHaveLength(10);
  });

  it('opens the swaps from a type tile', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Salty and crunchy' }));
    fireEvent.click(screen.getByRole('button', { name: /nachos/i }));
    expect(await screen.findByRole('heading', { name: /swaps? for nachos/i })).toBeInTheDocument();
  });
});
