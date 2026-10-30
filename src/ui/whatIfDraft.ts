import {
  formatCents, LIMITS, parseMoney, parsePercentBp, toWeeklyCents, validateScenario,
  type Cents, type Direction, type Per, type Scenario, type Step,
} from '@culinerity/core';
import { WHATIF_COPY } from './whatIfCopy';

export type StepKind = Step['kind'];
export type Kind = StepKind | 'combined';

export const STEP_KINDS: readonly StepKind[] = ['lose-work', 'pay-change', 'payment-change', 'one-off-bill', 'rent-change', 'food-price-change'];

export const KIND_LABELS: Record<Kind, string> = {
  'lose-work': 'Lose shifts or hours',
  'pay-change': 'Pay changes',
  'payment-change': 'Payment changes',
  'one-off-bill': 'A one-off bill',
  'rent-change': 'Rent changes',
  'food-price-change': 'Food prices change',
  combined: 'A few things at once',
};

export type FieldKey =
  | 'lose.unit' | 'lose.count' | 'lose.pay' | 'lose.every'
  | 'pay.dir' | 'pay.pct'
  | 'payment.dir' | 'payment.amt' | 'payment.per'
  | 'bill.amt' | 'bill.week'
  | 'rent.dir' | 'rent.mode' | 'rent.pct' | 'rent.amt' | 'rent.per'
  | 'food.dir' | 'food.pct';
export type Values = Record<FieldKey, string>;
export type Errors = Partial<Record<FieldKey, string>>;

export const emptyValues = (): Values => ({
  'lose.unit': 'shifts', 'lose.count': '', 'lose.pay': '', 'lose.every': '1',
  'pay.dir': 'down', 'pay.pct': '',
  'payment.dir': 'down', 'payment.amt': '', 'payment.per': 'week',
  'bill.amt': '', 'bill.week': '1',
  'rent.dir': 'up', 'rent.mode': 'percent', 'rent.pct': '', 'rent.amt': '', 'rent.per': 'week',
  'food.dir': 'up', 'food.pct': '',
});

export type Built = { ok: true; scenario: Scenario } | { ok: false; errors: Errors; formError?: string };

/** A typed dollar amount as cents, or an error message on `key`. `per` converts to weekly before the limit check. */
function money(v: Values, key: FieldKey, errs: Errors, limit: Cents, suffix: string, per?: Per): Cents | null {
  const n = parseMoney(v[key], { allowZero: false });
  if (n === null) { errs[key] = WHATIF_COPY.invalidMoney; return null; }
  const cents = Math.round(n * 100);
  if ((per ? toWeeklyCents({ cents, per }) : cents) > limit) { errs[key] = WHATIF_COPY.tooBig(`${formatCents(limit)}${suffix}`); return null; }
  return cents;
}

function percent(v: Values, key: FieldKey, errs: Errors): number | null {
  const bp = parsePercentBp(v[key], { max: Infinity });
  if (bp === null || bp < 1) { errs[key] = WHATIF_COPY.invalidPercent; return null; }
  if (bp > LIMITS.maxBp) { errs[key] = WHATIF_COPY.tooBig(`${LIMITS.maxBp / 100}%`); return null; }
  return bp;
}

const COUNT = /^(\d{1,3})(?:\.(0|5|00|50))?$/;
function count(v: Values, key: FieldKey, errs: Errors, r: { min: number; max: number }): number | null {
  const m = COUNT.exec(v[key].trim());
  const n = m ? Number(m[1]) + (m[2]?.startsWith('5') ? 0.5 : 0) : NaN;
  if (!m) { errs[key] = WHATIF_COPY.invalidCount; return null; }
  if (n < r.min || n > r.max) { errs[key] = WHATIF_COPY.countRange(r.min, r.max); return null; }
  return n;
}

