import { DOMAINS, FIES_QUESTIONS, type Answers, type DomainId } from './questionnaire';

export type ScoreBand = 'Critical' | 'Struggling' | 'Strained' | 'Steady' | 'Secure';

/** Share of the total load each part carries; A is FIES. Sums to 1. */
const WEIGHTS = { A: 0.3, B: 0.25, C: 0.12, D: 0.08, E: 0.09, F: 0.09, G: 0.07 } as const;

const MAX_DOMAIN_ANSWER = 4;
const domainIds = Object.keys(DOMAINS) as DomainId[];

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const complete = <T>(xs: (T | null)[]): xs is T[] => xs.every((x) => x !== null);

/**
 * Food-security score, 0-100 where 100 means no food insecurity.
 * Returns null while any question is unanswered.
 */
export function computeScore(a: Answers): number | null {
  if (a.fies.length !== FIES_QUESTIONS.length || !complete(a.fies)) return null;

  let load = (a.fies.filter(Boolean).length / a.fies.length) * 100 * WEIGHTS.A;
  for (const id of domainIds) {
    const answers = a.domains[id];
    if (answers.length !== DOMAINS[id].length || !complete(answers)) return null;
    load += (mean(answers) / MAX_DOMAIN_ANSWER) * 100 * WEIGHTS[id];
  }
  return Math.round(100 - load);
}

export function scoreBand(score: number): ScoreBand {
  if (score < 20) return 'Critical';
  if (score < 40) return 'Struggling';
  if (score < 60) return 'Strained';
  if (score < 80) return 'Steady';
  return 'Secure';
}
