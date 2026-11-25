import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEME_IDS } from '@culinerity/core';
import { describe, expect, it } from 'vitest';
import { checkThemes, contrastRatio } from '../../scripts/contrast.mjs';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe('theme contrast (WCAG AA)', () => {
  const results = checkThemes(css);
  it('covers every theme in the one theme list', () => {
    expect(Object.keys(results).sort()).toEqual([...THEME_IDS].sort());
  });
  for (const [theme, pairs] of Object.entries(results)) {
    for (const p of pairs) {
      it(`${theme}: ${p.name} is ${p.ratio.toFixed(2)} (needs ${p.min})`, () => {
        expect(p.ratio).toBeGreaterThanOrEqual(p.min);
      });
    }
  }
});
