import { centroidTable } from './generated/centroids.generated';

export interface CentroidSource {
  publisher: string;
  title: string;
  url: string;
  licence: string;
  accessed: string;
}

export interface CentroidTable {
  suburbs: { name: string; lat: number; lng: number }[];
  postcodes: { code: string; lat: number; lng: number; label: string }[];
  source: CentroidSource;
}

export type CentroidResult =
  | { kind: 'match'; lat: number; lng: number; label: string }
  | { kind: 'suggest'; options: string[] }
  | { kind: 'none' };

const MAX_SUGGESTIONS = 5;
const NONE: CentroidResult = { kind: 'none' };

/** Lower case, no diacritics or punctuation, no trailing "vic"/"victoria", single spaces. */
export function normaliseName(text: string): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s(?:vic|victoria)$|^(?:vic|victoria)$/, '')
    .trim();
}

const POSTCODE = /^\d{4}$/;

function byPostcode(code: string, table: CentroidTable): CentroidResult {
  const p = table.postcodes.find((x) => x.code === code);
  return p ? { kind: 'match', lat: p.lat, lng: p.lng, label: p.label } : NONE;
}

function byName(name: string, table: CentroidTable): CentroidResult {
  if (!name) return NONE;
  const rows = table.suburbs.map((s) => ({ s, n: normaliseName(s.name) }));
  const exact = rows.find((r) => r.n === name);
  if (exact) return { kind: 'match', lat: exact.s.lat, lng: exact.s.lng, label: exact.s.name };
  const prefix = rows.filter((r) => r.n.startsWith(name));
  if (prefix.length === 1) return { kind: 'match', lat: prefix[0].s.lat, lng: prefix[0].s.lng, label: prefix[0].s.name };
  if (prefix.length > 1) return { kind: 'suggest', options: prefix.slice(0, MAX_SUGGESTIONS).map((r) => r.s.name) };
  return NONE;
}

/** Looks typed text up in the bundled table. Pure, never throws, no fuzzy matching. */
export function suburbCentroid(text: string, table: CentroidTable = centroidTable): CentroidResult {
  try {
    const t = normaliseName(text);
    if (!t) return NONE;
    if (POSTCODE.test(t)) return byPostcode(t, table);
    const m = /^(.*\S)\s(\d{4})$/.exec(t);
    if (m) {
      const named = byName(m[1], table);
      return named.kind === 'match' ? named : byPostcode(m[2], table);
    }
    return byName(t, table);
  } catch {
    return NONE;
  }
}
