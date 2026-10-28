import { describe, expect, it } from 'vitest';
import { matchAllergies } from './allergens';

const TREE_NUTS = ['almond', 'brazil-nut', 'cashew', 'hazelnut', 'macadamia', 'pecan', 'pistachio', 'pine-nut', 'walnut'];

describe('matchAllergies', () => {
  it('maps the brief example', () => {
    const r = matchAllergies(['Peanuts', 'nut allergy', 'Dairy', 'shellfish', 'citrus']);
    for (const id of ['peanut', ...TREE_NUTS, 'milk', 'crustacean', 'mollusc']) expect(r.ids).toContain(id);
    expect(r.unmatched).toEqual(['citrus']);
  });
  it('peanut alone is only peanut; tree nut is only the nine tree nuts', () => {
    expect(matchAllergies(['peanut']).ids).toEqual(['peanut']);
    expect(matchAllergies(['Tree nuts']).ids).toEqual(TREE_NUTS);
  });
  it('plain nut(s) covers tree nuts and peanut (the cautious reading)', () => {
    const r = matchAllergies(['nuts']).ids;
    for (const id of ['peanut', ...TREE_NUTS]) expect(r).toContain(id);
  });
  it('maps single-id words', () => {
    expect(matchAllergies(['eggs', 'Soy', 'sesame', 'FISH', 'lupin', 'sulphites', 'sulphite', 'milk', 'wheat']).ids.sort()).toEqual(
      ['egg', 'fish', 'lupin', 'milk', 'sesame', 'soy', 'sulphites', 'wheat'].sort(),
    );
  });
  it('gluten maps to wheat, barley, rye and oats', () => {
    expect(matchAllergies(['gluten intolerance']).ids.sort()).toEqual(['barley', 'oats', 'rye', 'wheat']);
  });
  it('does not repeat ids', () => {
    const ids = matchAllergies(['gluten', 'wheat', 'Wheat allergy']).ids;
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('keeps unmappable and hostile text as unmatched; ignores empty strings', () => {
    expect(matchAllergies(['<script>', '', '   ']).unmatched).toEqual(['<script>']);
    expect(matchAllergies([]).ids).toEqual([]);
    expect(matchAllergies(['allergy']).unmatched).toEqual(['allergy']);
  });
  it('inherited property names are unmatched text, never a crash', () => {
    const hostile = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'Constructor', 'constructors'];
    const r = matchAllergies(hostile);
    expect(r.ids).toEqual([]);
    expect(r.unmatched).toEqual(hostile);
  });
  it('maps oat(s), prawn(s) and tree nut(s)', () => {
    expect(matchAllergies(['oat', 'Oats']).ids).toEqual(['oats']);
    expect(matchAllergies(['prawn', 'Prawns']).ids).toEqual(['crustacean']);
    expect(matchAllergies(['tree nut', 'Tree nuts', 'treenuts']).ids.sort()).toEqual([...TREE_NUTS].sort());
  });
});
