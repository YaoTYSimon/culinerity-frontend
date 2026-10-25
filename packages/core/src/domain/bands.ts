import { scoreBand, type ScoreBand } from './scoring/score';

/** Below this score the number screen surfaces food support. */
export const SUPPORT_BELOW = 40;

const HEADLINES: Record<ScoreBand, string> = {
  Critical: 'Food is taking up almost all your headspace.',
  Struggling: 'Food is taking up a lot of room.',
  Strained: 'Food is on your mind a lot.',
  Steady: 'Food is mostly in hand.',
  Secure: 'Food is in a good place.',
};

export function bandHeadline(score: number): string {
  return HEADLINES[scoreBand(score)];
}

export type RankNudge = 'cheapest' | 'balanced' | 'healthiest';

export function rankNudge(score: number): RankNudge {
  if (score < SUPPORT_BELOW) return 'cheapest';
  if (score < 60) return 'balanced';
  return 'healthiest';
}
