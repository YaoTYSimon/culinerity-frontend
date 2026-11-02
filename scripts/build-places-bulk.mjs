// Builds same-origin place shards and a manifest from bulk-places.json (the output of extract-overture.mjs).
// Run: npm run build:places-bulk -- --in <scratch>/bulk-places.json   (writes public/places/)
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { CELL_DEG, cellKey } from './lib/cells.mjs';
import { stableJson } from './lib/stableJson.mjs';
import { BULK_BOX, validateBulkPlaces } from './lib/validateBulk.mjs';

export const PLACES_DIR = fileURLToPath(new URL('../public/places/', import.meta.url));
export const MAX_SHARD_GZIP = 60 * 1024;
export const MAX_TOTAL_GZIP = 2 * 1024 * 1024;
// Unconfirmed: check the page when the real run happens (plan Task 2.1).
export const OVERTURE_ATTRIBUTION_URL = 'https://docs.overturemaps.org/attribution/';

const round5 = (n) => Math.round(n * 1e5) / 1e5;
const gz = (s) => gzipSync(Buffer.from(s)).length;

/** The fields a shard ships. `confidence`, `source`, `price` and `release` are not repeated per place. */
export function shardPlace(p) {
  const out = { id: p.id, name: p.name, kind: p.kind, lat: round5(p.lat), lng: round5(p.lng), address: p.address, suburb: p.suburb, sourceDataset: p.sourceDataset, licence: p.licence };
  if (p.website !== undefined) out.website = p.website;
  return out;
}

/** Pure: validated places -> `{ manifest, files }` where files maps a path under public/places/ to its text. */
export function buildShards(places, { maxShardGzip = MAX_SHARD_GZIP, maxTotalGzip = MAX_TOTAL_GZIP } = {}) {
  if (places.length === 0) throw new Error('no places to build');
  const problems = validateBulkPlaces(places);
  if (problems.length) throw new Error(`invalid places:\n${problems.slice(0, 20).join('\n')}`);
  const release = places[0].release;
  const byCell = new Map();
  for (const p of [...places].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const key = cellKey(p.lat, p.lng);
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(shardPlace(p));
  }
  const files = {};
  const cells = {};
  const hash = createHash('sha256');
  let total = 0;
  for (const key of [...byCell.keys()].sort()) {
    const body = stableJson({ release, places: byCell.get(key) });
    const size = gz(body);
    if (size > maxShardGzip) throw new Error(`shard ${key} is ${size} bytes gzip, over the ${maxShardGzip} limit`);
    total += size;
    files[`cells/${key}.json`] = body;
    cells[key] = { n: byCell.get(key).length, bytes: Buffer.byteLength(body) };
    hash.update(body);
  }
  if (total > maxTotalGzip) throw new Error(`total ${total} bytes gzip, over the ${maxTotalGzip} limit`);
  const datasets = new Map(places.map((p) => [p.sourceDataset, p.licence]));
  const manifest = {
    release,
    cellDeg: CELL_DEG,
    box: BULK_BOX,
    count: places.length,
    cells,
    sources: [...datasets.keys()].sort().map((dataset) => ({ dataset, licence: datasets.get(dataset), url: OVERTURE_ATTRIBUTION_URL })),
    hash: hash.digest('hex'),
  };
  files['manifest.json'] = stableJson(manifest, 2);
  return { manifest, files };
}

/** Writes the files, removing shards from an earlier build that no longer exist. */
function writeOut(files, dir) {
  mkdirSync(path.join(dir, 'cells'), { recursive: true });
  for (const f of readdirSync(path.join(dir, 'cells'))) if (!(`cells/${f}` in files)) rmSync(path.join(dir, 'cells', f));
  for (const [rel, body] of Object.entries(files)) writeFileSync(path.join(dir, rel), body);
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (flag, dflt) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : dflt);
  const input = arg('--in');
  if (!input) throw new Error('usage: npm run build:places-bulk -- --in <bulk-places.json> [--out <dir>]');
  const { manifest, files } = buildShards(JSON.parse(readFileSync(input, 'utf8')));
  writeOut(files, arg('--out', PLACES_DIR));
  console.log(`Wrote ${manifest.count} places in ${Object.keys(manifest.cells).length} shards (release ${manifest.release}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
