// Draws the stratified verification sample from a bulk-places.json (Task 4.1). Output goes OUTSIDE the repo.
// Run: node scripts/sample-for-verification.mjs --in <bulk-places.json> --seed <int> --out <dir outside the repo> [--fraction 0.05]
// Writes <out>/sample-<seed>.json (what to check) and <out>/strata-<seed>.json (sizes per stratum).
// The checked tier (docs/superpowers/research/2026-10-27-nearby-places.json) is excluded by the 50 m same-name rule.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertOutsideRepo } from './extract-overture.mjs';
import { sampleStrata } from './lib/sample.mjs';
import { stableJson } from './lib/stableJson.mjs';

const CHECKED = fileURLToPath(new URL('../docs/superpowers/research/2026-10-27-nearby-places.json', import.meta.url));

/** Pure: the sample rows (what a human needs to look the place up) and the per-stratum sizes. */
export function buildSample(places, checked, { seed, fraction }) {
  const strata = sampleStrata(places, { seed, fraction, exclude: checked });
  const rows = strata.flatMap((s) =>
    s.places.map((p) => ({
      id: p.id,
      stratum: s.stratum,
      name: p.name,
      kind: p.kind,
      address: p.address,
      ...(p.postcode ? { postcode: p.postcode } : {}),
      ...(p.website ? { website: p.website } : {}),
      lat: p.lat,
      lng: p.lng,
      confidence: p.confidence,
      sourceDataset: p.sourceDataset,
    })),
  );
  return { rows, sizes: strata.map((s) => ({ stratum: s.stratum, size: s.size, sampled: s.places.length })) };
}

export function parseArgs(argv) {
  const get = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
  const input = get('--in');
  const out = get('--out');
  const seed = Number(get('--seed'));
  const fraction = get('--fraction') === undefined ? 0.05 : Number(get('--fraction'));
  if (!input || !out || !Number.isInteger(seed)) throw new Error('usage: node scripts/sample-for-verification.mjs --in <bulk-places.json> --seed <int> --out <dir outside the repo> [--fraction 0.05]');
  return { input, out, seed, fraction };
}

function main() {
  const { input, out, seed, fraction } = parseArgs(process.argv.slice(2));
  assertOutsideRepo(out);
  const places = JSON.parse(readFileSync(input, 'utf8'));
  const checked = JSON.parse(readFileSync(CHECKED, 'utf8')).places.map(({ name, lat, lng }) => ({ name, lat, lng }));
  const { rows, sizes } = buildSample(places, checked, { seed, fraction });
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, `sample-${seed}.json`), stableJson(rows, 1));
  writeFileSync(path.join(out, `strata-${seed}.json`), stableJson(sizes, 1));
  console.log(`Seed ${seed}: ${rows.length} places in ${sizes.length} strata -> ${out}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
