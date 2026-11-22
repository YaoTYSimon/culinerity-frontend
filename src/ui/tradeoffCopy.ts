/** The exact words of the trade-offs feature. Kept in one place so a test can check them. */
export const TITLE = 'What we went without';
export const INTRO = 'A private record, kept on this device. Add only what you want.';
export const EMPTY_WEEK = 'Nothing logged this week.';
export const DISCLAIMER = 'Just a record. Not a test, a score or a validated measure.';
export const REFLECTION = 'Keeping food on the table should not cost this much.';
export const RETENTION = 'Kept 8 weeks on this device, with this profile.';
export const SHARED_DEVICE = 'Anyone using this browser as you can see this. Use a password on shared devices.';
export const STATUS_REMOVED = 'Removed.';
export const STATUS_CLEARED = 'Cleared. Undo (this goes when you leave this page)';
export const NEED_A_HAND_TITLE = 'Need a hand?';

export const countSentence = (n: number): string =>
  `${n} ${n === 1 ? 'trade-off' : 'trade-offs'} this week: this is what keeping food on the table cost`;

export const statusAdded = (label: string, dayText: string): string => `Added: ${label}, ${dayText}.`;

// Support card (safe messaging): calm, and it never tells the person what to do.
export const SUPPORT_HEADING = 'If it would help';
export const SUPPORT_BODY = 'Plenty of people go without to get by, and help exists. None of this is reported to anyone.';
export const SUPPORT_CLOSE = 'Close';
export const FIND_FOOD_LINK = 'Find free food near you';
export const FOOD_SUPPORT_BUTTON = 'See food support places';
export const DEBT_LEAD = 'National Debt Helpline, free financial counselling:';
export const DEBT_HOURS = '(weekdays)';
export const LIFELINE_LEAD = 'If things feel heavy: Lifeline';
export const LIFELINE_TAIL = ', any time. In danger, call';
export const KIDS_LEAD = 'If your child wants someone to talk to: Kids Helpline';
export const SAFE_STEPS_LEAD = 'If you do not feel safe at home: Safe Steps, family violence support';
export const SAFE_STEPS_TAIL = ', any time. In danger, call';
export const KIDS_LEAD_PARENT = 'Kids Helpline, for children and young people:';
