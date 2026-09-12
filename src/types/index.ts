export interface UserProfile {
  name: string;
  postcode: string;
  suburb: string;
  householdSize: number;
  dependents: number;
  culturalBackground: string;
  dietaryPreferences: string[];
  weeklyBudget: number;
  cookingTimeAvailable: 'minimal' | 'moderate' | 'flexible';
  costPriority: 1 | 2 | 3;
  timePriority: 1 | 2 | 3;
  culturalPriority: 1 | 2 | 3;
  weeklyIncome: number;
  weeklyRent: number;
  fiesAnswers: boolean[];
  fiesScore: number;
  onboardingComplete: boolean;
  privacyDataSharing: boolean;
  createdAt: string;
}

export interface HeadspaceEntry {
  id: string;
  date: string;
  costPressure: number;
  nutritionTradeoffs: number;
  timeEffort: number;
  culturalFit: number;
  decisionFriction: number;
  score: number;
}

export interface DecisionEntry {
  id: string;
  date: string;
  wanted: string;
  chose: string;
  reason: 'cost' | 'time' | 'availability' | 'cultural' | 'nutrition';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface WeeklyLog {
  id: string;
  weekStart: string;
  moneySpent: number;
  nutritionScore: number;
  timeSpent: number;
  culturalFitScore: number;
  notes: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  addedAt: string;
}

export interface StaplePrice {
  id: string;
  name: string;
  category: string;
  community: string;
  currentPrice: number;
  unit: string;
  store: string;
  loggedAt: string;
}

export interface SupermarketCycle {
  id: string;
  itemName: string;
  supermarket: string;
  regularPrice: number;
  salePrice: number;
  unit: string;
  lastSaleDate: string;
  saleDurationDays: number;
  estimatedFrequencyDays: number;
}

export type ScenarioType = 'rent_increase' | 'lost_shift' | 'grocery_inflation' | 'job_loss' | 'custom';

export interface BudgetScenario {
  id: string;
  name: string;
  type: ScenarioType;
  rentChangePercent?: number;
  incomeChangeDollars?: number;
  groceryInflationPercent?: number;
  customDescription?: string;
  createdAt: string;
}

export type NavView =
  | 'dashboard'
  | 'weekly'
  | 'friction'
  | 'craving'
  | 'assets'
  | 'simulator'
  | 'pantry'
  | 'halfprice'
  | 'staples'
  | 'policy';
