import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { FetchLike } from '@culinerity/core';
import { ServicesLoader } from '../services/ServicesLoader';
import { SignInScreen } from './SignInScreen';
import { StartScreen } from './StartScreen';
import { useAuth } from './useAuth';
import { readWelcomed, writeWelcomed } from './welcomed';

interface Props {
  useBackend: boolean;
  fetchFn?: FetchLike;
  children: ReactNode;
}

/**
 * Sign-in screen when profiles exist and nobody is signed in; the start screen for a visitor who has not yet
 * chosen (and has no profile); otherwise the app. The app tree is keyed on the profile, so locking or
 * switching remounts it and discards all in-memory profile state. The sign-in and start screens render
 * outside that tree and never mount the profile services.
 */
export function Gate({ useBackend, fetchFn, children }: Props) {
  const { accounts, current, status } = useAuth();
  // Signing in, switching, locking or creating a profile swaps the whole tree, so focus would drop to the
  // body. Land on the new page's h1 instead (never on first load).
  const [welcomed, setWelcomed] = useState(readWelcomed);
  const locked = accounts.length > 0 && status === 'locked';
  const start = !locked && !current && !welcomed;
  const choose = () => {
    writeWelcomed();
    setWelcomed(true);
  };
  // Signing in (or creating a profile, which signs in) counts as having chosen.
  const signedIn = !!current;
  useEffect(() => {
    if (signedIn && !welcomed) choose();
  }, [signedIn, welcomed]);
  const mode = locked ? 'locked' : start ? 'start' : (current?.id ?? 'guest');
  const previous = useRef(mode);
  useEffect(() => {
    if (previous.current === mode) return;
    previous.current = mode;
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [mode]);
  if (locked) return <SignInScreen onGuest={choose} />;
  if (start) return <StartScreen onGuest={choose} />;
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
