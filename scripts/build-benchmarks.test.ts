// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBenchmarks, validateBenchmarks, DATA_PATH, OUT_PATH } from './build-benchmarks.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));

describe('build-benchmarks', () => {
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildBenchmarks(data()));
  });
  it('accepts the dataset', () => {
    expect(validateBenchmarks(data())).toEqual([]);
  });
  it('rejects duplicate ids, dangling sources, http urls and string numbers', () => {
    const d = data();
    d.indicators.push({ ...d.indicators[0] });
    expect(validateBenchmarks(d).join()).toMatch(/duplicate/i);
    const e = data();
    e.indicators[0].sourceId = 'nope';
    expect(validateBenchmarks(e).join()).toMatch(/nope/);
    const f = data();
    f.sources[0].url = 'http://example.com';
    expect(validateBenchmarks(f).join()).toMatch(/https/);
    const g = data();
    g.indicators[0].value = '2.7';
    expect(validateBenchmarks(g).join()).toMatch(/number/);
  });
  it('checks display, previous and year', () => {
    const bad = (mut: (i: any) => void) => {
      const d = data();
      mut(d.indicators.find((i: any) => i.id === 'p-hunger-casual-trend'));
      return validateBenchmarks(d).join();
    };
    expect(bad((i) => (i.display = 5))).toMatch(/display/);
    expect(bad((i) => (i.previous.period = 5))).toMatch(/previous\.period/);
    expect(bad((i) => (i.previous.value = '36'))).toMatch(/previous\.value/);
    expect(bad((i) => (i.year = 1900))).toMatch(/year/);
    expect(bad((i) => (i.year = 2200))).toMatch(/year/);
    expect(bad((i) => delete i.year)).toMatch(/year/);
    expect(bad((i) => { delete i.year; i.dated = true; })).toBe('');
  });
  it('throws when building an invalid dataset', () => {
    const d = data();
    d.indicators[0].sourceId = 'nope';
    expect(() => buildBenchmarks(d)).toThrow();
  });
  it('requires not-found items to carry a known group and text, and research to be a string', () => {
    const d = data();
    d.notFound.push({ group: 'nope', text: 'x' });
    expect(validateBenchmarks(d).join()).toMatch(/notFound/);
    const e = data();
    e.notFound.push('a bare string');
    expect(validateBenchmarks(e).join()).toMatch(/notFound/);
    const f = data();
    f.indicators[0].research = 5;
    expect(validateBenchmarks(f).join()).toMatch(/research/);
  });
});
