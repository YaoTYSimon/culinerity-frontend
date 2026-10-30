// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildBenchmarks, refreshWarnings, validateBenchmarks, DATA_PATH, OUT_PATH } from './build-benchmarks.mjs';

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
    expect(bad((i) => (i.decimals = 1.5))).toMatch(/decimals/);
    expect(bad((i) => (i.decimals = -1))).toMatch(/decimals/);
    expect(bad((i) => (i.decimals = 1))).toBe('');
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
  describe('refreshAfter', () => {
    const whatif = (d: any) => d.indicators.find((i: any) => i.group === 'whatif');
    it('must be a real YYYY-MM-DD date', () => {
      for (const bad of ['2026-02-30', '2026-13-01', '2026-1-5', 'July 2027', 20270701]) {
        const d = data();
        whatif(d).refreshAfter = bad;
        expect(validateBenchmarks(d).join(), String(bad)).toMatch(/refreshAfter/);
      }
      const ok = data();
      whatif(ok).refreshAfter = '2027-02-28';
      expect(validateBenchmarks(ok)).toEqual([]);
    });
    it('the whatif group is accepted', () => {
      expect(data().indicators.some((i: any) => i.group === 'whatif')).toBe(true);
    });
    it('warns for dates that have passed in Melbourne, and not before', () => {
      const d = data();
      expect(refreshWarnings(d, '2026-10-30')).toEqual([]);
      const w = refreshWarnings(d, '2027-03-22');
      expect(w.length).toBeGreaterThan(0);
      expect(w.join('\n')).toMatch(/w-jobseeker-single/);
      expect(w.join('\n')).not.toMatch(/w-min-wage/);
      expect(refreshWarnings(d, '2026-12-31')).toEqual([]);
      const rentOnly = refreshWarnings(d, '2027-01-01').join('\n');
      expect(rentOnly).toMatch(/w-rent-melb-median/);
      expect(rentOnly).not.toMatch(/w-jobseeker/);
    });
    it('prints a warning with exit 0, and exits non-zero only with --strict', () => {
      const script = fileURLToPath(new URL('./build-benchmarks.mjs', import.meta.url));
      const run = (...args: string[]) => spawnSync('node', [script, '--no-write', ...args], { encoding: 'utf8' });
      const soft = run('--today=2030-01-01');
      expect(soft.status).toBe(0);
      expect(soft.stderr).toMatch(/WARNING/);
      expect(run('--today=2030-01-01', '--strict').status).not.toBe(0);
      expect(run('--today=2026-10-30', '--strict').status).toBe(0);
    });
  });
});
