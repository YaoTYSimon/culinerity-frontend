import { traditions } from '../cultural/source';
import { DIET_RULES, OCCASION_IDS, type DietRule, type FoodProfile, type OccasionId, type Tradition } from './types';

export const MAX_TEXT = 40;
export const MAX_TAGS = 12;
export const MAX_DISMISSED = 20;

const DISMISSED_KEY = /^[a-z-]+-\d{4}$/;

/** NFC, control, zero-width and other invisible format characters removed, whitespace collapsed, max 40 characters. */
export function cleanText(s: string): string {
  const flat = s.normalize('NFC').replace(/\s/g, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/ +/g, ' ').trim();
  let out = '';
  for (const ch of flat) {
    if (out.length + ch.length > MAX_TEXT) break;
    out += ch;
  }
  return out.trim();
}

/** A starter id when the text equals a starter label or id (any case); otherwise the cleaned own text. */
export function normaliseTradition(text: string, starters: Tradition[] = traditions()): string {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  return starters.find((t) => t.id === lower || t.label.toLowerCase() === lower)?.id ?? clean;
}

/** Unique (case-insensitive) non-empty mapped strings, at most `max`. Stops early on huge input. */
function tags(list: unknown, map: (s: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  if (!Array.isArray(list)) return out;
  for (const x of list) {
    if (out.length >= MAX_TAGS) break;
    if (typeof x !== 'string') continue;
    const t = map(x);
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

function known<T extends string>(list: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(list)) return [];
  return allowed.filter((id) => list.includes(id));
}

function dismissedKeys(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const unique = [...new Set(list.filter((x): x is string => typeof x === 'string' && DISMISSED_KEY.test(x)))];
  return unique.slice(-MAX_DISMISSED);
}

/** A clean FoodProfile, or undefined when nothing is chosen (so an empty profile stores nothing). Never throws. */
export function sanitizeFoodProfile(v: unknown): FoodProfile | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  try {
    const r = v as Record<string, unknown>;
    const starters = traditions();
    const out: FoodProfile = {
      traditions: tags(r.traditions, (s) => normaliseTradition(s, starters)),
      rules: known<DietRule>(r.rules, DIET_RULES),
      allergies: tags(r.allergies, cleanText),
      occasions: known<OccasionId>(r.occasions, OCCASION_IDS),
      dismissed: dismissedKeys(r.dismissed),
    };
    return Object.values(out).every((l) => l.length === 0) ? undefined : out;
  } catch {
    return undefined;
  }
}
