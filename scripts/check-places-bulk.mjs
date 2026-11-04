// Checks public/places/ is internally consistent: manifest hash and counts, listed shards only, known sources, sound places.
// Run: npm run check:places-bulk   (also covered by npm test)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACES_DIR } from './build-places-bulk.mjs';
import { CELL_DEG, cellKey } from './lib/cells.mjs';
import { BULK_BOX, BULK_LICENCE_LIST, validateBulkPlace } from './lib/validateBulk.mjs';

/** `{ errors, message }`. An absent manifest is fine: no bulk places have been shipped yet. */
export function checkPlacesBulk(dir = PLACES_DIR) {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return { errors: [], message: 'no bulk places yet' };
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { errors: [`manifest.json is not valid JSON: ${e.message}`], message: '' };
  }
  if (manifest.cellDeg !== CELL_DEG) errors.push(`manifest cellDeg ${manifest.cellDeg} is not ${CELL_DEG}, the size the app uses`);
  if (JSON.stringify(manifest.box) !== JSON.stringify(BULK_BOX)) errors.push(`manifest box ${JSON.stringify(manifest.box)} is not the Greater Melbourne box ${JSON.stringify(BULK_BOX)}`);
  for (const s of manifest.sources ?? []) if (!BULK_LICENCE_LIST.includes(s.licence)) errors.push(`manifest source "${s.dataset}" has licence "${s.licence}", not one of ${BULK_LICENCE_LIST.join(', ')}`);
  const cellsDir = path.join(dir, 'cells');
  const onDisk = existsSync(cellsDir) ? readdirSync(cellsDir).filter((f) => !f.startsWith('.')) : [];
  const listed = Object.keys(manifest.cells ?? {}).sort();
  for (const f of onDisk) if (!listed.includes(f.replace(/\.json$/, ''))) errors.push(`cells/${f} is not listed in the manifest`);
  const datasets = new Set((manifest.sources ?? []).map((s) => s.dataset));
  const hash = createHash('sha256');
  let count = 0;
  for (const key of listed) {
    const file = path.join(cellsDir, `${key}.json`);
    if (!existsSync(file)) {
      errors.push(`cells/${key}.json is listed in the manifest but missing`);
      continue;
    }
    const body = readFileSync(file);
    hash.update(body);
    let shard;
    try {
      shard = JSON.parse(body.toString('utf8'));
    } catch {
      errors.push(`cells/${key}.json is not valid JSON`);
      continue;
    }
    const places = shard.places ?? [];
    count += places.length;
    if (places.length !== manifest.cells[key].n) errors.push(`cells/${key}.json has ${places.length} places, the manifest says ${manifest.cells[key].n}`);
    if (shard.release !== manifest.release) errors.push(`cells/${key}.json is release ${shard.release}, the manifest says ${manifest.release}`);
    for (const p of places) {
      if (!datasets.has(p.sourceDataset)) errors.push(`${p.id}: sourceDataset "${p.sourceDataset}" is not in the manifest sources`);
      if (cellKey(p.lat, p.lng) !== key) errors.push(`${p.id}: belongs in cell ${cellKey(p.lat, p.lng)}, not ${key}`);
      // Fields a shard leaves out are re-added as the loader does; confidence is not shipped, so only the floor is waived.
      const full = { ...p, price: 'unknown', source: 'overture', release: shard.release, confidence: 1 };
      for (const e of validateBulkPlace(full)) errors.push(`${p.id}: ${e}`);
    }
  }
  if (hash.digest('hex') !== manifest.hash) errors.push('manifest hash does not match the shard bytes');
  if (count !== manifest.count) errors.push(`manifest count ${manifest.count} but shards hold ${count}`);
  return { errors, message: `${count} bulk places in ${listed.length} shards (release ${manifest.release})` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, message } = checkPlacesBulk();
  if (errors.length) {
    console.error(`places-bulk check failed:\n${errors.join('\n')}`);
    process.exit(1);
  }
  console.log(`places-bulk ok: ${message}`);
}
