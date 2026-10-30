import { useEffect, useMemo, useRef, useState } from 'react';
import { baselineFromProfile, explain, formatCents, runWhatIf, weekSummary, type Profile, type Scenario } from '@culinerity/core';
import { FocusHeading } from './FocusHeading';
import { WhatIfForm } from './WhatIfForm';
import { WhatIfNumbers } from './WhatIfNumbers';
import { WhatIfResults } from './WhatIfResults';
import { buildScenario, emptyValues, type Errors, type FieldKey, type Kind, type StepKind } from './whatIfDraft';
import { WHATIF_COPY } from './whatIfCopy';

interface Props {
  profile: Profile;
  now: Date;
  clock?: () => Date;
  /** Which profile this is; changing it resets the draft. */
  profileId?: string;
  onChange: (next: Profile) => void;
  onSeeSwaps: () => void;
  onOpenBudget: () => void;
  onOpenSupport: () => void;
  onOpenNearby: () => void;
}

/** Try a change on your own numbers. The draft lives in memory only; nothing is worked out until the button is pressed. */
export function WhatIfView(props: Props) {
  return <Screen key={props.profileId ?? 'guest'} {...props} />;
}

function Screen({ profile, now, onChange, onSeeSwaps, onOpenBudget, onOpenSupport, onOpenNearby }: Props) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [picked, setPicked] = useState<StepKind[]>([]);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [ran, setRan] = useState<Scenario | null>(null);
  const [status, setStatus] = useState('');
  const [pressed, setPressed] = useState(0);
  const [refused, setRefused] = useState(0);
  const [restarted, setRestarted] = useState(0);
  const form = useRef<HTMLDivElement>(null);
  const kindRef = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (pressed > 0) heading.current?.focus();
  }, [pressed]);
  useEffect(() => {
    if (restarted > 0) kindRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
  }, [restarted]);
  useEffect(() => {
    if (refused > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [refused]);

  const baseline = useMemo(() => baselineFromProfile(profile), [profile]);
  const result = ran ? runWhatIf(baseline, ran, now) : null;
  const explanation = ran && result?.status === 'ok' ? explain(result, ran, baseline) : null;

  const submit = () => {
    if (kind === null) return;
    const built = buildScenario(kind, picked, values);
    setErrors(built.ok ? {} : built.errors);
    setFormError(built.ok ? undefined : built.formError);
    if (!built.ok) { setRefused((n) => n + 1); return; }
    setRan(built.scenario);
    setStatus(WHATIF_COPY.resultsReady);
    setPressed((n) => n + 1);
  };
  const startAgain = () => {
    setKind(null); setPicked([]); setValues(emptyValues()); setErrors({}); setFormError(undefined); setRan(null); setStatus('');
    setRestarted((n) => n + 1);
  };

  // Money the swaps would cover: the week's gap, from the first affected week's figures.
  const swapsLine = (() => {
    if (!ran || result?.status !== 'ok') return null;
    const w = result.weeks[result.firstAffectedWeek - 1];
    const gap = Math.min(w.leftAfterFood ?? 0, w.leftAfterCosts ?? 0) < 0 ? -(w.leftAfterFood ?? w.leftAfterCosts ?? 0) : 0;
    const saved = Math.round(weekSummary(profile.weekSwaps, now.toISOString()).total * 100);
    if (gap <= 0 || saved <= 0) return null;
    return WHATIF_COPY.swapsCover(formatCents(saved), formatCents(Math.min(saved, gap)), formatCents(gap));
  })();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <FocusHeading>{WHATIF_COPY.title}</FocusHeading>
      <p className="text-base text-pretty">{WHATIF_COPY.notice}</p>
      <WhatIfNumbers profile={profile} onChange={onChange} onSaved={() => setStatus(WHATIF_COPY.numbersSaved)} />
      <div ref={form} className="grid gap-6">
        <WhatIfForm
          kind={kind} picked={picked} values={values} errors={errors} formError={formError} kindRef={kindRef}
          onKind={(k) => { setKind(k); setErrors({}); setFormError(undefined); }}
          onPick={(k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
          onValue={(key: FieldKey, v) => { setValues((all) => ({ ...all, [key]: v })); setErrors((e) => ({ ...e, [key]: undefined })); }}
          onSubmit={submit}
          onStartAgain={startAgain}
        />
      </div>
      <div role="status" className="sr-only">{status}</div>
      {ran && result && (
        <WhatIfResults
          scenario={ran} result={result} explanation={explanation} now={now} headingRef={heading}
          help={{ swapsLine, onSeeSwaps, onOpenBudget, onOpenSupport, onOpenNearby }}
        />
      )}
    </div>
  );
}
