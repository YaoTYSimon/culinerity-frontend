// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildShards, PLACES_DIR } from './build-places-bulk.mjs';
import { checkPlacesBulk } from './check-places-bulk.mjs';
import { runPipeline } from './lib/overtureFilter.mjs';

// TEST DATA ONLY: invented fixture rows, written to a temp directory.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/overture-sample.json', import.meta.url), 'utf8'));
const places = runPipeline(fixture.rows, { release: '2026-09-17.0', taxonomy: fixture.taxonomy }).places;
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function written() {
  const dir = mkdtempSync(path.join(tmpdir(), 'places-bulk-'));
  dirs.push(dir);
  mkdirSync(path.join(dir, 'cells'));
  const { files, manifest } = buildShards(places);
  for (const [rel, body] of Object.entries(files)) writeFileSync(path.join(dir, rel), body);
  const firstKey = Object.keys(manifest.cells)[0];
  return { dir, manifest, firstKey, shardPath: path.join(dir, 'cells', `${firstKey}.json`) };
}
const edit = (file: string, fn: (j: any) => void) => {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  fn(j);
  writeFileSync(file, JSON.stringify(j) + '\n');
};

describe('checkPlacesBulk', () => {
  it('passes a freshly built set', () => {
    expect(checkPlacesBulk(written().dir).errors).toEqual([]);
  });
  it('passes and says so when there is no manifest', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'places-bulk-'));
    dirs.push(dir);
    expect(checkPlacesBulk(dir)).toEqual({ errors: [], message: 'no bulk places yet' });
  });
  it('passes on the repo as it is today', () => {
    expect(checkPlacesBulk(PLACES_DIR).errors).toEqual([]);
  });
  it('fails when the manifest cellDeg, box or a source licence is not the one the app uses', () => {
    let { dir } = written();
    edit(path.join(dir, 'manifest.json'), (m) => (m.cellDeg = 0.02));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/cellDeg/);
    ({ dir } = written());
    edit(path.join(dir, 'manifest.json'), (m) => (m.box = { lat: [-38, -37], lng: [144, 145] }));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/box/);
    ({ dir } = written());
    edit(path.join(dir, 'manifest.json'), (m) => (m.sources[0].licence = 'GPL-3.0'));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/licence/);
  });
  it('fails on a hash mismatch', () => {
    const { dir } = written();
    edit(path.join(dir, 'manifest.json'), (m) => (m.hash = '0'.repeat(64)));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/hash/);
  });
  it('fails when a shard count differs from the manifest', () => {
    const { dir, shardPath } = written();
    edit(shardPath, (s) => s.places.pop());
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/manifest says/);
  });
  it('fails when a place names a dataset the manifest does not list', () => {
    const { dir, shardPath } = written();
    edit(shardPath, (s) => (s.places[0].sourceDataset = 'TestUnlisted'));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/not in the manifest sources/);
  });
  it('fails on a shard file the manifest does not list', () => {
    const { dir } = written();
    writeFileSync(path.join(dir, 'cells', '99_99.json'), '{}\n');
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/99_99.json is not listed/);
  });
  it('fails on a listed shard that is missing', () => {
    const { dir, shardPath } = written();
    rmSync(shardPath);
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/missing/);
  });
  it('fails when a shard place does not pass validateBulkPlace', () => {
    const { dir, shardPath } = written();
    edit(shardPath, (s) => (s.places[0].licence = 'GPL-3.0'));
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/licence/);
  });
  it('fails when a place sits in the wrong cell', () => {
    const { dir, shardPath } = written();
    edit(shardPath, (s) => ((s.places[0].lat = -37.41), (s.places[0].lng = 145.79))); // cell 14_11, never the first shard
    expect(checkPlacesBulk(dir).errors.join()).toMatch(/belongs in cell/);
  });
});
