import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createServices } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { CravingPicture } from './CravingPicture';
import { CravingSearch } from './CravingSearch';
import { PhotoCredits } from './PhotoCredits';

describe('CravingPicture', () => {
  it('renders a sized, decorative, lazy img for a photographed item', () => {
    const { container } = render(<CravingPicture id="burger" size={64} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '64');
    expect(img).toHaveAttribute('height', '64');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(container.querySelector('svg')).toBeNull();
  });
  it('falls back to the drawing when there is no photo', () => {
    const { container } = render(<CravingPicture id="smash-burger" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('popular craving tiles', () => {
  it('show photos, and the result header keeps the craving photo', async () => {
    render(<ServicesProvider services={createServices()}><CravingSearch profile={{}} /></ServicesProvider>);
    const tile = screen.getByRole('button', { name: /takeaway burger/i });
    expect(tile.querySelector('img')).not.toBeNull();
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
  it('lists all ten credits with safe external links', () => {
    const { container } = render(<PhotoCredits />);
    expect(container.querySelector('details summary')).toHaveTextContent('Photo credits');
    expect(container.querySelectorAll('li')).toHaveLength(10);
    expect(screen.getByText('CC BY 4.0')).toHaveAttribute('href', expect.stringContaining('creativecommons.org'));
    for (const a of container.querySelectorAll('a')) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
    }
  });
});
