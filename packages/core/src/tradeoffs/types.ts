export const TRADEOFF_CATEGORIES = [
  'self-treat',
  'child-want',
  'meal-skipped',
  'child-meal',
  'cheaper-food',
  'bill-delayed',
  'borrowed',
  'health-skipped',
  'cut-back',
  'other',
] as const;

export type TradeoffCategory = (typeof TRADEOFF_CATEGORIES)[number];

/** One thing a person went without. Device-only, self-declared, never scored. */
export interface TradeoffEntry {
  id: string;
  /** ISO date-time. */
  at: string;
  category: TradeoffCategory;
  note?: string;
}

export const MAX_TRADEOFFS = 150;
export const MAX_NOTE = 140;
export const TRADEOFF_RETENTION_WEEKS = 8;
