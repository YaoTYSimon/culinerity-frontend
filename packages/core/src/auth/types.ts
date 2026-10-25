import type { ThemeId } from '../theme/theme';

export type ProfileId = string;

export interface AccountRecord {
  id: ProfileId;
  name: string;
  colour: ThemeId;
  createdAt: string;
  verifier?: { v: 1; salt: string; iterations: number; hash: string };
}

export type SignInResult =
  | { ok: true; account: AccountRecord }
  | {
      ok: false;
      reason: 'wrong-passcode' | 'too-many-attempts' | 'unknown-profile' | 'needs-passcode';
      triesLeft?: number;
      retryInSeconds?: number;
    };

export interface AuthService {
  list(): AccountRecord[];
  current(): AccountRecord | null;
  create(input: { name: string; colour: ThemeId; passcode?: string }): Promise<AccountRecord>;
  signIn(id: ProfileId, passcode?: string): Promise<SignInResult>;
  lock(): void;
  signOut(): void;
  remove(id: ProfileId, confirmName: string): Promise<boolean>;
}
