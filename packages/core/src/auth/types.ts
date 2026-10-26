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
      reason:
        | 'wrong-passcode'
        | 'too-many-attempts'
        | 'unknown-profile'
        | 'needs-passcode'
        | 'storage-error';
      triesLeft?: number;
      retryInSeconds?: number;
    };

export interface CreateInput {
  name: string;
  colour: ThemeId;
  /** Omit (or pass '') for a profile without a passcode. */
  passcode?: string;
  /** Move the guest profile data into the new profile. */
  migrateGuestData?: boolean;
}

export type CreateFailureReason =
  | 'invalid-name'
  | 'invalid-passcode'
  | 'invalid-colour'
  | 'passcode-unsupported'
  | 'no-id'
  | 'storage';

export type CreateResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: CreateFailureReason; message: string };

/** What a failed remove left behind (empty when ok). */
export type RemoveLeftover = 'data' | 'attempts' | 'account' | 'session';

export type RemoveResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unknown-profile' | 'name-mismatch' | 'storage-error';
      remaining: RemoveLeftover[];
    };

export interface AuthService {
  list(): AccountRecord[];
  current(): AccountRecord | null;
  create(input: CreateInput): Promise<CreateResult>;
  signIn(id: ProfileId, passcode?: string): Promise<SignInResult>;
  lock(): void;
  signOut(): void;
  remove(id: ProfileId, confirmName: string): Promise<RemoveResult>;
}
