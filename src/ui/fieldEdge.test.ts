import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIELD_EDGE, INPUT_CLASS } from './formParts';

const dir = resolve(process.cwd(), 'src');
const files = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(resolve(d, e.name)) : /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [resolve(d, e.name)] : [],
  );

describe('text field edge (WCAG 1.4.11)', () => {
  it('is a 2px solid edge in the muted token, shared by the standard input class', () => {
    expect(FIELD_EDGE).toMatch(/\bborder-2\b/);
    expect(FIELD_EDGE).toMatch(/\bborder-muted\b/);
    expect(INPUT_CLASS).toContain(FIELD_EDGE);
  });

  it('every text input and textarea in src uses it', () => {
    const offenders: string[] = [];
    for (const f of files(dir)) {
      const src = readFileSync(f, 'utf8');
      // Each element runs to its self-closing "/>" (arrow functions inside attributes contain ">").
      const tags = [...src.matchAll(/<(?:input|textarea)\b/g)].map((m) => [src.slice(m.index, src.indexOf('/>', m.index) + 2)]);
      for (const t of tags) {
        if (/type=["'](?:checkbox|radio|hidden)["']/.test(t[0])) continue;
        // The tag's own className, or the constant it names, must come from the shared edge.
        const usesShared = /FIELD_EDGE|INPUT_CLASS|className=\{input\}/.test(t[0]);
        const inline = /border-2[^"']*border-muted|border-muted[^"']*border-2/.test(t[0]);
        if (!usesShared && !inline) offenders.push(f.replace(dir, 'src'));
      }
    }
    expect(offenders).toEqual([]);
  });
});
