import type { TradeoffCategory } from './types';

export type SupportTier = 'none' | 'food' | 'food+child' | 'money' | 'health';

export const TRADEOFF_LABELS: Record<TradeoffCategory, string> = {
  'self-treat': 'Went without something nice for myself',
  'child-want': 'Did not buy my child something they wanted',
  'meal-skipped': 'Skipped or shrank a meal myself',
  'child-meal': 'My child had a smaller meal, or went without one',
  'cheaper-food': 'Bought cheaper food we like less',
  'bill-delayed': 'Paid a bill late, or put it off',
  borrowed: 'Borrowed money or used savings',
  'health-skipped': 'Skipped medicine or a health visit',
  'cut-back': 'Cut back on heating, transport or seeing people',
  other: 'Something else',
};

export const TRADEOFF_TIER: Record<TradeoffCategory, SupportTier> = {
  'self-treat': 'none',
  'child-want': 'none',
  'meal-skipped': 'food',
  'child-meal': 'food+child',
  'cheaper-food': 'none',
  'bill-delayed': 'money',
  borrowed: 'money',
  'health-skipped': 'health',
  'cut-back': 'none',
  other: 'none',
};
