// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertOutsideRepo, buildSql, parseArgs } from './extract-overture.mjs';

// Only the pure helpers are tested: nothing here runs duckdb or touches the network.
describe('extract-overture helpers', () => {
  it('refuses an output directory inside the repo, accepts one outside', () => {
    expect(() => assertOutsideRepo('/repo/scratch', '/repo')).toThrow(/inside the repo/);
    expect(() => assertOutsideRepo('/repo', '/repo')).toThrow(/inside the repo/);
    expect(() => assertOutsideRepo('/repo/../scratch', '/repo')).not.toThrow();
    expect(() => assertOutsideRepo('/tmp/places', '/repo')).not.toThrow();
  });
  it('requires --release and --out', () => {
    expect(() => parseArgs([])).toThrow(/usage/);
    expect(() => parseArgs(['--release', '2026-09-17.0'])).toThrow(/usage/);
    expect(parseArgs(['--release', '2026-09-17.0', '--out', '/x'])).toEqual({ release: '2026-09-17.0', out: '/x', parquet: undefined });
    expect(parseArgs(['--release', '2026-09-17.0', '--out', '/x', '--parquet', '/p.parquet']).parquet).toBe('/p.parquet');
  });
  it('pins the release and the Greater Melbourne box in the query, and rejects a bad release', () => {
    const sql = buildSql('2026-09-17.0');
    expect(sql).toContain('release/2026-09-17.0/theme=places');
    expect(sql).toContain('BETWEEN 144.3 AND 145.8');
    expect(sql).toContain('BETWEEN -38.6 AND -37.4');
    expect(() => buildSql("x'; drop")).toThrow(/bad release/);
  });
  it('can read a local parquet copy instead of S3', () => {
    const sql = buildSql('2026-09-17.0', "/tmp/a'b.parquet");
    expect(sql).toContain("read_parquet('/tmp/a''b.parquet')");
    expect(sql).not.toContain('s3://');
    expect(sql).toContain('BETWEEN 144.3 AND 145.8');
  });
});
