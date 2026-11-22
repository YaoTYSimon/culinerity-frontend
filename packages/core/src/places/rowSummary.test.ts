import { describe, expect, it } from 'vitest';
import { endsSoon, hoursSummary, noticeHeadline } from './rowSummary';

describe('hoursSummary', () => {
  it('keeps a short line as it is', () => {
    expect(hoursSummary('Tuesdays 10-12')).toBe('Tuesdays 10-12');
  });
  it('stops at the first sentence', () => {
    expect(hoursSummary('Mon to Fri 9-5. Closed on public holidays and over the Christmas break.')).toBe('Mon to Fri 9-5');
  });
  it('does not split inside brackets', () => {
    expect(hoursSummary('Wed 10-1 (first week only. Ring first). Other days closed.')).toBe('Wed 10-1 (first week only. Ring first)');
  });
  it('cuts a long line at a word within the limit and adds an ellipsis', () => {
    const out = hoursSummary('Monday 9am to 12pm; Tuesday 9am to 12pm; Wednesday 9am to 12pm; Thursday 9am to 12pm; Friday 9am to 12pm');
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(61);
    expect(out).toBe('Monday 9am to 12pm; Tuesday 9am to 12pm; Wednesday 9am to…');
  });
  it('is empty for blank text', () => {
    expect(hoursSummary('  ')).toBe('');
  });
});

describe('noticeHeadline', () => {
  it('shortens to six words', () => {
    expect(noticeHeadline('Closed for renovation until the new year')).toBe('Closed for renovation until the new…');
    expect(noticeHeadline('Closed for renovation')).toBe('Closed for renovation');
  });
});

describe('endsSoon', () => {
  const n = { text: 'x', until: '2026-12-10' };
  it('is true from today to 30 days out, inclusive', () => {
    expect(endsSoon(n, '2026-12-10')).toBe(true);
    expect(endsSoon(n, '2026-11-10')).toBe(true);
    expect(endsSoon(n, '2026-11-09')).toBe(false);
  });
  it('is false once it has ended', () => {
    expect(endsSoon(n, '2026-12-11')).toBe(false);
  });
});
