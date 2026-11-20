import { TRADEOFF_TIER, type SupportTier } from './categories';
import type { TradeoffCategory } from './types';

export interface Helpline {
  id: 'lifeline' | 'kids-helpline' | 'national-debt-helpline' | 'safe-steps';
  name: string;
  /** The number as people read it. */
  display: string;
  /** Digits only, for a tel: link. */
  tel: string;
  /** Plain words for when it answers. */
  hours: string;
  verifiedOn: '2026-10-29' | '2026-11-20';
}

/** Checked on each service's own site on 29 October 2026 (Safe Steps: 20 November 2026). */
export const HELPLINES: Record<Helpline['id'], Helpline> = {
  lifeline: { id: 'lifeline', name: 'Lifeline', display: '13 11 14', tel: '131114', hours: 'any time', verifiedOn: '2026-10-29' },
  'kids-helpline': { id: 'kids-helpline', name: 'Kids Helpline', display: '1800 55 1800', tel: '1800551800', hours: 'any time', verifiedOn: '2026-10-29' },
  'national-debt-helpline': {
    id: 'national-debt-helpline', name: 'National Debt Helpline', display: '1800 007 007', tel: '1800007007', hours: 'weekdays', verifiedOn: '2026-10-29',
  },
  'safe-steps': { id: 'safe-steps', name: 'Safe Steps', display: '1800 015 188', tel: '1800015188', hours: 'any time', verifiedOn: '2026-11-20' },
};

/** Foodbank's Find Food page (the old foodbank.org.au/find-food/ address redirects here). */
export const FOODBANK_FIND_FOOD = 'https://findfood.foodbank.org.au/';

export interface Support {
  tier: SupportTier;
  helplines: Helpline['id'][];
  findFood: boolean;
  /** Offer the in-app list of food support places. */
  foodSupportView: boolean;
}

const BY_TIER: Record<SupportTier, Omit<Support, 'tier'>> = {
  none: { helplines: [], findFood: false, foodSupportView: false },
  food: { helplines: ['lifeline'], findFood: true, foodSupportView: true },
  'food+child': { helplines: ['lifeline', 'kids-helpline'], findFood: true, foodSupportView: true },
  money: { helplines: ['national-debt-helpline', 'lifeline'], findFood: false, foodSupportView: false },
  health: { helplines: ['national-debt-helpline', 'lifeline'], findFood: false, foodSupportView: false },
};

/** What help to offer, calmly, after an entry in this category. Pure: nothing is stored. */
export function supportFor(category: TradeoffCategory): Support {
  const tier = TRADEOFF_TIER[category];
  return { tier, ...BY_TIER[tier], helplines: [...BY_TIER[tier].helplines] };
}
