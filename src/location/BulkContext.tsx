import { createContext, useContext } from 'react';
import { createBulkSource, type BulkSource } from './cellFetcher';

/** Defaults to same-origin static files; tests wrap a view in `BulkSourceContext.Provider` to inject a fake. */
export const BulkSourceContext = createContext<BulkSource>(createBulkSource());

export const useBulkSource = (): BulkSource => useContext(BulkSourceContext);
