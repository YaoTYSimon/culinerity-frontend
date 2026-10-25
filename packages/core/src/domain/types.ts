/** Australian dollars. */
export type Aud = number;

export interface Profile {
  foodBudgetWeekly?: Aud;
  incomeWeekly?: Aud;
  suburb?: string;
  score?: number;
  scoreTakenAt?: string;
}

export interface PricePoint {
  itemId: string;
  store: 'Coles' | 'Woolworths' | 'Aldi' | 'IGA' | 'Market';
  pricePerServe: Aud;
  unitLabel: string;
  observedAt: string;
  isSample: boolean;
}

export interface Nutrition {
  itemId: string;
  energyKj: number;
  proteinG: number;
  fibreG: number;
  sugarG: number;
  sodiumMg: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

export interface SwapCandidate {
  craving: FoodItem;
  alternative: FoodItem;
  note: string;
}

export interface SupportPlace {
  id: string;
  name: string;
  kind: 'pantry' | 'community-fridge' | 'meal';
  suburb: string;
  notes: string;
  isSample: boolean;
}
