import { useEffect, useMemo, useRef, useState } from 'react';
import {
  baselineFromProfile, DESCRIBE_NAME, explain, formatCents, removeWhatIf, renameWhatIf, restoreWhatIf, runWhatIf, sanitizeWhatIfs, saveWhatIf,
  weekSummary, type Profile, type SavedWhatIf, type Scenario,
} from '@culinerity/core';
import { defaultId } from './AddSpend';
import { ComparePicker, WhatIfCompare } from './WhatIfCompare';
import { WhatIfSaved } from './WhatIfSaved';
import { UndoStatus } from './UndoStatus';
import { FocusHeading } from './FocusHeading';
import { PageHeader } from './PageHeader';
import { WhatIfForm } from './WhatIfForm';
import { WhatIfNumbers } from './WhatIfNumbers';
import { WhatIfResults } from './WhatIfResults';
import { buildScenario, emptyValues, scenarioToDraft, type Errors, type FieldKey, type Kind, type StepKind } from './whatIfDraft';
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

const UNDO_MS = 6000;
type Undo = { kind: 'one'; item: SavedWhatIf; index: number } | { kind: 'all'; items: SavedWhatIf[] };

function Screen({ profile, now, clock, onChange, onSeeSwaps, onOpenBudget, onOpenSupport, onOpenNearby }: Props) {
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

  const [undos, setUndos] = useState<Undo[]>([]);
  const [cmpA, setCmpA] = useState<string | null>(null);
  const [cmpB, setCmpB] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<(() => void) | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(undoTimer.current), []);
  const saved = useMemo(() => sanitizeWhatIfs(profile.whatIfScenarios ?? []), [profile.whatIfScenarios]);
  useEffect(() => {
    const f = focusAfter.current;
    focusAfter.current = null;
    f?.();
  }, [profile.whatIfScenarios]);
  const q = (sel: string) => root.current?.querySelector<HTMLElement>(sel);
  const esc = (id: string) => CSS.escape(id);

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
  const store = (list: SavedWhatIf[]) => {
    const next = { ...profile };
    if (list.length > 0) next.whatIfScenarios = list;
    else delete next.whatIfScenarios;
    onChange(next);
  };
  const startUndoTimer = () => {
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndos([]), UNDO_MS);
  };
  const onSave = (name: string) => {
    if (!ran) return;
    const item: SavedWhatIf = { id: defaultId(), name, scenario: ran, savedAt: (clock?.() ?? now).toISOString() };
    const out = saveWhatIf(saved, item);
    if (out.error) return;
    focusAfter.current = () => q(`[data-open-id="${esc(item.id)}"]`)?.focus();
    store(out.list);
    setStatus(WHATIF_COPY.savedStatus(name));
  };
  const onRename = (id: string, name: string) => {
    store(renameWhatIf(saved, id, name));
    setStatus(WHATIF_COPY.renamedStatus(name));
  };
  const onRemove = (id: string) => {
    const out = removeWhatIf(saved, id);
    if (!out.removed || out.index === undefined) return;
    const at = out.index;
    const neighbour = saved[at + 1] ?? saved[at - 1];
    focusAfter.current = () => (neighbour ? q(`[data-remove-id="${esc(neighbour.id)}"]`) : q('[data-saved-heading]'))?.focus();
    store(out.list);
    setUndos((u) => [...u, { kind: 'one', item: out.removed as SavedWhatIf, index: at }]);
    startUndoTimer();
  };
  const onClear = () => {
    if (saved.length === 0) return;
    focusAfter.current = () => q('[data-saved-heading]')?.focus();
    store([]);
    setUndos((u) => [...u, { kind: 'all', items: saved }]);
    startUndoTimer();
  };
  const onUndo = () => {
    const last = undos[undos.length - 1];
    if (!last) return;
    let next: SavedWhatIf[];
    let first: SavedWhatIf;
    if (last.kind === 'one') {
      next = restoreWhatIf(saved, last.item, last.index);
      first = last.item;
    } else {
      next = last.items.concat(saved.filter((x) => !last.items.some((y) => y.id === x.id))).slice(0, 10);
      first = last.items[0];
    }
    focusAfter.current = () => q(`[data-open-id="${esc(first.id)}"]`)?.focus();
    store(next);
    const rest = undos.slice(0, -1);
    setUndos(rest);
    if (rest.length > 0) startUndoTimer();
    else clearTimeout(undoTimer.current);
  };
  const onOpen = (item: SavedWhatIf) => {
    const d = scenarioToDraft(item.scenario);
    setKind(d.kind); setPicked(d.picked); setValues(d.values); setErrors({}); setFormError(undefined);
    setRan(item.scenario);
    setStatus(WHATIF_COPY.openedStatus(item.name));
    setPressed((n) => n + 1);
  };
  const lastUndo = undos[undos.length - 1];
  const undoText = !lastUndo ? null
    : lastUndo.kind === 'one' ? WHATIF_COPY.removedStatus(lastUndo.item.name) : WHATIF_COPY.clearedStatus(lastUndo.items.length);

  const draftName = ran ? DESCRIBE_NAME(ran) : '';
  const byKey = (k: string | null): SavedWhatIf | 'draft' | null => (k === 'draft' ? (ran ? 'draft' : null) : saved.find((x) => x.id === k) ?? null);
  const pickA = byKey(cmpA);
  const pickB = byKey(cmpB);
  const compareOptions = [
    ...saved.map((x) => ({ value: x.id, label: x.name })),
    ...(ran ? [{ value: 'draft', label: WHATIF_COPY.compareDraft }] : []),
  ];

  const startAgain = () => {
    setCmpA(null); setCmpB(null);
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
    <div ref={root} className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <PageHeader photo="budget-harvest">
        <FocusHeading>{WHATIF_COPY.title}</FocusHeading>
      </PageHeader>
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
      <WhatIfSaved
        list={saved} canSave={ran !== null} draftName={draftName}
        onSave={onSave} onRename={onRename} onRemove={onRemove} onOpen={onOpen} onClear={onClear}
      />
      <UndoStatus text={undoText} onUndo={undoText ? onUndo : null} />
      {compareOptions.length >= 2 && (
        <section aria-labelledby="whatif-compare-pick" className="grid gap-4">
          <h2 id="whatif-compare-pick" className="font-display text-[24px]">{WHATIF_COPY.compareHeading}</h2>
          <ComparePicker options={compareOptions} first={pickA ? cmpA : null} second={pickB ? cmpB : null} onFirst={setCmpA} onSecond={setCmpB} />
          {pickA && pickB && (
            <WhatIfCompare a={pickA} b={pickB} baseline={baseline} now={now} draft={ran ? { scenario: ran, name: WHATIF_COPY.compareDraft } : null} />
          )}
        </section>
      )}
    </div>
  );
}
