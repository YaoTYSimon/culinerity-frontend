import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// If an assertion here fails, fix the code, not the test.

const HERE = __dirname;
const CORE_SRC = resolve(HERE, '..');
const REPO = resolve(HERE, '../../../..');

const FORBIDDEN = /\bfetch\b|\bXMLHttpRequest\b|\bnavigator\b|\blocalStorage\b|\bconsole\s*\.|\bwindow\b|\bdocument\b/;
const TOKENS = ['fetch(u)', 'new XMLHttpRequest()', 'navigator.share', 'localStorage.setItem(a, b)', 'console.log(x)', 'window.open()', 'document.cookie'];

/** Module specifiers that leave packages/core/src: bare packages, node: builtins, or relative paths climbing out. */
function outsideImports(file: string, text: string): string[] {
  const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return specs.filter((s) => {
    if (!s.startsWith('.')) return true;
    return !resolve(dirname(file), s).startsWith(CORE_SRC + '/');
  });
}

const sources = readdirSync(HERE).filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f)).map((f) => join(HERE, f));

describe('detectors are live (not circular)', () => {
  it.each(TOKENS)('flags %s', (bad) => {
    expect(FORBIDDEN.test(bad), bad).toBe(true);
  });
  it('flags an import from outside core/src', () => {
    expect(outsideImports(join(HERE, 'x.ts'), "import a from '../../../server/x';")).toEqual(['../../../server/x']);
    expect(outsideImports(join(HERE, 'x.ts'), "import a from 'openai';")).toEqual(['openai']);
    expect(outsideImports(join(HERE, 'x.ts'), "import a from '../budget/week';")).toEqual([]);
  });
});

describe('what-if core stays offline and platform-free', () => {
  it('reads the real files', () => {
    expect(sources.map((f) => f.slice(HERE.length + 1))).toEqual(expect.arrayContaining(['run.ts', 'explain.ts', 'saved.ts', 'scenario.ts', 'compare.ts', 'context.ts']));
  });
  it.each(sources.map((f) => [f.slice(HERE.length + 1), f]))('%s has no network, storage, console or browser globals', (_n, f) => {
    expect(readFileSync(f, 'utf8').match(FORBIDDEN)?.[0]).toBeUndefined();
  });
  it.each(sources.map((f) => [f.slice(HERE.length + 1), f]))('%s imports only from inside packages/core/src', (_n, f) => {
    expect(outsideImports(f, readFileSync(f, 'utf8'))).toEqual([]);
  });
});

describe('no AI or model dependency', () => {
  const BANNED = /^(openai|@anthropic-ai\/.*|langchain|@langchain\/.*|@google\/generative-ai|ollama|transformers|@xenova\/transformers|@huggingface\/transformers)$/;
  it('the matcher is live', () => {
    for (const n of ['openai', '@anthropic-ai/sdk', 'langchain', '@google/generative-ai', 'ollama', 'transformers']) expect(BANNED.test(n), n).toBe(true);
    expect(BANNED.test('react')).toBe(false);
  });
  it.each(['package.json', 'packages/core/package.json', 'server/package.json'])('%s lists none', (p) => {
    const pkg = JSON.parse(readFileSync(join(REPO, p), 'utf8'));
    const names = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap((k) => Object.keys(pkg[k] ?? {}));
    expect(names.filter((n) => BANNED.test(n))).toEqual([]);
  });
});
