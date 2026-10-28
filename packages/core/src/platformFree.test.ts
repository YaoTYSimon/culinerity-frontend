import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('core stays platform-free', () => {
  it('source files use no browser, React or Node APIs', () => {
    const banned = /\bwindow\b|\bdocument\b|localStorage|\breact\b|node:|\bprocess\b|\brequire\(|\bBuffer\b/i;
    const self = new URL(import.meta.url).pathname;
    // Generated data is plain text, so prose may contain words the guard bans.
    const generated = [join(self, '..', 'benchmarks', 'generated'), join(self, '..', 'places', 'generated'), join(self, '..', 'cultural', 'generated')];
    const offenders = files(join(self, '..'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== self && !generated.some((g) => f.startsWith(g)))
      .filter((f) => banned.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
