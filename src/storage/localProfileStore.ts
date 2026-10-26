import { parseProfile, type Profile, type ProfileStore } from '@culinerity/core';

const BASE_KEY = 'culinerity.profile.v1';

/** True when the stored account list (culinerity.accounts.v1) still holds `id`. */
function accountExists(id: string): boolean {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('culinerity.accounts.v1') ?? 'null');
    return Array.isArray(parsed) && parsed.some((a) => !!a && typeof a === 'object' && (a as { id?: unknown }).id === id);
  } catch {
    return false;
  }
}

/** localStorage-backed profile. Never throws: storage can be blocked, full or corrupt. */
export class LocalProfileStore implements ProfileStore {
  private readonly key: string;
  /** The account this store belongs to; null for the guest. */
  private readonly accountId: string | null;

  /** `keySuffix` is '' for the guest (`culinerity.profile.v1`) or `.<id>` for a profile. */
  constructor(keySuffix: string = '') {
    this.key = BASE_KEY + keySuffix;
    this.accountId = keySuffix.startsWith('.') ? keySuffix.slice(1) : null;
  }

  load(): Profile {
    try {
      return parseProfile(localStorage.getItem(this.key));
    } catch {
      return {};
    }
  }

  save(p: Profile): void {
    try {
      // A deleted profile (another tab) must not be brought back by a tab that still has it open.
      if (this.accountId !== null && !accountExists(this.accountId)) return;
      localStorage.setItem(this.key, JSON.stringify(p));
    } catch {
      // Storage unavailable or full: the profile simply isn't persisted.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Nothing to do.
    }
  }
}
