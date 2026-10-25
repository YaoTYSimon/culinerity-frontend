import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEME_IDS } from '@culinerity/core';
import { describe, expect, it } from 'vitest';
import { readThemes } from '../../scripts/contrast.mjs';
import { THEME_TOKENS } from './tokens';

const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('theme tokens: one source, no drift', () => {
  it('index.css holds exactly the values in tokens.ts', () => {
    const css = readThemes(read('src/index.css'));
    for (const id of THEME_IDS) expect(css[id], id).toEqual(THEME_TOKENS[id]);
  });

  it('the no-flash script in index.html lists the same ids with each theme bg', () => {
    const html = read('index.html');
    const map = /var themes = \{([^}]*)\}/.exec(html)![1];
    const found = Object.fromEntries([...map.matchAll(/(\w+):\s*'(#[0-9a-f]{6})'/gi)].map((m) => [m[1], m[2]]));
    expect(found).toEqual(Object.fromEntries(THEME_IDS.map((id) => [id, THEME_TOKENS[id].bg])));
    expect(html).toContain(`content="${THEME_TOKENS.tobacco.bg}"`);
  });

  it('the primary fill is visible on the ground in every theme (>= 3:1)', async () => {
    const { contrastRatio } = await import('../../scripts/contrast.mjs');
    for (const id of THEME_IDS) expect(contrastRatio(THEME_TOKENS[id].accent, THEME_TOKENS[id].bg), id).toBeGreaterThanOrEqual(3);
  });
});
