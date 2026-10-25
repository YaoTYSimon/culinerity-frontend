import { createCoreServices, createHttpServices, type FetchLike, type Services } from '@culinerity/core';
import { LocalProfileStore } from '../storage/localProfileStore';

export type { Services };

/** Web wiring: core services plus the localStorage profile store. */
export function createServices(): Services {
  return createCoreServices(new LocalProfileStore());
}

/**
 * Mocks by default. With the backend flag on, reference data comes from the
 * /api server (the profile still lives only on this device); if the server is
 * down the sources resolve empty rather than throwing.
 */
export async function loadServices(
  useBackend: boolean,
  fetchFn: FetchLike = (url, init) => fetch(url, init),
): Promise<Services> {
  return useBackend ? createHttpServices(new LocalProfileStore(), fetchFn) : createServices();
}
