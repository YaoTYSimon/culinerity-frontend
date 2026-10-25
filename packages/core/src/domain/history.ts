import type { ScoreEntry } from './types';

export type { ScoreEntry };

export const MAX_HISTORY = 12;

export function isIsoDate(x: unknown): x is string {
  return typeof x === 'string' && !Number.isNaN(Date.parse(x));
}

export function isScoreEntry(x: unknown): x is ScoreEntry {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return typeof e.score === 'number' && Number.isFinite(e.score) && e.score >= 0 && e.score <= 100 && isIsoDate(e.at);
}

/** Append a completed check-in (newest last), keeping at most the latest 12. */
export function appendScore(history: ScoreEntry[] | undefined, score: number, at: string): ScoreEntry[] {
  return [...(history ?? []), { score, at }].slice(-MAX_HISTORY);
}

/** Change from first to last entry plus all scores; null with fewer than 2 entries. */
export function trendSummary(history: ScoreEntry[] | undefined): { delta: number; scores: number[] } | null {
  if (!history || history.length < 2) return null;
  const scores = history.map((h) => h.score);
  return { delta: scores[scores.length - 1] - scores[0], scores };
}
