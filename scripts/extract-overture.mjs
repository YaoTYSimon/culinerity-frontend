// Scratch extraction of Greater Melbourne food places from a pinned Overture Places release.
// NOT run in CI and NOT run until the user has approved the download and installed duckdb (plan Task 2.1).
// Run: node scripts/extract-overture.mjs --release <id> --out <scratch dir outside the repo> [--parquet <local file>]
// --parquet reads a local copy (made once with the same bbox from Overture's public bucket) instead of streaming S3 again.
// Writes <out>/bulk-places.json and <out>/drop-counts.json. The raw rows are never written inside the repo.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_TAXONOMY_PREFIXES, refinePlaces, runPipeline } from './lib/overtureFilter.mjs';
import { stableJson } from './lib/stableJson.mjs';
import { applySuppress } from './lib/suppress.mjs';
import { BULK_BOX } from './lib/validateBulk.mjs';

const SUPPRESS = fileURLToPath(new URL('./suppress.json', import.meta.url));
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
  const fromPlaces = get('--from-places');
  if (!out || (!release && !fromPlaces)) throw new Error('usage: node scripts/extract-overture.mjs --release <id> --out <dir outside the repo> [--parquet <local copy of the bbox rows of that release>] [--allow-taxonomy-override]\n   or: node scripts/extract-overture.mjs --from-places <bulk-places.json from an earlier run> --out <dir outside the repo>');
  return { release, out, parquet, fromPlaces, allowTaxonomyOverride: argv.includes('--allow-taxonomy-override') };
}

/**
 * The allow-list to use. The committed one (ALLOWED_TAXONOMY_PREFIXES) unless <out>/taxonomy.json exists; a file that
 * differs from the committed list is refused unless --allow-taxonomy-override is given, so output is reproducible from the repo.
 */
export function resolveTaxonomy(fileText, allowOverride) {
  if (fileText === undefined) return ALLOWED_TAXONOMY_PREFIXES;
  const parsed = JSON.parse(fileText);
  if (JSON.stringify(parsed) === JSON.stringify(ALLOWED_TAXONOMY_PREFIXES)) return ALLOWED_TAXONOMY_PREFIXES;
  if (!allowOverride) throw new Error('<out>/taxonomy.json differs from the committed allow-list (scripts/lib/overtureFilter.mjs). Delete it, or pass --allow-taxonomy-override to use it on purpose.');
  return parsed;
}

/** Re-runs only the quality stage (name and address rules, shared points, de-duplication) on an earlier bulk-places.json. */
function refineExisting(fromPlaces, out) {
  const before = JSON.parse(readFileSync(fromPlaces, 'utf8'));
  const r = refinePlaces(before);
  const { places, suppressed, warnings } = applySuppress(r.places, JSON.parse(readFileSync(SUPPRESS, 'utf8')), r.dedupedIds);
  for (const w of warnings) console.warn(`warning: ${w}`);
  const byId = new Map(before.map((p) => [p.id, p]));
  const brief = (id) => ({ id, name: byId.get(id).name, address: byId.get(id).address, kind: byId.get(id).kind });
  writeFileSync(path.join(out, 'bulk-places.json'), stableJson(places, 1));
  writeFileSync(path.join(out, 'quality-dropped.json'), stableJson(r.dropped.map((d) => ({ ...brief(d.id), reason: d.reason })), 1));
  writeFileSync(path.join(out, 'duplicates-removed.json'), stableJson(r.removed.map((d) => ({ ...brief(d.id), of: brief(d.of), rule: d.rule })), 1));
  writeFileSync(path.join(out, 'drop-counts.json'), stableJson({ release: before[0]?.release, input: before.length, kept: places.length, duplicates: r.duplicates, duplicateRules: r.duplicateRules, suppressed, dropped: r.dropCounts }, 2));
  console.log(`Read ${before.length}, kept ${places.length}, quality drops ${JSON.stringify(r.dropCounts)}, duplicates ${r.duplicates} ${JSON.stringify(r.duplicateRules)}, suppressed ${suppressed}.`);
}

function main() {
  const { release, out, parquet, fromPlaces, allowTaxonomyOverride } = parseArgs(process.argv.slice(2));
  assertOutsideRepo(out);
  mkdirSync(out, { recursive: true });
  if (fromPlaces) return refineExisting(fromPlaces, out);
  const sql = buildSql(release, parquet);
  console.log(`Running: duckdb -json -c "<sql>"\n${sql}`);
  const rows = JSON.parse(execFileSync('duckdb', ['-no-agent', '-json', '-c', sql], { maxBuffer: 1 << 30, encoding: 'utf8' }));
  const taxonomyPath = path.join(out, 'taxonomy.json');
  let fileText;
  try {
    fileText = readFileSync(taxonomyPath, 'utf8');
  } catch {
    fileText = undefined;
  }
  const taxonomy = resolveTaxonomy(fileText, allowTaxonomyOverride);
  const piped = runPipeline(rows, { release, taxonomy });
  const { dropCounts, duplicates, duplicateRules } = piped;
  // Reported problems (scripts/suppress.json) are removed here; an id not in the data fails the run (one that de-duplication removed only warns).
  const { places, suppressed, warnings } = applySuppress(piped.places, JSON.parse(readFileSync(SUPPRESS, 'utf8')), piped.dedupedIds);
  for (const w of warnings) console.warn(`warning: ${w}`);
  writeFileSync(path.join(out, 'bulk-places.json'), stableJson(places, 1));
  writeFileSync(path.join(out, 'drop-counts.json'), stableJson({ release, input: rows.length, kept: places.length, duplicates, duplicateRules, suppressed, dropped: dropCounts }, 2));
  console.log(`Read ${rows.length}, kept ${places.length}, duplicates ${duplicates}, suppressed ${suppressed}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
