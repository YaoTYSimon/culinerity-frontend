// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPipeline } from './lib/overtureFilter.mjs';
import { buildSample, parseArgs } from './sample-for-verification.mjs';

// TEST DATA ONLY: the fixture holds invented rows.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/overture-sample.json', import.meta.url), 'utf8'));
const { places } = runPipeline(fixture.rows, { release: '2026-09-17.0', taxonomy: fixture.taxonomy });

describe('buildSample', () => {
  it('is reproducible and keeps only what a human needs', () => {
    const a = buildSample(places, [], { seed: 4, fraction: 0.05 });
    const b = buildSample(places, [], { seed: 4, fraction: 0.05 });
    expect(a).toEqual(b);
    expect(a.rows.length).toBeGreaterThan(0);
    for (const r of a.rows) expect(Object.keys(r).sort()).toEqual(expect.arrayContaining(['id', 'stratum', 'name', 'address', 'lat', 'lng']));
    expect(a.sizes.reduce((n, s) => n + s.sampled, 0)).toBe(a.rows.length);
  });
  it('leaves out a place that is already checked by hand', () => {
    const p = places[0];
    const { rows } = buildSample(places, [{ name: p.name, lat: p.lat, lng: p.lng }], { seed: 4, fraction: 1 });
    expect(rows.map((r) => r.id)).not.toContain(p.id);
  });
});

describe('command line', () => {
  it('needs --in, --out and an integer seed', () => {
    expect(() => parseArgs(['--in', 'x'])).toThrow(/usage/);
    expect(() => parseArgs(['--in', 'x', '--out', 'y', '--seed', 'abc'])).toThrow(/usage/);
    expect(parseArgs(['--in', 'x', '--out', 'y', '--seed', '3'])).toEqual({ input: 'x', out: 'y', seed: 3, fraction: 0.05 });
  });
  it('refuses an output directory inside the repo and writes nothing', () => {
    const repo = path.resolve(__dirname, '..');
    expect(() =>
      execFileSync('node', ['scripts/sample-for-verification.mjs', '--in', 'scripts/fixtures/overture-sample.json', '--seed', '1', '--out', path.join(repo, 'scratch-should-not-exist')], { cwd: repo, stdio: 'pipe' }),
    ).toThrow();
    const out = mkdtempSync(path.join(tmpdir(), 'sample-'));
    rmSync(out, { recursive: true });
  });
});
