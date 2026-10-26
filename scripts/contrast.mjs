#!/usr/bin/env node
// WCAG 2.x contrast check for the four themes, computed from the CSS tokens in src/index.css.
// Usage: node scripts/contrast.mjs   (exits 1 when a required pair fails)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const THEMES = ['tobacco', 'sand', 'walnut', 'cream'];
const TEXT = 4.5;
const CONTROL = 3;

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads `--name: #hex;` declarations from the `:root` (tobacco) and `[data-theme='x']` blocks. */
export function readThemes(css) {
  const out = {};
  for (const theme of THEMES) {
    const selector = theme === 'tobacco' ? ':root' : `\\[data-theme=['"]${theme}['"]\\]`;
    const block = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(css);
    if (!block) throw new Error(`No token block for theme "${theme}"`);
    out[theme] = {};
    for (const m of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[theme][m[1]] = m[2];
  }
  return out;
}

/** Every required pair per theme: { name, ratio, min }. */
export function checkThemes(css) {
  const themes = readThemes(css);
  const result = {};
  for (const [theme, t] of Object.entries(themes)) {
    const pair = (name, fg, bg, min) => ({ name, ratio: contrastRatio(t[fg], t[bg]), min });
    result[theme] = [
      pair('ink on bg', 'ink', 'bg', TEXT),
      // The surface pill variant is a quiet secondary by design: it is told apart by its label, not its fill.
      pair('ink on surface (surface pill label)', 'ink', 'surface', TEXT),
      pair('muted on bg', 'muted', 'bg', TEXT),
      pair('muted on surface', 'muted', 'surface', TEXT),
      pair('accent-ink on accent (button text)', 'accent-ink', 'accent', TEXT),
      pair('accent (primary fill) on bg', 'accent', 'bg', CONTROL),
      // Focus ring, selected-dot ring and the dot outline are drawn in ink (or muted) against the ground.
      pair('ink on bg as control edge', 'ink', 'bg', CONTROL),
      pair('ink on surface as control edge', 'ink', 'surface', CONTROL),
      pair('muted on bg as control edge', 'muted', 'bg', CONTROL),
      // Text fields: the 2px edge (muted) must read against the page ground AND against the surface tone (WCAG 1.4.11).
      pair('input edge (muted) vs bg', 'muted', 'bg', CONTROL),
      pair('input edge (muted) vs surface', 'muted', 'surface', CONTROL),
    ];
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  let failed = false;
  const results = checkThemes(css);
  for (const [theme, pairs] of Object.entries(results)) {
    console.log(`\n${theme}`);
    for (const p of pairs) {
      const ok = p.ratio >= p.min;
      if (!ok) failed = true;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${p.ratio.toFixed(2).padStart(5)} (min ${p.min})  ${p.name}`);
    }
  }
  const themes = readThemes(css);
  console.log('\ninformational');
  for (const [theme, t] of Object.entries(themes)) {
    console.log(`  ${theme}: surface on bg ${contrastRatio(t.surface, t.bg).toFixed(2)}`);
  }
  process.exit(failed ? 1 : 0);
}
