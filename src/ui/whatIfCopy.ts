import type { BaselineField } from '@culinerity/core';

/** The one banned-word list: the same array the core explanation tests scan with. */
export { BANNED_WORDS } from '@culinerity/core';

const NEED_NAMES: Record<BaselineField, string> = {
  incomeWeekly: 'weekly income',
  housingWeekly: 'weekly rent',
  otherFixedWeekly: 'weekly other regular costs',
  foodBudgetWeekly: 'weekly food budget',
};

/** "To work this out we need your weekly rent. Add it above, or choose a change in dollars instead." */
export function needsSentence(missing: BaselineField[], offerDollars: boolean): string {
  const names = missing.map((f) => NEED_NAMES[f]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `To work this out we need your ${list}. Add ${names.length > 1 ? 'them' : 'it'} above${offerDollars ? ', or choose a change in dollars instead' : ''}.`;
}

/** Every fixed string of the What if screen, in one place so one test can read them all. Tone: kind, no verdicts. */
export const WHATIF_COPY = {
  title: 'What if',
  notice:
    "General information, not advice. This does simple sums on the numbers you give us, here on your device. It doesn't know your whole situation, can't tell you what will happen, and isn't financial advice. For advice that fits you, a free financial counsellor can help: National Debt Helpline 1800 007 007.",
  privacy: "These numbers stay on this device. Nothing is sent anywhere, and there's no sharing button on this page.",
  numbersHeading: 'Your numbers',
  numbersIntro: 'All optional. Add only what you want the sums to use.',
  numbersHint: 'In dollars, like 120 or 120.50. Leave it blank to leave it out.',
  saveNumbers: 'Save my numbers',
  numbersSaved: 'Your numbers are saved on this device.',
  pickHeading: 'Pick a change',
  pickTwo: 'Pick at least two changes to try them together.',
  whichChanges: 'Which changes?',
  tryNumber: 'Try a number',
  show: 'Show what changes',
  startAgain: 'Start again',
  resultsReady: 'Results ready',
  resultsHeading: 'What changes',
  howHeading: 'How we worked this out',
  assumedHeading: 'What we assumed',
  unknownHeading: "What we don't know",
  contextHeading: 'For context',
  contextIntro: 'Figures from official sources, shown as they publish them. They are not taken off your numbers.',
  noBillContext: "We don't show a typical bill because we have no source for one.",
  addIncome: "Add your weekly income to see what's left",
  shortfall: "These numbers don't stretch to cover everything. That's about the sums, not about you. These can help:",
  helpHeading: 'What could help',
  empty: 'Nothing saved yet. Try a change above and save it to compare later.',
  savedHeading: 'Saved what-ifs',
  savedIntro: 'Only the change is saved, on this device. Opening one works it out again with your numbers as they are today.',
  nameLabel: 'Name',
  saveThis: 'Save this what-if',
  newName: 'New name',
  saveName: 'Save name',
  cancel: 'Cancel',
  clearAll: 'Clear all',
  nameEmpty: 'Please give it a name.',
  nameTooLong: 'Please use 40 characters or fewer.',
  listFull: 'You can keep up to 10 what-ifs. Remove one to save another.',
  savedStatus: (name: string): string => `Saved ${name}.`,
  renamedStatus: (name: string): string => `Renamed to ${name}.`,
  removedStatus: (name: string): string => `Removed ${name}.`,
  clearedStatus: (n: number): string => `Removed ${n} saved ${n === 1 ? 'what-if' : 'what-ifs'}.`,
  restoredStatus: 'Put back.',
  openedStatus: (name: string): string => `Opened ${name}. Results ready.`,
  compareHeading: 'Compare two',
  compareResultHeading: 'The two together',
  compareIntro: 'Both are worked out with your numbers as they are today.',
  comparePick: 'Choose two to compare.',
  compareFirst: 'First',
  compareSecond: 'Second',
  compareDraft: 'What you just tried',
  compareCaption: "Side by side, for the first week each change touches",
  compareLine: 'Line',
  compareDifference: 'Difference',
  compareSame: 'Same',
  compareNeeds: (name: string, sentence: string): string => `${name}: ${sentence}`,
  invalidMoney: 'Please enter an amount like 120 or 120.50.',
  invalidPercent: 'Please enter a percentage like 10 or 7.5.',
  invalidCount: 'Please use a number in halves, like 1 or 2.5.',
  invalidForm: "We couldn't use those numbers. Please check them.",
  needsRent: needsSentence(['housingWeekly'], true),
  tooBig: (limit: string): string => `That's more than we can work with here (up to ${limit}). Check the number?`,
  countRange: (min: number, max: number): string => `Please use a number from ${min} to ${max}, in halves.`,
  swapsCover: (saved: string, covered: string, gap: string): string =>
    `Swaps you added in the last 7 days saved ${saved}. If that happened each week it would cover ${covered} of the ${gap} gap.`,
} as const;

/** Text with the spec's notice removed: the notice is the lawyer-facing wording and may hold words the list bans. */
export const scannable = (text: string): string => text.split(WHATIF_COPY.notice).join('');
