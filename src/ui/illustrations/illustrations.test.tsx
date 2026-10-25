import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createServices } from '../../services/container';
import { FoodIllustration, hasIllustration } from './index';

function catalogueIds(): string[] {
  const { catalogue } = createServices();
  const cravings = catalogue.popularCravings();
  const ids = new Set(cravings.map((c) => c.id));
  for (const c of cravings) for (const s of catalogue.swapsFor(c.id)) ids.add(s.alternative.id);
  return [...ids];
}

describe('FoodIllustration', () => {
  it('has its own drawing for every craving and swap in the catalogue', () => {
    const ids = catalogueIds();
    expect(ids.length).toBeGreaterThanOrEqual(29);
    for (const id of ids) {
      expect(hasIllustration(id), id).toBe(true);
      const { container, unmount } = render(<FoodIllustration id={id} />);
      const svg = container.querySelector('svg');
      expect(svg, id).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      unmount();
    }
  });

  it('draws different pictures for different items, and falls back for unknown ids', () => {
    const markup = (id: string) => render(<FoodIllustration id={id} />).container.innerHTML;
    expect(markup('burger')).not.toBe(markup('pizza'));
    expect(hasIllustration('nope')).toBe(false);
    expect(markup('nope')).toBe(markup('another-unknown'));
    expect(markup('nope')).not.toBe(markup('burger'));
  });
});
