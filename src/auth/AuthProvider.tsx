import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AccountRecord, AuthService, CreateInput, ProfileId, RemoveLeftover } from '@culinerity/core';
import { AuthContext, type AuthState } from './useAuth';

/** An AuthService that can tell us when its data changed (LocalAuthService does, including other tabs). */
export type ObservableAuthService = AuthService & { subscribe?(listener: () => void): () => void };

interface Props {
  /** Wired in ONE place (src/main.tsx); never constructed here. */
  service: ObservableAuthService;
  children: ReactNode;
}

const STORAGE_FAILED = { ok: false, reason: 'storage-error' } as const;

/**
 * Owns the sign-in state for the tab. Accounts and the session are read from the service (storage) on
 * every change; "guest" is a choice for this tab only and is never persisted, so a reload with accounts
 * present asks to sign in again. A failing service never throws out of here.
 */
export function AuthProvider({ service, children }: Props) {
  const [version, setVersion] = useState(0);
  // A tab that opens with no accounts is a guest tab: creating a profile (here or in another tab) must not
  // pull the app out from under it. With accounts present the tab starts locked.
  const [guest, setGuest] = useState(() => {
    try {
      return service.list().length === 0;
    } catch {
      return true;
    }
  });
  const [removeNotice, setRemoveNotice] = useState<RemoveLeftover[] | null>(null);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!service.subscribe) return;
    try {
      return service.subscribe(bump);
    } catch {
      return undefined;
    }
  }, [service, bump]);

  // `version` is the re-read trigger: the service is the source of truth.
  const { accounts, current } = useMemo(() => {
    void version;
    let list: AccountRecord[] = [];
    let cur: AccountRecord | null = null;
    try {
      list = service.list();
    } catch {
      list = [];
    }
    try {
      cur = service.current();
    } catch {
      cur = null;
    }
    return { accounts: list, current: cur };
  }, [service, version]);

  const status: AuthState['status'] = current ? 'signed-in' : guest || accounts.length === 0 ? 'guest' : 'locked';

  const value = useMemo<AuthState>(() => {
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch {
        // A failing service leaves the state as it was.
      }
    };
    return {
      accounts,
      current,
      status,
      async signIn(id: ProfileId, passcode?: string) {
        try {
          const r = await service.signIn(id, passcode);
          if (r.ok) {
            setGuest(false);
            setRemoveNotice(null);
          }
          bump();
          return r;
        } catch {
          return STORAGE_FAILED;
        }
      },
      async create(input: CreateInput) {
        try {
          const r = await service.create(input);
          bump();
          return r;
        } catch {
          return {
            ok: false,
            reason: 'storage',
            message: "We couldn't save to this browser. Check that storage is allowed and try again.",
          } as const;
        }
      },
      lock() {
        safe(() => service.lock());
        setGuest(false);
        bump();
      },
      signOut() {
        safe(() => service.signOut());
        setGuest(false);
        bump();
      },
      async remove(id: ProfileId, confirmName: string) {
        try {
          const r = await service.remove(id, confirmName);
          if (!r.ok && r.remaining.length) setRemoveNotice(r.remaining);
          else if (r.ok) setRemoveNotice(null);
          bump();
          return r;
        } catch {
          return { ok: false, reason: 'storage-error', remaining: [] } as const;
        }
      },
      continueAsGuest() {
        safe(() => service.signOut());
        setGuest(true);
        bump();
      },
      removeNotice,
      dismissRemoveNotice: () => setRemoveNotice(null),
      refresh: bump,
    };
  }, [service, accounts, current, status, bump, removeNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
