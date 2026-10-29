import { describe, expect, it } from 'vitest';
import { pantryIngredients } from '../recipes/source';
import type { IngredientRow } from '../recipes/types';
import { searchIngredients } from './search';

const all = pantryIngredients();
const row = (id: string, name: string, aliases?: string[]) => ({ id, name, aliases }) as unknown as IngredientRow;

describe('searchIngredients', () => {
  it('finds tinned tomatoes through an alias', () => {
    expect(searchIngredients('tinned tom', all).map((r) => r.id)).toContain('tomatoes-tinned');
  });
  it('is case-insensitive', () => {
    expect(searchIngredients('RICE', all).map((r) => r.id)).toEqual(searchIngredients('rice', all).map((r) => r.id));
    expect(searchIngredients('rice', all).length).toBeGreaterThan(0);
  });
  it('empty or blank query returns []', () => {
    expect(searchIngredients('', all)).toEqual([]);
    expect(searchIngredients('   ', all)).toEqual([]);
  });
  it('ranks prefix before word prefix before substring', () => {
    const rows = [row('c', 'Lemon curd'), row('b', 'Fresh curry leaf'), row('a', 'Curry powder'), row('d', 'Scurry')];
    expect(searchIngredients('curr', rows).map((r) => r.id)).toEqual(['a', 'b', 'd']);
  });
  it('folds diacritics both ways', () => {
    const rows = [row('cf', 'Crème fraîche'), row('x', 'Bread')];
    expect(searchIngredients('creme', rows).map((r) => r.id)).toEqual(['cf']);
    expect(searchIngredients('CRÈME', rows).map((r) => r.id)).toEqual(['cf']);
    expect(searchIngredients('é', rows).map((r) => r.id)).toEqual(['cf', 'x']);
  });
  it('respects the limit, default 8', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`r${i}`, `Rice ${i}`));
    expect(searchIngredients('rice', rows)).toHaveLength(8);
    expect(searchIngredients('rice', rows, 3)).toHaveLength(3);
  });
  it('lists a row once even if name and alias both match', () => {
    expect(searchIngredients('rice', [row('r', 'Rice', ['rice grains'])])).toHaveLength(1);
  });
});
