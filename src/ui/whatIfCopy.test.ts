import { describe, expect, it } from 'vitest';
import { BANNED_WORDS, hasBannedWord } from '@culinerity/core';
import { BANNED_WORDS as UI_BANNED, scannable, WHATIF_COPY } from './whatIfCopy';

describe('What if copy', () => {
  it('keeps the spec notice, privacy line, shortfall and empty strings word for word', () => {
    expect(WHATIF_COPY.notice).toBe(
      "General information, not advice. This does simple sums on the numbers you give us, here on your device. It doesn't know your whole situation, can't tell you what will happen, and isn't financial advice. For advice that fits you, a free financial counsellor can help: National Debt Helpline 1800 007 007.",
    );
    expect(WHATIF_COPY.privacy).toBe("These numbers stay on this device. Nothing is sent anywhere, and there's no sharing button on this page.");
    expect(WHATIF_COPY.shortfall).toBe("These numbers don't stretch to cover everything. That's about the sums, not about you. These can help:");
    expect(WHATIF_COPY.invalidMoney).toBe('Please enter an amount like 120 or 120.50.');
    expect(WHATIF_COPY.tooBig('$20,000 a week')).toBe("That's more than we can work with here (up to $20,000 a week). Check the number?");
    expect(WHATIF_COPY.needsRent).toBe('To work this out we need your weekly rent. Add it above, or choose a change in dollars instead.');
  });

  it('re-exports the one banned list the explanation tests use', () => {
    expect(UI_BANNED).toBe(BANNED_WORDS);
  });

  it('has no banned word and no "AI" in any string (the notice is the spec text, so it is exempt)', () => {
    const strings = Object.entries(WHATIF_COPY).filter(([k, v]) => typeof v === 'string' && k !== 'notice') as [string, string][];
    expect(strings.length).toBeGreaterThan(15);
    for (const [k, v] of strings) expect(hasBannedWord(v), `${k}: ${v}`).toBe(false);
  });

  it('scannable() removes only the notice', () => {
    expect(scannable(`before ${WHATIF_COPY.notice} after`)).toBe('before  after');
    expect(hasBannedWord(scannable('You should do this'))).toBe(true);
  });
});
