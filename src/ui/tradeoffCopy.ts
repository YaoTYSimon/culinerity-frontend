/** The exact words of the trade-offs feature. Kept in one place so a test can check them. */
export const TITLE = 'What we went without';
export const INTRO = 'A private record of what keeping food on the table cost. It stays on this device. Add only what you want to.';
export const EMPTY_WEEK = 'Nothing logged this week. Log one only if you want to.';
export const DISCLAIMER = 'This is just a record. There is no right number. It is not a test or a score. It is not a validated measure.';
export const REFLECTION = 'Keeping food on the table should not cost this much.';
export const RETENTION = 'We keep the last 8 weeks on this device, then they go.';
export const SHARED_DEVICE = 'Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device.';
export const STAYS_WITH_PROFILE = 'These stay with this profile on this device.';
export const STATUS_REMOVED = 'Removed.';
export const STATUS_CLEARED = 'Cleared. Undo (this goes when you leave this page)';
export const NEED_A_HAND_TITLE = 'Need a hand?';

export const countSentence = (n: number): string =>
  `${n} ${n === 1 ? 'trade-off' : 'trade-offs'} this week: this is what keeping food on the table cost`;

export const statusAdded = (label: string, dayText: string): string => `Added: ${label}, ${dayText}.`;
