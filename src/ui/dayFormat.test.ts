import { describe, expect, it } from 'vitest';
import { dayText } from './AddSpend';
import { noBreak } from './noBreak';

describe('day formats', () => {
  it('writes a day as "Thu 29 Oct", with no comma, like the rest of the app', () => {
    expect(dayText('2026-10-29')).toBe('Thu 29 Oct');
  });
  it('noBreak joins a date with non-breaking spaces', () => {
    expect(noBreak('Tue 10 Nov 2026')).toBe('Tue 10 Nov 2026');
  });
});