function buildStep(kind: StepKind, v: Values, errs: Errors): Step | null {
  switch (kind) {
    case 'lose-work': {
      const unit = v['lose.unit'] === 'hours' ? 'hours' : 'shifts';
      const c = count(v, 'lose.count', errs, unit === 'hours' ? LIMITS.hours : LIMITS.shifts);
      const pay = money(v, 'lose.pay', errs, LIMITS.payPerUnit, unit === 'hours' ? ' an hour' : ' a shift');
      const every = Number(v['lose.every']);
      return c === null || pay === null ? null : { kind, unit, count: c, payPerUnit: pay, everyWeeks: (every === 2 || every === 4 ? every : 1) as 1 | 2 | 4 };
    }
    case 'pay-change': {
      const bp = percent(v, 'pay.pct', errs);
      return bp === null ? null : { kind, direction: v['pay.dir'] as Direction, bp };
    }
    case 'food-price-change': {
      const bp = percent(v, 'food.pct', errs);
      return bp === null ? null : { kind, direction: v['food.dir'] as Direction, bp };
    }
    case 'payment-change': {
      const per = v['payment.per'] as Per;
      const cents = money(v, 'payment.amt', errs, LIMITS.paymentWeekly, ' a week', per);
      return cents === null ? null : { kind, direction: v['payment.dir'] as Direction, amount: { cents, per } };
    }
    case 'one-off-bill': {
      const cents = money(v, 'bill.amt', errs, LIMITS.oneOff, '');
      return cents === null ? null : { kind, cents, week: Number(v['bill.week']) as 1 | 2 | 3 | 4 };
    }
    case 'rent-change': {
      const direction = v['rent.dir'] as Direction;
      if (v['rent.mode'] === 'dollars') {
        const per = v['rent.per'] as Per;
        const cents = money(v, 'rent.amt', errs, LIMITS.paymentWeekly, ' a week', per);
        return cents === null ? null : { kind, direction, by: { mode: 'dollars', amount: { cents, per } } };
      }
      const bp = percent(v, 'rent.pct', errs);
      return bp === null ? null : { kind, direction, by: { mode: 'percent', bp } };
    }
  }
}

/** The scenario the form describes, or a message on every field that can't be used. Never throws. */
export function buildScenario(kind: Kind, picked: readonly StepKind[], v: Values): Built {
  const errors: Errors = {};
  if (kind === 'combined' && picked.length < 2) return { ok: false, errors, formError: WHATIF_COPY.pickTwo };
  const kinds = kind === 'combined' ? STEP_KINDS.filter((k) => picked.includes(k)) : [kind];
  const steps = kinds.map((k) => buildStep(k, v, errors));
  if (Object.keys(errors).length > 0 || steps.some((s) => s === null)) return { ok: false, errors };
  const raw: Scenario = kind === 'combined' ? { kind: 'combined', steps: steps as Step[] } : (steps[0] as Step);
  const checked = validateScenario(raw);
  return checked.ok ? { ok: true, scenario: checked.scenario } : { ok: false, errors, formError: WHATIF_COPY.invalidForm };
}

const dollars = (cents: Cents): string => {
  const t = (cents / 100).toFixed(2);
  return t.endsWith('.00') ? t.slice(0, -3) : t;
};

function fillStep(s: Step, v: Values): void {
  switch (s.kind) {
    case 'lose-work':
      v['lose.unit'] = s.unit; v['lose.count'] = String(s.count); v['lose.pay'] = dollars(s.payPerUnit); v['lose.every'] = String(s.everyWeeks);
      return;
    case 'pay-change':
      v['pay.dir'] = s.direction; v['pay.pct'] = String(s.bp / 100);
      return;
    case 'food-price-change':
      v['food.dir'] = s.direction; v['food.pct'] = String(s.bp / 100);
      return;
    case 'payment-change':
      v['payment.dir'] = s.direction; v['payment.amt'] = dollars(s.amount.cents); v['payment.per'] = s.amount.per;
      return;
    case 'one-off-bill':
      v['bill.amt'] = dollars(s.cents); v['bill.week'] = String(s.week);
      return;
    case 'rent-change':
      v['rent.dir'] = s.direction; v['rent.mode'] = s.by.mode;
      if (s.by.mode === 'percent') v['rent.pct'] = String(s.by.bp / 100);
      else { v['rent.amt'] = dollars(s.by.amount.cents); v['rent.per'] = s.by.amount.per; }
      return;
  }
}

/** The form state that builds this scenario again: the reverse of buildScenario. */
export function scenarioToDraft(s: Scenario): { kind: Kind; picked: StepKind[]; values: Values } {
  const values = emptyValues();
  const steps = s.kind === 'combined' ? s.steps : [s];
  steps.forEach((step) => fillStep(step, values));
  return { kind: s.kind, picked: s.kind === 'combined' ? steps.map((x) => x.kind) : [], values };
}
