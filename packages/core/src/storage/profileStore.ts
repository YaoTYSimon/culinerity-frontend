import type { Aud, Profile } from '../domain/types';

/** Persistence port. Implementations (browser or native storage, memory) are injected by the app. */
export interface ProfileStore {
  load(): Profile;
  save(p: Profile): void;
  clear(): void;
}

/** Meals per week used to turn a weekly food budget into a per-serve budget. */
const SERVES_PER_WEEK = 21;

const NUMBER_FIELDS = ['foodBudgetWeekly', 'incomeWeekly', 'score'] as const;
const STRING_FIELDS = ['suburb', 'scoreTakenAt'] as const;

/** Keep only known fields of the right type. */
export function sanitizeProfile(value: unknown): Profile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: Profile = {};
  for (const k of NUMBER_FIELDS) {
    const x = v[k];
    if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
  }
  for (const k of STRING_FIELDS) {
    const x = v[k];
    if (typeof x === 'string') out[k] = x;
  }
  return out;
}

/** Parse a stored JSON string into a Profile. Never throws; {} for empty/corrupt input. */
export function parseProfile(raw: string | null | undefined): Profile {
  if (!raw) return {};
  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Weekly food budget spread over 21 serves; null when not set or not positive. */
export function budgetPerServe(p: Profile): Aud | null {
  const w = p.foodBudgetWeekly;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w / SERVES_PER_WEEK : null;
}
