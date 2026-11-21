// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ALLOWED_TAXONOMY_PREFIXES } from './lib/overtureFilter.mjs';
import { assertOutsideRepo, buildSql, parseArgs, resolveTaxonomy } from './extract-overture.mjs';

// Only the pure helpers are tested: nothing here runs duckdb or touches the network.
describe('extract-overture helpers', () => {
  it('refuses an output directory inside the repo, accepts one outside', () => {
    expect(() => assertOutsideRepo('/repo/scratch', '/repo')).toThrow(/inside the repo/);
    expect(() => assertOutsideRepo('/repo', '/repo')).toThrow(/inside the repo/);
    expect(() => assertOutsideRepo('/repo/../scratch', '/repo')).not.toThrow();
    expect(() => assertOutsideRepo('/tmp/places', '/repo')).not.toThrow();
  });
  it('uses the committed allow-list when <out>/taxonomy.json is absent or equal, and refuses a different one unless asked', () => {
    expect(resolveTaxonomy(undefined, false)).toBe(ALLOWED_TAXONOMY_PREFIXES);
    expect(resolveTaxonomy(JSON.stringify(ALLOWED_TAXONOMY_PREFIXES), false)).toBe(ALLOWED_TAXONOMY_PREFIXES);
    const other = JSON.stringify([['food_and_drink>restaurant', 'cafe-restaurant']]);
    expect(() => resolveTaxonomy(other, false)).toThrow(/differs from the committed allow-list/);
    expect(resolveTaxonomy(other, true)).toEqual([['food_and_drink>restaurant', 'cafe-restaurant']]);
    expect(parseArgs(['--release', '2026-09-17.0', '--out', '/x', '--allow-taxonomy-override']).allowTaxonomyOverride).toBe(true);
  });
  it('requires --release and --out', () => {
    expect(() => parseArgs([])).toThrow(/usage/);
    expect(() => parseArgs(['--release', '2026-09-17.0'])).toThrow(/usage/);
    expect(parseArgs(['--release', '2026-09-17.0', '--out', '/x'])).toEqual({ release: '2026-09-17.0', out: '/x', parquet: undefined, allowTaxonomyOverride: false });
    expect(parseArgs(['--release', '2026-09-17.0', '--out', '/x', '--parquet', '/p.parquet']).parquet).toBe('/p.parquet');
  });
  it('can refine an earlier bulk-places.json without a release', () => {
    expect(parseArgs(['--from-places', '/a/bulk-places.json', '--out', '/x']).fromPlaces).toBe('/a/bulk-places.json');
    expect(() => parseArgs(['--from-places', '/a/bulk-places.json'])).toThrow(/usage/);
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
