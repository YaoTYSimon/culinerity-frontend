/** What-if model. Money is integer cents, percentages are integer basis points (100 bp = 1%). */

export type Cents = number;
export type Bp = number;
export type Per = 'week' | 'fortnight' | 'month';
export type Direction = 'up' | 'down';

export interface Recurring {
  cents: Cents;
  per: Per;
}

export type Step =
  | { kind: 'lose-work'; unit: 'shifts' | 'hours'; count: number; payPerUnit: Cents; everyWeeks: 1 | 2 | 4 }
  | { kind: 'pay-change'; direction: Direction; bp: Bp }
  | { kind: 'payment-change'; direction: Direction; amount: Recurring }
  | { kind: 'one-off-bill'; cents: Cents; week: 1 | 2 | 3 | 4 }
  | { kind: 'rent-change'; direction: Direction; by: { mode: 'percent'; bp: Bp } | { mode: 'dollars'; amount: Recurring } }
  | { kind: 'food-price-change'; direction: Direction; bp: Bp };

export type Scenario = Step | { kind: 'combined'; steps: Step[] };

export interface Baseline {
  incomeWeekly?: Cents;
  housingWeekly?: Cents;
  otherFixedWeekly?: Cents;
  foodBudgetWeekly?: Cents;
}
export type BaselineField = keyof Baseline;

export interface WeekFigures {
  income: Cents | null;
  housing: Cents | null;
  otherFixed: Cents | null;
  oneOff: Cents;
  food: Cents | null;
  leftAfterCosts: Cents | null;
  leftAfterFood: Cents | null;
  foodDays: number | null;
}

/** Same fields as WeekFigures except foodDays, summed over four weeks; null if any week is null. */
export type Totals = Omit<WeekFigures, 'foodDays'>;

export type WhatIfResult =
  | {
      status: 'ok';
      weekStarts: [string, string, string, string];
      before: WeekFigures;
      weeks: [WeekFigures, WeekFigures, WeekFigures, WeekFigures];
      before4: Totals;
      after4: Totals;
      change4: Totals;
      firstAffectedWeek: 1 | 2 | 3 | 4;
      clamped: ('income' | 'housing' | 'food')[];
    }
  | { status: 'needs'; missing: BaselineField[] }
  | { status: 'invalid'; field: string };
