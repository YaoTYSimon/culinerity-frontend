import { describe, expect, it } from 'vitest';
import { appendScore, trendSummary, type ScoreEntry } from './history';

describe('appendScore', () => {
  it('starts a history from undefined', () => {
    expect(appendScore(undefined, 40, '2026-10-01')).toEqual([{ score: 40, at: '2026-10-01' }]);
  });
  it('keeps order and caps at 12, dropping the oldest', () => {
    let h: ScoreEntry[] | undefined;
    for (let i = 0; i < 15; i++) h = appendScore(h, i, `2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(h).toHaveLength(12);
    expect(h![0].score).toBe(3);
    expect(h![11].score).toBe(14);
  });
  it('does not mutate its input', () => {
    const h = [{ score: 1, at: '2026-10-01' }];
    appendScore(h, 2, '2026-10-02');
    expect(h).toHaveLength(1);
  });
});

describe('trendSummary', () => {
  it.each([undefined, [], [{ score: 1, at: '2026-10-01' }]])('is null for %j', (h) => {
    expect(trendSummary(h as ScoreEntry[] | undefined)).toBeNull();
  });
  it('gives delta last - first and all scores', () => {
    const h = [33, 35, 36, 40, 42].map((score, i) => ({ score, at: `2026-10-0${i + 1}` }));
    expect(trendSummary(h)).toEqual({ delta: 9, scores: [33, 35, 36, 40, 42] });
  });
});
