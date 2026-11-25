import { describe, expect, it } from 'vitest';
import { cleanEquipment, EQUIPMENT_IDS, equipmentPhrase, isEquipmentId, lackedEquipment } from './equipment';
import { allRecipes } from './source';

describe('equipment', () => {
  it('lists nine kit items with unique ids', () => {
    expect(EQUIPMENT_IDS).toHaveLength(9);
    expect(new Set(EQUIPMENT_IDS).size).toBe(9);
    expect(isEquipmentId('oven')).toBe(true);
    expect(isEquipmentId('spoon')).toBe(false);
  });
  it('filters nothing when nothing is chosen', () => {
    expect(lackedEquipment(['oven', 'stove'], undefined)).toEqual([]);
    expect(lackedEquipment(['oven', 'stove'], [])).toEqual([]);
  });
  it('names what is lacked once something is chosen', () => {
    expect(lackedEquipment(['oven', 'stove'], ['stove'])).toEqual(['oven']);
    expect(lackedEquipment(['stove'], ['stove', 'oven'])).toEqual([]);
    expect(lackedEquipment([], ['stove'])).toEqual([]);
  });
  it('cleans stored values', () => {
    expect(cleanEquipment(['oven', 'oven', 'spoon', 3, 'stove'])).toEqual(['stove', 'oven']);
    expect(cleanEquipment('oven')).toEqual([]);
  });
  it('words a need', () => {
    expect(equipmentPhrase(['oven'])).toBe('an oven');
    expect(equipmentPhrase(['stove', 'oven'])).toBe('a stove and an oven');
    expect(equipmentPhrase(['stove', 'oven', 'blender'])).toBe('a stove, an oven and a blender');
  });
});

/** Methods that give an either-or (a pan or the oven): the stove is the one we require. */
const EITHER_OR = new Set(['pita-salad', 'eggplant-omelette']);

describe('recipe equipment', () => {
  it('every recipe declares known equipment, once each', () => {
    for (const r of allRecipes()) {
      expect(Array.isArray(r.needs), `${r.id} needs`).toBe(true);
      for (const n of r.needs) expect(isEquipmentId(n), `${r.id} ${n}`).toBe(true);
      expect(new Set(r.needs).size, r.id).toBe(r.needs.length);
    }
  });
  it('matches the method text', () => {
    for (const r of allRecipes()) {
      const text = r.steps.join(' ');
      if (/\b(bake|roast|oven)\b/i.test(text) && !EITHER_OR.has(r.id)) expect(r.needs, `${r.id} oven`).toContain('oven');
      if (/\b(fry|simmer|boil|stir-fry|sauté|saute|brown)/i.test(text)) expect(r.needs, `${r.id} stove`).toContain('stove');
      if (/\bblend/i.test(text)) expect(r.needs, `${r.id} blender`).toContain('blender');
      if (/\bmicrowave\b/i.test(text)) expect(r.needs, `${r.id} microwave`).toContain('microwave');
    }
  });
});
