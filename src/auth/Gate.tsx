import { useEffect, useRef, type ReactNode } from 'react';
import type { FetchLike } from '@culinerity/core';
import { ServicesLoader } from '../services/ServicesLoader';
import { SignInScreen } from './SignInScreen';
import { useAuth } from './useAuth';

interface Props {
  useBackend: boolean;
  fetchFn?: FetchLike;
  children: ReactNode;
}

/**
 * Sign-in screen when profiles exist and nobody is signed in; otherwise the app. The app tree is keyed on
 * the profile, so locking or switching remounts it and discards all in-memory profile state. The
 * sign-in screen renders outside that tree and never mounts the profile services.
 */
export function Gate({ useBackend, fetchFn, children }: Props) {
  const { accounts, current, status } = useAuth();
  // Signing in, switching, locking or creating a profile swaps the whole tree, so focus would drop to the
  // body. Land on the new page's h1 instead (never on first load).
  const mode = accounts.length > 0 && status === 'locked' ? 'locked' : (current?.id ?? 'guest');
  const previous = useRef(mode);
  useEffect(() => {
    if (previous.current === mode) return;
    previous.current = mode;
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [mode]);
  if (accounts.length > 0 && status === 'locked') return <SignInScreen />;
  return (
    <ServicesLoader
      key={current?.id ?? 'guest'}
      useBackend={useBackend}
      fetchFn={fetchFn}
      profileSuffix={current ? '.' + current.id : ''}
    >
      {children}
    </ServicesLoader>
  );
}
