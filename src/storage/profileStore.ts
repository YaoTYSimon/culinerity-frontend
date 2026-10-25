import type { Aud, Profile } from '../domain/types';

export interface ProfileStore {
  load(): Profile;
  save(p: Profile): void;
  clear(): void;
}

const KEY = 'culinerity.profile.v1';

/** Meals per week used to turn a weekly food budget into a per-serve budget. */
const SERVES_PER_WEEK = 21;

/** localStorage-backed profile. Never throws: storage can be blocked, full or corrupt. */
export class LocalProfileStore implements ProfileStore {
  load(): Profile {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Profile) : {};
    } catch {
      return {};
    }
  }

  save(p: Profile): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Storage unavailable or full: the profile simply isn't persisted.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to do.
    }
  }
}

/** Weekly food budget spread over 21 serves; null when not set or not positive. */
export function budgetPerServe(p: Profile): Aud | null {
  const w = p.foodBudgetWeekly;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w / SERVES_PER_WEEK : null;
}
