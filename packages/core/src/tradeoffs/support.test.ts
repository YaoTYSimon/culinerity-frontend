import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TRADEOFF_CATEGORIES } from './types';
import { HELPLINES, supportFor } from './support';

describe('helplines', () => {
  it('HELPLINES digits are exactly 13 11 14, 1800 55 1800, 1800 007 007 with tel hrefs 131114, 1800551800, 1800007007', () => {
    expect(HELPLINES.lifeline.display).toBe('13 11 14');
    expect(HELPLINES['kids-helpline'].display).toBe('1800 55 1800');
    expect(HELPLINES['national-debt-helpline'].display).toBe('1800 007 007');
    expect(HELPLINES.lifeline.tel).toBe('131114');
    expect(HELPLINES['kids-helpline'].tel).toBe('1800551800');
    expect(HELPLINES['national-debt-helpline'].tel).toBe('1800007007');
    expect(HELPLINES['safe-steps'].display).toBe('1800 015 188');
    expect(HELPLINES['safe-steps'].tel).toBe('1800015188');
    expect(HELPLINES['safe-steps'].verifiedOn).toBe('2026-11-20');
    for (const h of Object.values(HELPLINES)) if (h.id !== 'safe-steps') expect(h.verifiedOn).toBe('2026-10-29');
  });

  it('supportFor per tier, for all ten categories', () => {
    const food = { tier: 'food', helplines: ['lifeline'], findFood: true, foodSupportView: true };
    const money = { tier: 'money', helplines: ['national-debt-helpline', 'lifeline'], findFood: false, foodSupportView: false };
    const none = { tier: 'none', helplines: [], findFood: false, foodSupportView: false };
    const expected = {
      'self-treat': none,
      'child-want': none,
      'meal-skipped': food,
      'child-meal': { ...food, tier: 'food+child', helplines: ['lifeline', 'kids-helpline'] },
      'cheaper-food': none,
      'bill-delayed': money,
      borrowed: money,
      'health-skipped': { ...money, tier: 'health' },
      'cut-back': none,
      other: none,
    };
    expect(TRADEOFF_CATEGORIES).toHaveLength(10);
    for (const c of TRADEOFF_CATEGORIES) expect(supportFor(c), c).toEqual(expected[c]);
  });

  it('no 1800RESPECT, Orange Door or Parentline (not verified as listed numbers) anywhere in support.ts and SupportCard.tsx', () => {
    for (const f of ['./support.ts', '../../../../src/ui/SupportCard.tsx']) {
      const text = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
      expect(text, f).not.toMatch(/1800\s?RESPECT|Orange Door|Parentline/i);
    }
  });
});
