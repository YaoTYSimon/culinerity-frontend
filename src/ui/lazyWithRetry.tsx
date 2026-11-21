import { lazy, type ComponentProps, type ComponentType } from 'react';

// Replacers for every view whose load has failed since the last retry.
const failedLoads = new Set<() => void>();

/** Gives each view whose load failed a fresh attempt the next time it renders. Called by "Try again". */
export function retryFailedLoads() {
  const replacers = [...failedLoads];
  failedLoads.clear();
  for (const replace of replacers) replace();
}

/**
 * React.lazy, but a failed load can be tried again. React.lazy keeps the rejected promise forever, so a
 * plain re-render would fail instantly; `retryFailedLoads` swaps in a fresh lazy component that calls the factory again.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<C extends ComponentType<any>>(factory: () => Promise<{ default: C }>): ComponentType<ComponentProps<C>> {
  const make = () =>
    lazy(() =>
      factory().catch((error: unknown) => {
        failedLoads.add(() => {
          Inner = make();
        });
        throw error;
      }),
    );
  let Inner = make();
  return function Retryable(props: ComponentProps<C>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const View = Inner as ComponentType<any>;
    return <View {...props} />;
  };
}
