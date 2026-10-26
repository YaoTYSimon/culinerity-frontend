import type { ReactNode } from 'react';
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
