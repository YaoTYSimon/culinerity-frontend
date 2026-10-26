import { createContext, useContext } from 'react';
import type {
  AccountRecord,
  CreateInput,
  CreateResult,
  ProfileId,
  RemoveResult,
  SignInResult,
} from '@culinerity/core';

export type AuthStatus = 'locked' | 'signed-in' | 'guest';

export interface AuthState {
  accounts: AccountRecord[];
  current: AccountRecord | null;
  /** 'locked' = accounts exist and nobody is signed in or browsing as a guest. */
  status: AuthStatus;
  signIn(id: ProfileId, passcode?: string): Promise<SignInResult>;
  create(input: CreateInput): Promise<CreateResult>;
  lock(): void;
  signOut(): void;
  remove(id: ProfileId, confirmName: string): Promise<RemoveResult>;
  continueAsGuest(): void;
  /** Re-read the account list and session from storage. */
  refresh(): void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside an <AuthProvider>');
  return v;
}
