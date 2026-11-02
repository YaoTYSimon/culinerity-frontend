// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildShards } from './build-places-bulk.mjs';
import { cellKey } from './lib/cells.mjs';
import { runPipeline } from './lib/overtureFilter.mjs';

// TEST DATA ONLY: places come from the invented rows in scripts/fixtures/overture-sample.json.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/overture-sample.json', import.meta.url), 'utf8'));
const places: any[] = runPipeline(fixture.rows, { release: '2026-09-17.0', taxonomy: fixture.taxonomy }).places;
const shards = (files: Record<string, string>) => Object.entries(files).filter(([p]) => p.startsWith('cells/'));

describe('buildShards', () => {
  const { manifest, files } = buildShards(places);

  it('places every place in exactly one shard, the one for its cell', () => {
    const seen: string[] = [];
    for (const [p, body] of shards(files)) {
      const key = p.replace('cells/', '').replace('.json', '');
      for (const s of JSON.parse(body).places) {
        expect(cellKey(s.lat, s.lng)).toBe(key);
        seen.push(s.id);
      }
    }
    expect(seen.sort()).toEqual(places.map((p) => p.id).sort());
    expect(manifest.count).toBe(places.length);
  });

  it('puts a place on a cell edge in the higher cell, deterministically', () => {
    const edge = places.find((p) => p.id === 'ovt-TEST-CELLEDGE');
    expect(cellKey(edge.lat, edge.lng)).toBe('1_7');
    expect(files['cells/1_7.json']).toContain('ovt-TEST-CELLEDGE');
  });

  it('writes sorted, compact, 5-decimal shards without confidence, price or source', () => {
    for (const [, body] of shards(files)) {
      expect(body.endsWith('}\n')).toBe(true);
      const s = JSON.parse(body);
      expect(s.release).toBe('2026-09-17.0');
      expect(s.places.map((p: any) => p.id)).toEqual([...s.places.map((p: any) => p.id)].sort());
      for (const p of s.places) {
        expect(Object.keys(p)).toEqual([...Object.keys(p)].sort());
        expect(p).not.toHaveProperty('confidence');
        expect(p).not.toHaveProperty('price');
        expect(p).not.toHaveProperty('source');
        expect(String(p.lat).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(5);
      }
    }
  });

  it('describes cells, sources and a hash of the shard bytes in key order', () => {
    expect(manifest).toMatchObject({ release: '2026-09-17.0', cellDeg: 0.1, box: { lat: [-38.6, -37.4], lng: [144.3, 145.8] } });
    const keys = Object.keys(manifest.cells);
    expect(keys).toEqual([...keys].sort());
    const h = createHash('sha256');
    for (const k of keys) {
      const body = files[`cells/${k}.json`];
      h.update(body);
      expect(manifest.cells[k]).toEqual({ n: JSON.parse(body).places.length, bytes: Buffer.byteLength(body) });
    }
    expect(manifest.hash).toBe(h.digest('hex'));
    expect(manifest.sources.map((s: any) => s.dataset)).toEqual([...new Set(places.map((p) => p.sourceDataset))].sort());
    expect(JSON.parse(files['manifest.json'])).toEqual(manifest);
  });

  it('is byte-identical on a second run and whatever the input order', () => {
    expect(buildShards(places).files).toEqual(files);
    expect(buildShards([...places].reverse()).files).toEqual(files);
  });

  it('fails when a shard or the total is over budget', () => {
    expect(() => buildShards(places, { maxShardGzip: 100 })).toThrow(/shard .* gzip/);
    expect(() => buildShards(places, { maxTotalGzip: 100 })).toThrow(/total .* gzip/);
    // Incompressible-ish names (hex digests) so one cell goes over the real 60 KB limit.
    const big = Array.from({ length: 4000 }, (_, i) => ({ ...places[0], id: `ovt-BIG-${i}`, name: `Test ${createHash('sha256').update(String(i)).digest('hex')}` }));
    expect(() => buildShards(big)).toThrow(/shard .* gzip/);
  });

  it('refuses an invalid place, and an empty list', () => {
    expect(() => buildShards([{ ...places[0], price: 'budget' }])).toThrow(/price/);
    expect(() => buildShards([])).toThrow(/no places/);
  });
});
