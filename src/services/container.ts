import { createCoreServices, createHttpServices, type FetchLike, type ProfileStore, type Services } from '@culinerity/core';
import { LocalProfileStore } from '../storage/localProfileStore';

export type { Services };

/** Web wiring: core services plus the localStorage profile store. */
export function createServices(profiles: ProfileStore = new LocalProfileStore()): Services {
  return createCoreServices(profiles);
}

/**
 * Mocks by default. With the backend flag on, reference data comes from the
 * /api server (the profile still lives only on this device); if the server is
 * down the sources resolve empty rather than throwing. The caller passes the ONE
 * profile store for this mount (`new LocalProfileStore(suffix)`).
 */
export async function loadServices(
  useBackend: boolean,
  fetchFn: FetchLike = (url, init) => fetch(url, init),
  profiles: ProfileStore = new LocalProfileStore(),
): Promise<Services> {
  return useBackend ? createHttpServices(profiles, fetchFn) : createCoreServices(profiles);
}
