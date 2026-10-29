import { describe, expect, it } from 'vitest';
import { safetyLines } from './safety';
import { recipe } from './fixtures.testutil';

describe('safetyLines', () => {
  it('none for an untagged recipe', () => {
    expect(safetyLines(recipe('r', ['a']))).toEqual([]);
  });
  it('leftovers lines in plain words, no rice line', () => {
    const t = safetyLines(recipe('r', ['a'], { safety: ['leftovers'] })).join(' ');
    expect(t).toMatch(/2 hours/);
    expect(t).toMatch(/3 days/);
    expect(t).toMatch(/steaming hot/);
    expect(t).toMatch(/4 hours/);
    expect(t).not.toMatch(/rice|pasta/i);
  });
  it('rice and pasta tags add the 2-day line and the reheat-once line', () => {
    for (const tag of ['rice', 'pasta'] as const) {
      const t = safetyLines(recipe('r', ['a'], { safety: [tag] })).join(' ');
      expect(t).toMatch(/rice and pasta[^.]*2 days/i);
      expect(t).toMatch(/once/);
    }
  });
  it('never prints a temperature', () => {
    const all = safetyLines(recipe('r', ['a'], { safety: ['rice', 'pasta', 'leftovers'], cookThroughSourceId: 'nsw-fa-cooking-temps' })).join(' ');
    expect(all).not.toMatch(/°|\d\s*C\b|degrees/i);
  });
  it('raw poultry or mince: colour alone is not reliable, thermometer is safest, no temperature', () => {
    const t = safetyLines(recipe('r', ['a'], { cookThroughSourceId: 'nsw-fa-cooking-temps' })).join(' ');
    expect(t).toMatch(/right through/);
    expect(t).toMatch(/colour alone is not a reliable test/i);
    expect(t).toMatch(/food thermometer/i);
    expect(t).not.toMatch(/°|\d\s*C\b|degrees/i);
  });
});
