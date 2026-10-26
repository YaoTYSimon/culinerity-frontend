import { createCoreServices, type FoodCatalogue, type FetchLike } from '@culinerity/core';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LocalProfileStore } from '../storage/localProfileStore';
import { createServices, loadServices, type Services } from './container';
import { CatalogueStatusContext, ServicesProvider, type CatalogueStatus } from './ServicesContext';

const EMPTY_CATALOGUE: FoodCatalogue = {
  findCravings: () => [],
  swapsFor: () => [],
  popularCravings: () => [],
};

interface Props {
  useBackend: boolean;
  fetchFn?: FetchLike;
  /** Profile key suffix: '' for the guest, `.<id>` for a profile. Fixed for the life of the mount (key the loader on it). */
  profileSuffix?: string;
  children: ReactNode;
}

/**
 * Renders the app straight away. With mocks the services are ready at once; with the
 * backend they load in the background (the catalogue is empty until then) and the
 * cravings area shows a skeleton, or a Try again message if the server cannot be reached.
 */
export function ServicesLoader({ useBackend, fetchFn, profileSuffix = '', children }: Props) {
  // ONE profile store per mount, shared by the first services and the loaded ones.
  const [profiles] = useState(() => new LocalProfileStore(profileSuffix));
  const [services, setServices] = useState<Services>(() =>
    useBackend ? { ...createCoreServices(profiles), catalogue: EMPTY_CATALOGUE } : createServices(profiles),
  );
  const [status, setStatus] = useState<CatalogueStatus>(useBackend ? 'loading' : 'ready');
  const run = useRef(0);

  const load = useCallback(() => {
    const id = ++run.current;
    setStatus('loading');
    loadServices(true, fetchFn, profiles).then(
      (next) => {
        if (run.current !== id) return;
        setServices(next);
        setStatus(next.catalogue.popularCravings().length > 0 ? 'ready' : 'unavailable');
      },
      () => run.current === id && setStatus('unavailable'),
    );
  }, [fetchFn, profiles]);

  useEffect(() => {
    if (!useBackend) return;
    load();
    return () => {
      run.current = -1;
    };
  }, [useBackend, load]);

  return (
    <CatalogueStatusContext.Provider value={{ status, retry: load }}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </CatalogueStatusContext.Provider>
  );
}
