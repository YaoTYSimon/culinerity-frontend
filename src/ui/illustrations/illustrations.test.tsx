import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { culturalData } from '@culinerity/core';
import { createServices } from '../../services/container';
import { FoodIllustration, hasIllustration } from './index';

function catalogueIds(): string[] {
  const { catalogue } = createServices();
  const cravings = catalogue.popularCravings();
  const ids = new Set(cravings.map((c) => c.id));
  for (const c of cravings) for (const s of catalogue.swapsFor(c.id)) ids.add(s.alternative.id);
  // Cultural catalogue items have no drawing yet and use the generic dish (spec ruling 4: no photos required).
  const cultural = new Set(culturalData.catalogue.items.map((i) => i.id));
  return [...ids].filter((id) => !cultural.has(id));
}

describe('FoodIllustration', () => {
  it('has its own drawing for every hand-entered craving and swap', () => {
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

  it('shows the generic dish for cultural catalogue items', () => {
    const id = culturalData.catalogue.items[0]!.id;
    expect(hasIllustration(id)).toBe(false);
    expect(render(<FoodIllustration id={id} />).container.innerHTML).toBe(render(<FoodIllustration id="nope" />).container.innerHTML);
  });

  it('draws different pictures for different items, and falls back for unknown ids', () => {
    const markup = (id: string) => render(<FoodIllustration id={id} />).container.innerHTML;
    expect(markup('burger')).not.toBe(markup('pizza'));
    expect(hasIllustration('nope')).toBe(false);
    expect(markup('nope')).toBe(markup('another-unknown'));
    expect(markup('nope')).not.toBe(markup('burger'));
  });
});
