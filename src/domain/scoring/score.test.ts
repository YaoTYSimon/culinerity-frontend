import { describe, expect, it } from 'vitest';
import { DOMAINS, FIES_QUESTIONS, type Answers } from './questionnaire';
import { computeScore, scoreBand } from './score';

type DomainId = keyof typeof DOMAINS;
const domainIds = Object.keys(DOMAINS) as DomainId[];

function build(fies: boolean | null, domain: number | null): Answers {
  return {
    fies: FIES_QUESTIONS.map(() => fies),
    domains: Object.fromEntries(
      domainIds.map((id) => [id, DOMAINS[id].map(() => domain)]),
    ) as Answers['domains'],
  };
}

describe('questionnaire', () => {
  it('has 8 FIES items and six domains of at least two items', () => {
    expect(FIES_QUESTIONS).toHaveLength(8);
    expect(domainIds).toHaveLength(6);
    domainIds.forEach((id) => expect(DOMAINS[id].length).toBeGreaterThanOrEqual(2));
  });
});

describe('computeScore', () => {
  it('is 0 when every answer is the worst', () => {
    expect(computeScore(build(true, 4))).toBe(0);
  });

  it('is 100 when every answer is the best', () => {
    expect(computeScore(build(false, 0))).toBe(100);
  });

  it('is null when a FIES answer is missing', () => {
    const a = build(false, 0);
    a.fies[3] = null;
    expect(computeScore(a)).toBeNull();
  });

  it('is null when a domain answer is missing', () => {
    const a = build(false, 0);
    a.domains[domainIds[2]][0] = null;
    expect(computeScore(a)).toBeNull();
  });

  it('never rises when one more FIES answer flips to true', () => {
    const a = build(false, 2);
    let previous = computeScore(a)!;
    for (let i = 0; i < a.fies.length; i++) {
      a.fies[i] = true;
      const next = computeScore(a)!;
      expect(next).toBeLessThanOrEqual(previous);
      previous = next;
    }
  });
});

describe('scoreBand', () => {
  it.each([
    [0, 'Critical'], [19, 'Critical'],
    [20, 'Struggling'], [39, 'Struggling'],
    [40, 'Strained'], [59, 'Strained'],
    [60, 'Steady'], [79, 'Steady'],
    [80, 'Secure'], [100, 'Secure'],
  ] as const)('%i is %s', (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});

describe('labels', () => {
  it('has five frequency labels from Never to Almost always', async () => {
    const { FREQUENCIES } = await import('./questionnaire');
    expect(FREQUENCIES).toHaveLength(5);
    expect(FREQUENCIES[0]).toBe('Never');
    expect(FREQUENCIES[4]).toBe('Almost always');
  });

  it('names every domain', async () => {
    const { DOMAIN_LABELS } = await import('./questionnaire');
    domainIds.forEach((id) => expect(DOMAIN_LABELS[id]).toBeTruthy());
    expect(DOMAIN_LABELS.B).toBe('Mental bandwidth');
  });
});
