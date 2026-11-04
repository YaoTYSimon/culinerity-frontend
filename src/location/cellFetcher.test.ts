import { describe, expect, it, vi } from 'vitest';
import { loadBulkFor } from '@culinerity/core';
import { createBulkSource } from './cellFetcher';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const MANIFEST = { release: '2026-10-21.0', cells: { '44_52': { n: 1 }, '44_53': { n: 1 } } };
const SHARD = { release: '2026-10-21.0', places: [{ id: 'ovt-a', name: 'A', kind: 'bakery', lat: -37.8, lng: 144.96, address: '1 A St', sourceDataset: 'meta', licence: 'CDLA-Permissive-2.0' }] };

describe('createBulkSource', () => {
  it('every request is the manifest or a cell path, credentials omitted, no referrer, no coordinate', async () => {
    const f = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => ok(String(url).endsWith('manifest.json') ? MANIFEST : SHARD));
    const src = createBulkSource(f as unknown as typeof fetch);
    const m = (await src.manifest())!;
    await loadBulkFor({ lat: -37.8136, lng: 144.9631 }, src.cell(m));
    expect(f.mock.calls.length).toBeGreaterThan(1);
    for (const [url, init] of f.mock.calls) {
      expect(String(url)).toMatch(/^\/places\/(manifest|cells\/\d+_\d+)\.json$/);
      expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    }
  });
  it('does not request a cell the manifest does not list', async () => {
    const f = vi.fn(async () => ok(SHARD));
    const src = createBulkSource(f as unknown as typeof fetch);
    const cell = src.cell(MANIFEST);
    expect(await cell('0_0')).toEqual({ release: MANIFEST.release, places: [] });
    expect(f).not.toHaveBeenCalled();
    await cell('44_52');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('is absent (null, no throw) for a 404, a network error, HTML, or a non-manifest', async () => {
    for (const f of [
      async () => ({ ok: false, status: 404 }) as Response,
      async () => { throw new TypeError('offline'); },
      async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('<!doctype'); } }) as unknown as Response,
      async () => ok({ nope: 1 }),
    ]) expect(await createBulkSource(f as unknown as typeof fetch).manifest()).toBeNull();
  });
  it('a failing cell rejects so the loader reports it', async () => {
    const f = vi.fn(async (url: RequestInfo | URL) => String(url).includes('44_52') ? ({ ok: false, status: 500 }) as Response : ok(String(url).endsWith('manifest.json') ? MANIFEST : SHARD));
    const src = createBulkSource(f as unknown as typeof fetch);
    const load = await loadBulkFor({ lat: -37.8136, lng: 144.9631 }, src.cell((await src.manifest())!));
    expect(load.failedCells).toContain('44_52');
  });
  it('does not keep a failed manifest fetch: the next call tries again, up to a small limit', async () => {
    let n = 0;
    const f = vi.fn(async () => { if (n++ < 10) throw new TypeError('offline'); return ok(MANIFEST); });
    const src = createBulkSource(f as unknown as typeof fetch);
    expect(await src.manifest()).toBeNull();
    expect(await src.manifest()).toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
    expect(await src.manifest()).toBeNull();
    expect(await src.manifest()).toBeNull();
    const calls = f.mock.calls.length;
    expect(await src.manifest()).toBeNull();
    expect(f.mock.calls.length).toBe(calls); // limit reached, no more requests
  });
  it('a manifest that loads after an earlier failure is kept', async () => {
    let n = 0;
    const f = vi.fn(async () => { if (n++ === 0) throw new TypeError('offline'); return ok(MANIFEST); });
    const src = createBulkSource(f as unknown as typeof fetch);
    expect(await src.manifest()).toBeNull();
    expect(await src.manifest()).toEqual(MANIFEST);
    await src.manifest();
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('a manifest that is not published (404 or not a manifest) stays cached as absent', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 404 }) as Response);
    const src = createBulkSource(f as unknown as typeof fetch);
    await src.manifest(); await src.manifest();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('asks for the manifest once', async () => {
    const f = vi.fn(async () => ok(MANIFEST));
    const src = createBulkSource(f as unknown as typeof fetch);
    await src.manifest(); await src.manifest();
    expect(f).toHaveBeenCalledTimes(1);
  });
});
