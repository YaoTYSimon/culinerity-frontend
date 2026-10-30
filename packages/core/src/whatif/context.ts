import type { Scenario, Step } from './types';

/** Indicator ids shown beside a result, per change kind. Context only: never subtracted from the person's numbers. */
export const WHATIF_CONTEXT: Record<Step['kind'], string[]> = {
  'lose-work': ['w-min-wage-hour', 'w-min-wage-week'],
  'pay-change': ['w-min-wage-hour', 'w-min-wage-week'],
  'payment-change': [
    'w-jobseeker-single',
    'w-jobseeker-single-kids',
    'w-jobseeker-partnered',
    'w-jobseeker-energy',
    'b-poverty-line-single',
    'b-poverty-line-couple-2kids',
    'b-jobseeker-shortfall',
    'b-parenting-shortfall',
  ],
  'one-off-bill': [],
  'rent-change': ['w-rent-melb-median', 'w-rent-index-year'],
  'food-price-change': ['b-cpi-food-melbourne', 'b-cpi-food-australia'],
};

/** The ids for a scenario; for `combined`, the union of its steps in first-seen order, without duplicates. A fresh array each call. */
export function contextIds(s: Scenario): string[] {
  const kinds = s.kind === 'combined' ? s.steps.map((x) => x.kind) : [s.kind];
  return [...new Set(kinds.flatMap((k) => WHATIF_CONTEXT[k]))];
}

export interface HelpLine {
  id: string;
  label: string;
  phone?: string;
  hours?: string;
  url: string;
  /** Id of the research source row (docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs-sources.json). */
  sourceId: string;
  /** The day the number, hours and link were last checked on the official page. */
  verifiedOn: string;
}

export const WHATIF_HELP: HelpLine[] = [
  {
    id: 'national-debt-helpline',
    label: 'National Debt Helpline (free financial counselling)',
    phone: '1800 007 007',
    hours: 'weekdays 9:30am to 4:30pm, chat weekdays 9am to 8pm',
    url: 'https://ndh.org.au/',
    sourceId: 'national-debt-helpline',
    verifiedOn: '2026-10-29',
  },
  {
    id: 'foodbank-find-food',
    label: 'Foodbank Find Food',
    url: 'https://findfood.foodbank.org.au/',
    sourceId: 'foodbank-find-food',
    verifiedOn: '2026-10-29',
  },
];
