import { createContext, useContext } from 'react';
import type { LocationProvider } from '@culinerity/core';
import { BrowserLocationProvider } from './BrowserLocationProvider';

/** Defaults to the browser adapter; tests wrap a view in `LocationProviderContext.Provider` to inject a fake. */
export const LocationProviderContext = createContext<LocationProvider>(new BrowserLocationProvider());

export function useLocationProvider(): LocationProvider {
  return useContext(LocationProviderContext);
}
