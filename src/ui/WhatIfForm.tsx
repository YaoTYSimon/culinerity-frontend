import type { ReactNode, Ref } from 'react';
import { PillButton } from './PillButton';
import { PillRadio, TextField, TryRow, type Option } from './WhatIfFields';
import { KIND_LABELS, STEP_KINDS, type Errors, type FieldKey, type Kind, type StepKind, type Values } from './whatIfDraft';
import { WHATIF_COPY } from './whatIfCopy';

interface Props {
  kind: Kind | null;
  picked: StepKind[];
  values: Values;
  errors: Errors;
  formError?: string;
  /** Wraps the kind pills so "Start again" can return focus to the first one. */
  kindRef: Ref<HTMLDivElement>;
  onKind: (k: Kind) => void;
  onPick: (k: StepKind) => void;
  onValue: (key: FieldKey, value: string) => void;
  onSubmit: () => void;
  onStartAgain: () => void;
}

const KIND_OPTIONS: Option<Kind>[] = [...STEP_KINDS, 'combined' as const].map((k) => ({ value: k, label: KIND_LABELS[k] }));
const DIRECTION: Option<string>[] = [{ value: 'up', label: 'goes up' }, { value: 'down', label: 'goes down' }];
const PER: Option<string>[] = [{ value: 'week', label: 'per week' }, { value: 'fortnight', label: 'per fortnight' }, { value: 'month', label: 'per month' }];
const EVERY: Option<string>[] = [{ value: '1', label: 'every week' }, { value: '2', label: 'every second week' }, { value: '4', label: 'every fourth week' }];
const WEEKS: Option<string>[] = [1, 2, 3, 4].map((n) => ({ value: String(n), label: `Week ${n}` }));
const UNITS: Option<string>[] = [{ value: 'shifts', label: 'Shifts' }, { value: 'hours', label: 'Hours' }];
const MODES: Option<string>[] = [{ value: 'percent', label: 'a percentage' }, { value: 'dollars', label: 'in dollars' }];

const PCT_HINT = 'For example 10 or 7.5';
const MONEY_HINT = 'In dollars, like 120 or 120.50';

/** The inputs for one kind of change. */
function Block({ kind, v, errors, set, title }: { kind: StepKind; v: Values; errors: Errors; set: (k: FieldKey, value: string) => void; title?: string }) {
  const radio = (key: FieldKey, name: string, options: Option<string>[]) => (
    <PillRadio name={name} options={options} value={v[key]} onChange={(next) => set(key, next)} />
  );
  const text = (key: FieldKey, label: string, hint: string) => (
    <TextField label={label} hint={hint} value={v[key]} error={errors[key]} onChange={(next) => set(key, next)} />
  );
  const tryRow = (key: FieldKey) => <TryRow label={WHATIF_COPY.tryNumber} onPick={(n) => set(key, n)} />;
  let body: ReactNode;
  switch (kind) {
    case 'lose-work': {
      const unit = v['lose.unit'] === 'hours' ? 'hour' : 'shift';
      body = (
        <>
          {radio('lose.unit', 'Shifts or hours', UNITS)}
          {text('lose.count', `Number of ${unit}s`, 'In halves, like 1 or 2.5')}
          {text('lose.pay', `Take-home pay per ${unit} ($)`, 'What you take home after tax, in dollars. We have no number for this, so we ask.')}
          {radio('lose.every', 'How often', EVERY)}
        </>
      );
      break;
    }
    case 'pay-change':
      body = <>{radio('pay.dir', 'Direction', DIRECTION)}{text('pay.pct', 'Pay change (%)', PCT_HINT)}{tryRow('pay.pct')}</>;
      break;
    case 'food-price-change':
      body = <>{radio('food.dir', 'Direction', DIRECTION)}{text('food.pct', 'Food price change (%)', PCT_HINT)}{tryRow('food.pct')}</>;
      break;
    case 'payment-change':
      body = <>{radio('payment.dir', 'Direction', DIRECTION)}{text('payment.amt', 'Payment change ($)', MONEY_HINT)}{radio('payment.per', 'Payment change: enter as', PER)}</>;
      break;
    case 'one-off-bill':
      body = <>{text('bill.amt', 'Bill amount ($)', MONEY_HINT)}{radio('bill.week', 'Which week', WEEKS)}</>;
      break;
    case 'rent-change':
      body = (
        <>
          {radio('rent.dir', 'Direction', DIRECTION)}
          {radio('rent.mode', 'Change rent by', MODES)}
          {v['rent.mode'] === 'dollars' ? (
            <>{text('rent.amt', 'Rent change ($)', MONEY_HINT)}{radio('rent.per', 'Rent change: enter as', PER)}</>
          ) : (
            <>{text('rent.pct', 'Rent change (%)', PCT_HINT)}{tryRow('rent.pct')}</>
          )}
        </>
      );
      break;
  }
  return (
    <fieldset className="grid min-w-0 gap-4">
      {title && <legend className="mb-3 font-display text-[20px]">{title}</legend>}
      {body}
    </fieldset>
  );
}

/** Pick a change, fill in its inputs, press the button. Nothing is worked out until the button is pressed. */
export function WhatIfForm({ kind, picked, values, errors, formError, kindRef, onKind, onPick, onValue, onSubmit, onStartAgain }: Props) {
  const active: StepKind[] = kind === null ? [] : kind === 'combined' ? STEP_KINDS.filter((k) => picked.includes(k)) : [kind];
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <h2 className="font-display text-[24px]">{WHATIF_COPY.pickHeading}</h2>
      <div ref={kindRef}>
        <PillRadio name={WHATIF_COPY.pickHeading} options={KIND_OPTIONS} value={kind} onChange={onKind} />
      </div>
      {kind === 'combined' && (
        <div role="group" aria-label={WHATIF_COPY.whichChanges} className="flex flex-wrap gap-2">
          {STEP_KINDS.map((k) => (
            <PillButton key={k} variant={picked.includes(k) ? 'primary' : 'surface'} aria-pressed={picked.includes(k)} onClick={() => onPick(k)}>
              {KIND_LABELS[k]}
            </PillButton>
          ))}
        </div>
      )}
      {active.map((k) => (
        <Block key={k} kind={k} v={values} errors={errors} set={onValue} title={kind === 'combined' ? KIND_LABELS[k] : undefined} />
      ))}
      {formError && <p className="text-base font-semibold text-pretty">{formError}</p>}
      {kind !== null && (
        <div className="flex flex-wrap items-center gap-3">
          <PillButton type="submit">{WHATIF_COPY.show}</PillButton>
          <PillButton variant="text" onClick={onStartAgain}>{WHATIF_COPY.startAgain}</PillButton>
        </div>
      )}
    </form>
  );
}
