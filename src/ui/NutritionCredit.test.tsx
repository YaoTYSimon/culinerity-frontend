import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { culturalSources } from '@culinerity/core';
import { NutritionCredit } from './NutritionCredit';

describe('NutritionCredit', () => {
  it('credits FSANZ with the licence, the adaptation and safe links', () => {
    const { container } = render(<NutritionCredit />);
    expect(container.textContent).toContain(
      'Nutrition data: Food Standards Australia New Zealand, Australian Food Composition Database Release 3, CC BY 4.0, adapted (nutrient values summed per recipe).',
    );
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/data-files',
      'https://creativecommons.org/licenses/by/4.0/',
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('aria-label', expect.stringContaining('opens in a new tab'));
    }
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('matches the source record that the API data carries', () => {
    const afcd = culturalSources().find((s) => s.id === 'afcd-r3')!;
    expect(afcd.attribution).toContain('Food Standards Australia New Zealand');
    expect(afcd.licence).toContain('CC BY 4.0');
    expect(afcd.version).toContain('Release 3');
    const { container } = render(<NutritionCredit />);
    expect(container.querySelector('a')).toHaveAttribute('href', afcd.url);
  });
});
