import { createContext, useContext, useState, type ReactNode } from 'react';
import { createServices, type Services } from './container';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services?: Services; children: ReactNode }) {
  const [value] = useState<Services>(() => services ?? createServices());
  return <ServicesContext.Provider value={services ?? value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices must be used inside a <ServicesProvider>');
  return s;
}

export type CatalogueStatus = 'loading' | 'ready' | 'unavailable';
export interface CatalogueState {
  status: CatalogueStatus;
  retry: () => void;
}

export const CatalogueStatusContext = createContext<CatalogueState>({ status: 'ready', retry: () => {} });

/** Whether the craving catalogue has loaded; always "ready" outside a ServicesLoader. */
export function useCatalogueStatus(): CatalogueState {
  return useContext(CatalogueStatusContext);
}
