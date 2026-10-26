import { parseProfile, type Profile, type ProfileStore } from '@culinerity/core';

const BASE_KEY = 'culinerity.profile.v1';

/** localStorage-backed profile. Never throws: storage can be blocked, full or corrupt. */
export class LocalProfileStore implements ProfileStore {
  private readonly key: string;

  /** `keySuffix` is '' for the guest (`culinerity.profile.v1`) or `.<id>` for a profile. */
  constructor(keySuffix: string = '') {
    this.key = BASE_KEY + keySuffix;
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
