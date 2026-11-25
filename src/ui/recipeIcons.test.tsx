import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { allRecipes } from '@culinerity/core';
import { ICON_KINDS, RECIPE_ICON, iconKindFor, RecipeIcon } from './recipeIcons';

describe('recipe icons', () => {
  it('gives every recipe a named icon from the fixed set', () => {
    for (const r of allRecipes()) {
      expect(RECIPE_ICON[r.id], r.id).toBeDefined();
      expect(ICON_KINDS).toContain(iconKindFor(r.id));
    }
  });
  it('has no stale ids in the table', () => {
    const ids = new Set(allRecipes().map((r) => r.id));
    for (const id of Object.keys(RECIPE_ICON)) expect(ids.has(id), id).toBe(true);
  });
  it('falls back to a bowl for an unknown recipe', () => {
    expect(iconKindFor('no-such-recipe')).toBe('bowl');
  });
  it('draws a decorative round svg for each kind', () => {
    for (const k of ICON_KINDS) {
      const { container, unmount } = render(<RecipeIcon kind={k} />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg.querySelector('path')).not.toBeNull();
      expect(container.firstElementChild).toHaveClass('rounded-full');
      unmount();
    }
  });
});
