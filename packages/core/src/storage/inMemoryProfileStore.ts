import type { Profile } from '../domain/types';
import type { ProfileStore } from './profileStore';

/** In-memory ProfileStore (tests, previews); `saved` records every save. */
export class InMemoryProfileStore implements ProfileStore {
  saved: Profile[] = [];
  constructor(private profile: Profile = {}) {}
  load(): Profile { return { ...this.profile }; }
  save(p: Profile): void { this.profile = { ...p }; this.saved.push({ ...p }); }
  clear(): void { this.profile = {}; }
}
