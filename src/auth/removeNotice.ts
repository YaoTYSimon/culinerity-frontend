import type { RemoveLeftover } from '@culinerity/core';

const LEFTOVER: Record<RemoveLeftover, string> = {
  data: 'your saved answers',
  attempts: 'the record of sign-in tries',
  account: 'the profile entry',
  session: 'the signed-in marker',
};

/** A calm sentence naming what a failed delete left behind. */
export function describeLeftovers(remaining: RemoveLeftover[]): string {
  return `Some of this profile could not be removed from this browser: ${remaining.map((k) => LEFTOVER[k]).join(', ')}. You can clear this site's data in your browser settings to finish.`;
}
