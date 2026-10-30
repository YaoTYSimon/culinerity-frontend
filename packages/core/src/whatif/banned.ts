/**
 * Words the what-if feature never uses in its own text: advice-giving verbs, verdicts, forecasts and the
 * AI branding the spec rules out. Whole words, case-insensitive; multi-word entries are matched as phrases.
 * The UI copy tests and the explanation tests scan with the same list.
 */
export const BANNED_WORDS: readonly string[] = [
  'you should', 'you must', 'we recommend', 'overspend', 'fail', 'afford', 'risk', 'danger', 'hunger score',
  'safe', 'good', 'bad', 'better', 'worse', 'ai', 'smart', 'predict', 'will', 'must', 'should',
];

const PATTERNS = BANNED_WORDS.map((w) => new RegExp(`(?<![A-Za-z])${w}(?![A-Za-z])`, 'i'));

/** True when the text contains any banned word as a whole word. */
export function hasBannedWord(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}
