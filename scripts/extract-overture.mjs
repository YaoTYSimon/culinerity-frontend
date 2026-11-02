// Scratch extraction of Greater Melbourne food places from a pinned Overture Places release.
// NOT run in CI and NOT run until the user has approved the download and installed duckdb (plan Task 2.1).
// Run: node scripts/extract-overture.mjs --release <id> --out <scratch dir outside the repo> [--parquet <local file>]
// --parquet reads a local copy (made once with the same bbox from Overture's public bucket) instead of streaming S3 again.
// Writes <out>/bulk-places.json and <out>/drop-counts.json. The raw rows are never written inside the repo.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from './lib/overtureFilter.mjs';
import { stableJson } from './lib/stableJson.mjs';
import { BULK_BOX } from './lib/validateBulk.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

/** The DuckDB query. The release id is pinned by the caller; bbox values are point features, so min values suffice. */
export function buildSql(release, parquet) {
  if (!/^\d{4}-\d{2}-\d{2}(\.\d+)?$/.test(release)) throw new Error(`bad release id "${release}"`);
  const [latLo, latHi] = BULK_BOX.lat;
  const [lngLo, lngHi] = BULK_BOX.lng;
  return [
    ...(parquet ? [] : ["INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';"]),
    'SELECT id, bbox.xmin AS lng, bbox.ymin AS lat, names, taxonomy, confidence, operating_status, addresses, websites, sources',
    parquet
      ? `FROM read_parquet('${parquet.replace(/'/g, "''")}')`
      : `FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)`,
    `WHERE bbox.xmin BETWEEN ${lngLo} AND ${lngHi} AND bbox.ymin BETWEEN ${latLo} AND ${latHi}`,
    'ORDER BY id;',
  ].join('\n');
}

/** Refuses an output directory inside the repo: raw datasets must never land there. */
export function assertOutsideRepo(out, root = repoRoot) {
  const rel = path.relative(path.resolve(root), path.resolve(out));
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) throw new Error(`--out ${out} is inside the repo; use a scratch directory outside it`);
}

export function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const release = get('--release');
  const out = get('--out');
  const parquet = get('--parquet');
  if (!release || !out) throw new Error('usage: node scripts/extract-overture.mjs --release <id> --out <dir outside the repo> [--parquet <local copy of the bbox rows of that release>]');
  return { release, out, parquet };
}

function main() {
  const { release, out, parquet } = parseArgs(process.argv.slice(2));
  assertOutsideRepo(out);
  mkdirSync(out, { recursive: true });
  const sql = buildSql(release, parquet);
  console.log(`Running: duckdb -json -c "<sql>"\n${sql}`);
  const rows = JSON.parse(execFileSync('duckdb', ['-no-agent', '-json', '-c', sql], { maxBuffer: 1 << 30, encoding: 'utf8' }));
  const taxonomyPath = path.join(out, 'taxonomy.json');
  // Task 2.1 writes the measured allow-list here as [[prefix, kind], ...]; until then the default (empty) keeps nothing.
  let taxonomy;
  try {
    taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf8'));
  } catch {
    taxonomy = undefined;
  }
  const { places, dropCounts, duplicates } = runPipeline(rows, { release, taxonomy });
  writeFileSync(path.join(out, 'bulk-places.json'), stableJson(places, 1));
  writeFileSync(path.join(out, 'drop-counts.json'), stableJson({ release, input: rows.length, kept: places.length, duplicates, dropped: dropCounts }, 2));
  console.log(`Read ${rows.length}, kept ${places.length}, duplicates ${duplicates}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
