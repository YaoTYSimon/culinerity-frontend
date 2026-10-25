import { createCoreServices, type Services } from '@culinerity/core';
import { LocalProfileStore } from '../storage/localProfileStore';

export type { Services };

/** Web wiring: core services plus the localStorage profile store. */
export function createServices(): Services {
  return createCoreServices(new LocalProfileStore());
}
