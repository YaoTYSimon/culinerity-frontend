import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const block = css.slice(css.indexOf('@utility focus-ring'), css.indexOf('@utility motion-colors'));

describe('focus-ring utility', () => {
  it('keeps the box-shadow ring', () => {
    expect(block).toContain('focus-visible:ring-2');
    expect(block).toContain('focus-visible:ring-ink');
  });
  it('draws a system-colour outline in forced-colors mode, where box-shadow is stripped', () => {
    expect(block).toMatch(/@media \(forced-colors: active\)/);
    expect(block).toMatch(/outline:\s*2px solid (Highlight|CanvasText)/);
  });
});
