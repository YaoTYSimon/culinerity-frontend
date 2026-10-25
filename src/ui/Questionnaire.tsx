import { useState } from 'react';
import {
  DOMAIN_LABELS,
  DOMAINS,
  FIES_QUESTIONS,
  FREQUENCIES,
  type Answers,
  type DomainId,
} from '../domain/scoring/questionnaire';
import { computeScore } from '../domain/scoring/score';

interface Props {
  onComplete: (score: number) => void;
  onSkip: () => void;
}

const DOMAIN_IDS = Object.keys(DOMAINS) as DomainId[];
const SECTION_NAMES = ['Food and money', ...DOMAIN_IDS.map((id) => DOMAIN_LABELS[id])];

const empty = (): Answers => ({
  fies: FIES_QUESTIONS.map(() => null),
  domains: Object.fromEntries(DOMAIN_IDS.map((id) => [id, DOMAINS[id].map(() => null)])) as Answers['domains'],
});

const primaryBtn =
  'min-h-11 rounded bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const quietBtn =
  'min-h-11 rounded border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Choice({
  name, label, checked, onSelect,
}: { name: string; label: string; checked: boolean; onSelect: () => void }) {
  return (
    <label
      className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded border px-2 py-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary'
      }`}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onSelect} aria-label={label} />
      <span aria-hidden="true">{label}</span>
    </label>
  );
}

export function Questionnaire({ onComplete, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(empty);
  const [step, setStep] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);
  const last = SECTION_NAMES.length - 1;

  const setFies = (i: number, v: boolean) => {
    setMissing([]);
    setAnswers((a) => ({ ...a, fies: a.fies.map((x, j) => (j === i ? v : x)) }));
  };
  const setDomain = (id: DomainId, i: number, v: number) => {
    setMissing([]);
    setAnswers((a) => ({ ...a, domains: { ...a.domains, [id]: a.domains[id].map((x, j) => (j === i ? v : x)) } }));
  };

  function missingSections(): string[] {
    const out: string[] = [];
    const f = answers.fies.filter((x) => x === null).length;
    if (f) out.push(`Part 1 of ${last + 1}: ${SECTION_NAMES[0]} (${f} unanswered)`);
    for (const [k, id] of DOMAIN_IDS.entries()) {
      const n = answers.domains[id].filter((x) => x === null).length;
      if (n) out.push(`Part ${k + 2} of ${last + 1}: ${DOMAIN_LABELS[id]} (${n} unanswered)`);
    }
    return out;
  }

  function finish() {
    const gaps = missingSections();
    const score = computeScore(answers);
    if (gaps.length || score === null) {
      setMissing(gaps);
      return;
    }
    setMissing([]);
    onComplete(score);
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-6 text-foreground" aria-labelledby="q-title">
      <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Part {step + 1} of {last + 1}
      </p>
      <div className="mb-4 h-1.5 rounded bg-secondary" aria-hidden="true">
        <div className="h-full rounded bg-primary" style={{ width: `${((step + 1) / (last + 1)) * 100}%` }} />
      </div>
      <h2 id="q-title" className="text-lg font-semibold">
        {SECTION_NAMES[step]}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {step === 0
          ? 'Lots of people find food hard to manage at times. Answer for the past 4 weeks, only as far as you are comfortable. Your answers stay on this device.'
          : 'In the past 4 weeks, how often...'}
      </p>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">Your score: 100 = secure, 0 = critical.</p>

      <div className="grid gap-3">
        {step === 0
          ? FIES_QUESTIONS.map((q, i) => (
              <fieldset key={q} className="rounded border border-border bg-card p-4">
                <legend className="sr-only">{q}</legend>
                <p className="mb-3 text-sm" aria-hidden="true">{q}</p>
                <div className="flex gap-2">
                  <Choice name={`fies-${i}`} label="Yes" checked={answers.fies[i] === true} onSelect={() => setFies(i, true)} />
                  <Choice name={`fies-${i}`} label="No" checked={answers.fies[i] === false} onSelect={() => setFies(i, false)} />
                </div>
              </fieldset>
            ))
          : DOMAINS[DOMAIN_IDS[step - 1]].map((q, i) => {
              const id = DOMAIN_IDS[step - 1];
              return (
                <fieldset key={q} className="rounded border border-border bg-card p-4">
                  <legend className="sr-only">{q}</legend>
                  <p className="mb-3 text-sm" aria-hidden="true">{q}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {FREQUENCIES.map((f, v) => (
                      <Choice key={f} name={`${id}-${i}`} label={f} checked={answers.domains[id][i] === v} onSelect={() => setDomain(id, i, v)} />
                    ))}
                  </div>
                </fieldset>
              );
            })}
      </div>

      {missing.length > 0 && (
        <p role="alert" className="mt-4 rounded border border-border bg-card p-3 text-sm">
          Almost there. Still to answer: {missing.join('; ')}. Use Back to find them, or skip for now.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {step > 0 && (
          <button type="button" className={quietBtn} onClick={() => setStep(step - 1)}>Back</button>
        )}
        {step < last ? (
          <button type="button" className={primaryBtn} onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button type="button" className={primaryBtn} onClick={finish}>See my score</button>
        )}
        <button type="button" className={`${quietBtn} ml-auto`} onClick={onSkip}>Skip for now</button>
      </div>
    </section>
  );
}
