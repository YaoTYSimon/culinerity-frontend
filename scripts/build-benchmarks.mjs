// Generates packages/core/src/benchmarks/generated/benchmarks.generated.ts
// from docs/superpowers/research/2026-10-26-food-security-data.json.
// Run: npm run build:benchmarks
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
export const DATA_PATH = fileURLToPath(new URL('docs/superpowers/research/2026-10-26-food-security-data.json', root));
export const OUT_PATH = fileURLToPath(new URL('packages/core/src/benchmarks/generated/benchmarks.generated.ts', root));

const VERIFICATION = ['primary', 'secondary', 'press'];
const GROUPS = ['budget', 'policy', 'whatif'];
// notFound items belong to a screen; the what-if screen has none.
const NOTFOUND_GROUPS = ['budget', 'policy'];
const EVIDENCE = ['moderate', 'weak', 'mixed', 'strong'];

/** True for a real calendar date written YYYY-MM-DD (rejects 2026-02-30). */
function isIsoDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === v;
}

/** Today's calendar date in Melbourne (YYYY-MM-DD), the same rule as the cultural and places builders. */
export function melbourneToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Returns a list of problems; empty when the dataset is sound. */
export function validateBenchmarks(d) {
  const errs = [];
  const sourceIds = new Set();
  for (const s of d.sources ?? []) {
    if (sourceIds.has(s.id)) errs.push(`duplicate source id ${s.id}`);
    sourceIds.add(s.id);
    if (typeof s.url !== 'string' || !s.url.startsWith('https://')) errs.push(`source ${s.id} url must be https`);
  }
  const checkSource = (what, id, sourceId) => {
    if (!sourceIds.has(sourceId)) errs.push(`${what} ${id} references unknown source ${sourceId}`);
  };
  const seen = new Set();
  for (const i of d.indicators ?? []) {
    if (seen.has(i.id)) errs.push(`duplicate indicator id ${i.id}`);
    seen.add(i.id);
    checkSource('indicator', i.id, i.sourceId);
    if (!GROUPS.includes(i.group)) errs.push(`indicator ${i.id} has bad group`);
    if (!VERIFICATION.includes(i.verification)) errs.push(`indicator ${i.id} has bad verification`);
    if (i.year === undefined) {
      if (i.dated !== true) errs.push(`indicator ${i.id} year is required unless dated`);
    } else if (!Number.isInteger(i.year) || i.year < 1990 || i.year > 2100) {
      errs.push(`indicator ${i.id} year must be an integer from 1990 to 2100`);
    }
    if (i.refreshAfter !== undefined && !isIsoDate(i.refreshAfter)) errs.push(`indicator ${i.id} refreshAfter must be a real YYYY-MM-DD date`);
    if (i.research !== undefined && typeof i.research !== 'string') errs.push(`indicator ${i.id} research must be a string`);
    if (i.display !== undefined && typeof i.display !== 'string') errs.push(`indicator ${i.id} display must be a string`);
    if (i.decimals !== undefined && (!Number.isInteger(i.decimals) || i.decimals < 0 || i.decimals > 4 || typeof i.value !== 'number')) {
      errs.push(`indicator ${i.id} decimals must be an integer from 0 to 4 on a numeric value`);
    }
    if (i.value === null) {
      if (!i.display) errs.push(`indicator ${i.id} has null value without display`);
    } else if (typeof i.value !== 'number' || !Number.isFinite(i.value)) {
      errs.push(`indicator ${i.id} value must be a number or null`);
    }
    if (i.previous) {
      if (typeof i.previous.value !== 'number' || !Number.isFinite(i.previous.value)) errs.push(`indicator ${i.id} previous.value must be a number`);
      if (typeof i.previous.period !== 'string') errs.push(`indicator ${i.id} previous.period must be a string`);
    }
  }
  for (const a of d.areas ?? []) {
    checkSource('area', a.name, a.sourceId);
    if (typeof a.seifaIrsdScore !== 'number') errs.push(`area ${a.name} score must be a number`);
    if ('lga' in a) errs.push(`area ${a.name} must not carry lga`);
  }
  for (const v of d.interventions ?? []) {
    checkSource('intervention', v.id, v.sourceId);
    if (!EVIDENCE.includes(v.evidence)) errs.push(`intervention ${v.id} has bad evidence`);
    if (v.costPerPersonAud !== null && typeof v.costPerPersonAud !== 'number') errs.push(`intervention ${v.id} cost must be a number or null`);
  }
  if (!Array.isArray(d.caveats) || d.caveats.some((x) => typeof x !== 'string')) errs.push('caveats must be a list of strings');
  if (!Array.isArray(d.notFound) || d.notFound.some((n) => !n || !NOTFOUND_GROUPS.includes(n.group) || typeof n.text !== 'string' || n.text === '')) {
    errs.push('notFound must be a list of { group, text } items with a known group');
  }
  return errs;
}

/** One plain line per indicator whose `refreshAfter` is before `today`. A reminder, never a build error. */
export function refreshWarnings(d, today = melbourneToday()) {
  return (d.indicators ?? [])
    .filter((i) => typeof i.refreshAfter === 'string' && i.refreshAfter < today)
    .map((i) => `WARNING: ${i.id} was due for a re-read after ${i.refreshAfter} (today is ${today}). Re-read its source and update it: see "Refreshing" in docs/superpowers/research/README.md.`);
}

export function buildBenchmarks(d) {
  const errs = validateBenchmarks(d);
  if (errs.length) throw new Error(`Invalid benchmark dataset:\n- ${errs.join('\n- ')}`);
  const data = {
    generatedAt: d.generatedAt,
    sources: d.sources,
    indicators: d.indicators,
    areas: d.areas,
    interventions: d.interventions,
    caveats: d.caveats,
    notFound: d.notFound,
  };
  return (
    '// GENERATED by scripts/build-benchmarks.mjs from docs/superpowers/research/2026-10-26-food-security-data.json.\n' +
    '// Do not edit by hand; run `npm run build:benchmarks`.\n' +
    "import type { BenchmarkData } from '../types';\n\n" +
    `export const benchmarkData: BenchmarkData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const text = buildBenchmarks(raw);
  if (!args.includes('--no-write')) {
    writeFileSync(OUT_PATH, text);
    console.log(`Wrote ${OUT_PATH}`);
  }
  const todayArg = args.find((a) => a.startsWith('--today='));
  const warnings = refreshWarnings(raw, todayArg ? todayArg.slice('--today='.length) : melbourneToday());
  for (const w of warnings) console.warn(w);
  if (warnings.length && args.includes('--strict')) process.exit(1);
}
