/** Every storage key the sign-in feature touches, in one place. */
export const KEYS = {
  accounts: 'culinerity.accounts.v1',
  attempts: 'culinerity.attempts.v1',
  /** sessionStorage: closing the tab signs out. */
  session: 'culinerity.session.v1',
  /** The guest profile (no suffix). */
  guestProfile: 'culinerity.profile.v1',
  theme: 'culinerity.theme.v1',
  /** Set once the visitor has chosen at the start screen (sign in, create or guest). Holds no personal data. */
  welcomed: 'culinerity.welcomed',
} as const;

/** Profile key: the guest key, or the guest key plus `.<id>`. */
export function profileKey(id?: string): string {
  return id ? `${KEYS.guestProfile}.${id}` : KEYS.guestProfile;
}
