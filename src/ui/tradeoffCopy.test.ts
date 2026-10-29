import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countSentence, DISCLAIMER, EMPTY_WEEK, INTRO, REFLECTION } from './tradeoffCopy';

// Lines allowed to hold a banned word, exactly as the spec's wording list gives them.
const ALLOWED = [
  REFLECTION,
  DISCLAIMER,
  INTRO,
  EMPTY_WEEK,
  'None of this is reported to anyone.',
];
const BANNED = /\b(fail|failed|only|deprived|neglect|report|reported|score|goal|target|streak|badge|good|bad|better|worse|should|must)\b/i;
const FILES = ['tradeoffCopy.ts', 'TradeoffsView.tsx', 'AddTradeoff.tsx'];

describe('trade-off wording', () => {
  it('banned words absent (apart from the allow-listed lines)', () => {
    for (const f of FILES) {
      let text = readFileSync(resolve(process.cwd(), 'src/ui', f), 'utf8');
      for (const ok of ALLOWED) text = text.split(ok).join('');
      expect(text.match(BANNED), f).toBeNull();
    }
  });
  it('count sentence matches the spec exactly', () => {
    expect(countSentence(1)).toBe('1 trade-off this week: this is what keeping food on the table cost');
    expect(countSentence(3)).toBe('3 trade-offs this week: this is what keeping food on the table cost');
  });
});
