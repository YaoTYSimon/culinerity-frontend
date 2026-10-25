import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { CravingSearch } from './CravingSearch';
import { PhotoCredits } from './PhotoCredits';

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

describe('PhotoCredits', () => {
  it('lists all thirteen credits with safe external links', () => {
    const { container } = render(<PhotoCredits />);
    expect(container.querySelector('details summary')).toHaveTextContent('Photo credits');
    expect(container.querySelectorAll('li')).toHaveLength(13);
    expect(screen.getAllByText('CC0')[0]).toHaveAttribute('href', expect.stringContaining('creativecommons.org'));
    expect(screen.queryByText(/CC BY/)).toBeNull();
    for (const a of container.querySelectorAll('a')) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
    }
  });
});
