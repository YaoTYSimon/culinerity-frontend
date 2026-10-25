import { useEffect, useRef, useState } from 'react';
import { DOMAINS, FIES_QUESTIONS, FREQUENCIES, type Answers, type DomainId, computeScore } from '@culinerity/core';
import { photoUrl } from '../assets/photos';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

interface Props {
  onComplete: (score: number) => void;
  onSkip: () => void;
}

const DOMAIN_IDS = Object.keys(DOMAINS) as DomainId[];

type Step =
  | { kind: 'fies'; index: number; text: string }
  | { kind: 'domain'; id: DomainId; index: number; text: string };

/** FIES first, then each domain's items in order. Wording and scoring stay in core. */
const STEPS: Step[] = [
  ...FIES_QUESTIONS.map((text, index): Step => ({ kind: 'fies', index, text })),
  ...DOMAIN_IDS.flatMap((id) => DOMAINS[id].map((text, index): Step => ({ kind: 'domain', id, index, text }))),
];
const TOTAL = STEPS.length;

const empty = (): Answers => ({
  fies: FIES_QUESTIONS.map(() => null),
  domains: Object.fromEntries(DOMAIN_IDS.map((id) => [id, DOMAINS[id].map(() => null)])) as Answers['domains'],
});

function Pill({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <PillButton
      variant={selected ? 'primary' : 'surface'}
      aria-pressed={selected}
      onClick={onSelect}
      className="w-full"
    >
      {label}
    </PillButton>
  );
}

/** One question per screen. Answering moves on; Back keeps earlier answers selected. */
export function Questionnaire({ onComplete, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(empty);
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = STEPS[step];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const answered = (): number | boolean | null =>
    current.kind === 'fies' ? answers.fies[current.index] : answers.domains[current.id][current.index];

  function commit(next: Answers) {
    setAnswers(next);
    if (step < TOTAL - 1) {
      setStep(step + 1);
      return;
    }
    const score = computeScore(next);
    if (score !== null) onComplete(score);
  }

  const answerFies = (v: boolean) =>
    commit({ ...answers, fies: answers.fies.map((x, j) => (current.kind === 'fies' && j === current.index ? v : x)) });
  const answerDomain = (v: number) => {
    if (current.kind !== 'domain') return;
    const { id, index } = current;
    commit({ ...answers, domains: { ...answers.domains, [id]: answers.domains[id].map((x, j) => (j === index ? v : x)) } });
  };

  const value = answered();

  return (
    <section className="-mx-4 flex min-h-[calc(100svh-9rem)] flex-col overflow-x-clip px-4 text-ink" aria-label="Check-in">
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex min-w-0 flex-1 items-center gap-[3px]">
          {STEPS.map((s, i) => (
            <span
              key={`${s.kind}-${i}`}
              className={`h-1.5 max-w-1.5 min-w-[3px] flex-1 rounded-full ${i < step ? 'bg-accent' : i === step ? 'bg-ink' : 'bg-surface'}`}
            />
          ))}
        </div>
        <p className="shrink-0 text-sm text-muted">{step + 1} of {TOTAL}</p>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        Question {step + 1} of {TOTAL}: {current.text}
      </div>

      <div className="mt-4 flex justify-end">
        <RoundPhoto src={photoUrl('welcome-soup')} size={132} eager className="-mr-10" />
      </div>

      <div className="-mt-2 grid gap-3">
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display text-[27px] leading-tight font-bold text-balance outline-none"
        >
          {current.text}
        </h1>
        <p className="text-sm text-pretty text-muted">
          {current.kind === 'fies'
            ? 'Answer for the past 4 weeks, only as far as you are comfortable.'
            : 'Thinking about the past 4 weeks, how often was this true?'}
        </p>
      </div>

      <div
        role="group"
        aria-label="Answers"
        className={`mt-6 grid gap-3 ${current.kind === 'fies' ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        {current.kind === 'fies' ? (
          <>
            <Pill label="Yes" selected={value === true} onSelect={() => answerFies(true)} />
            <Pill label="No" selected={value === false} onSelect={() => answerFies(false)} />
          </>
        ) : (
          FREQUENCIES.map((f, v) => (
            <Pill key={f} label={f} selected={value === v} onSelect={() => answerDomain(v)} />
          ))
        )}
      </div>

      <div className="mt-auto grid gap-2 pt-8">
        <div className="flex items-center justify-between">
          <PillButton variant="text" onClick={() => setStep(Math.max(0, step - 1))} className="-ml-3">
            Back
          </PillButton>
          <PillButton variant="text" onClick={onSkip} className="-mr-3">
            Skip for now
          </PillButton>
        </div>
        <p className="text-center text-xs text-muted">Answers stay on this phone</p>
      </div>
    </section>
  );
}
