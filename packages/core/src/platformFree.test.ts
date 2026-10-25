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
  it('references no localStorage, window, document or react', () => {
    const banned = /localStorage|\bwindow\b|\bdocument\b|react/i;
    const self = new URL(import.meta.url).pathname;
    const offenders = files(join(self, '..'))
      .filter((f) => /\.tsx?$/.test(f) && f !== self)
      .filter((f) => banned.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
