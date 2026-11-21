// Generates packages/core/src/foodsafety/generated/foodsafety.generated.ts
// from docs/superpowers/research/2026-11-21-food-safety.json.
// Run: npm run build:foodsafety
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
export const DATA_PATH = fileURLToPath(new URL('docs/superpowers/research/2026-11-21-food-safety.json', root));
export const OUT_PATH = fileURLToPath(new URL('packages/core/src/foodsafety/generated/foodsafety.generated.ts', root));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const realDate = (s) => ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const OFFICIAL_HOSTS = ['betterhealth.vic.gov.au', 'health.vic.gov.au', 'safefood.vic.gov.au', 'foodstandards.gov.au'];

/**
 * The "no invented numbers" rule: every run of digits in a line must be listed in that line's `figures`,
 * and every listed figure must appear in the `read` notes of a source the line cites.
 */
export function validateFoodSafety(d, today = '2026-11-21') {
  const errors = [];
  const err = (m) => errors.push(m);
  const sources = new Map();
  for (const s of d.sources ?? []) {
    if (!SLUG.test(s.id ?? '')) err(`source id "${s.id}" is not a slug`);
    if (sources.has(s.id)) err(`duplicate source ${s.id}`);
    sources.set(s.id, s);
    let host = '';
    try {
      const u = new URL(s.url);
      host = u.hostname;
      if (u.protocol !== 'https:') err(`source ${s.id}: url must be https`);
    } catch {
      err(`source ${s.id}: bad url`);
    }
    if (!OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) err(`source ${s.id}: ${host} is not an official host used for this dataset`);
    if (!nonEmpty(s.title) || !nonEmpty(s.publisher)) err(`source ${s.id}: needs a title and publisher`);
    if (!nonEmpty(s.licence)) err(`source ${s.id}: needs licence wording`);
    if (!realDate(s.accessed)) err(`source ${s.id}: accessed must be a real YYYY-MM-DD date`);
    else if (s.accessed > today) err(`source ${s.id}: accessed is in the future`);
    if (s.reviewed !== undefined && !realDate(s.reviewed)) err(`source ${s.id}: reviewed, when the page gives one, must be a real YYYY-MM-DD date`);
    if (!Array.isArray(s.read) || s.read.length === 0 || s.read.some((r) => !nonEmpty(r))) err(`source ${s.id}: needs read notes`);
  }
  if (!realDate(d.checked ?? '')) err('checked must be a real YYYY-MM-DD date');
  if (!realDate(d.generatedAt ?? '')) err('generatedAt must be a real YYYY-MM-DD date');
  const readOf = (ids) => ids.map((id) => (sources.get(id)?.read ?? []).join(' ')).join(' ');
  const checkFigures = (where, text, figures, sourceIds) => {
    for (const id of sourceIds) if (!sources.has(id)) err(`${where}: unknown source ${id}`);
    const tokens = text.match(/(?<!\d)-?\d+/g) ?? [];
    for (const t of tokens) if (!(figures ?? []).includes(t)) err(`${where}: figure ${t} is not listed in figures`);
    const read = readOf(sourceIds);
    for (const f of figures ?? []) if (!new RegExp(`(^|\\D)${f}(\\D|$)`).test(read)) err(`${where}: figure ${f} is not in the cited sources' read notes`);
  };
  const ids = new Set();
  if (!Array.isArray(d.sections) || d.sections.length === 0) err('needs sections');
  for (const sec of d.sections ?? []) {
    if (!SLUG.test(sec.id ?? '') || ids.has(sec.id)) err(`section id "${sec.id}" is bad or duplicated`);
    ids.add(sec.id);
    if (!nonEmpty(sec.title)) err(`section ${sec.id}: needs a title`);
    if (!Array.isArray(sec.lines) || sec.lines.length === 0) err(`section ${sec.id}: needs lines`);
    for (const [i, l] of (sec.lines ?? []).entries()) {
      const where = `section ${sec.id} line ${i + 1}`;
      if (!nonEmpty(l.text)) err(`${where}: needs text`);
      if (!Array.isArray(l.sourceIds) || l.sourceIds.length === 0) err(`${where}: needs at least one source`);
      else checkFigures(where, l.text ?? '', l.figures, l.sourceIds);
    }
  }
  for (const c of d.contacts ?? []) {
    const where = `contact ${c.id}`;
    if (!nonEmpty(c.name) || !nonEmpty(c.display) || !nonEmpty(c.hours)) err(`${where}: needs name, display and hours`);
    if (!/^\d+$/.test(c.tel ?? '') || c.tel !== (c.display ?? '').replace(/\s/g, '')) err(`${where}: tel must be the display digits without spaces`);
    if (!c.sourceId) err(`${where}: needs a source`);
    else checkFigures(where, c.display ?? '', c.figures, [c.sourceId]);
  }
  if (!Array.isArray(d.notFound)) err('notFound must be a list');
  return errors;
}

export function buildFoodSafety(d, today) {
  const errors = validateFoodSafety(d, today);
  if (errors.length > 0) throw new Error(`Invalid food-safety dataset:\n${errors.join('\n')}`);
  const used = new Set([...d.sections.flatMap((s) => s.lines.flatMap((l) => l.sourceIds)), ...d.contacts.map((c) => c.sourceId)]);
  const data = {
    generatedAt: d.generatedAt,
    checked: d.checked,
    sources: d.sources
      .filter((s) => used.has(s.id))
      .map((s) => ({ id: s.id, title: s.title, publisher: s.publisher, url: s.url, licence: s.licence, accessed: s.accessed, ...(s.reviewed ? { reviewed: s.reviewed } : {}) })),
    sections: d.sections.map((s) => ({ id: s.id, title: s.title, lines: s.lines.map((l) => ({ text: l.text, sourceIds: [...l.sourceIds] })) })),
    contacts: d.contacts.map((c) => ({ id: c.id, name: c.name, display: c.display, tel: c.tel, hours: c.hours, sourceId: c.sourceId })),
    notFound: [...d.notFound],
  };
  return (
    '// GENERATED by scripts/build-foodsafety.mjs from docs/superpowers/research/2026-11-21-food-safety.json.\n' +
    '// Generated, do not edit by hand; run `npm run build:foodsafety`.\n' +
    "import type { FoodSafetyData } from '../types';\n\n" +
    `export const foodSafetyData: FoodSafetyData = ${JSON.stringify(data, null, 2)};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT_PATH, buildFoodSafety(JSON.parse(readFileSync(DATA_PATH, 'utf8'))));
  console.log(`Wrote ${OUT_PATH}`);
}
