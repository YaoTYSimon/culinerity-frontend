import type {
  UserProfile,
  HeadspaceEntry,
  DecisionEntry,
  WeeklyLog,
  PantryItem,
  StaplePrice,
  SupermarketCycle,
  BudgetScenario,
} from '../types';

const KEY = {
  profile: 'hf_profile',
  headspace: 'hf_headspace',
  decisions: 'hf_decisions',
  weekly: 'hf_weekly',
  pantry: 'hf_pantry',
  staples: 'hf_staples',
  cycles: 'hf_cycles',
  scenarios: 'hf_scenarios',
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getProfile: () => get<UserProfile | null>(KEY.profile, null),
  setProfile: (p: UserProfile) => set(KEY.profile, p),

  getHeadspace: () => get<HeadspaceEntry[]>(KEY.headspace, []),
  addHeadspace: (entry: HeadspaceEntry) => {
    const list = get<HeadspaceEntry[]>(KEY.headspace, []);
    set(KEY.headspace, [entry, ...list]);
  },

  getDecisions: () => get<DecisionEntry[]>(KEY.decisions, []),
  addDecision: (entry: DecisionEntry) => {
    const list = get<DecisionEntry[]>(KEY.decisions, []);
    set(KEY.decisions, [entry, ...list]);
  },
  deleteDecision: (id: string) => {
    const list = get<DecisionEntry[]>(KEY.decisions, []);
    set(KEY.decisions, list.filter((d) => d.id !== id));
  },

  getWeeklyLogs: () => get<WeeklyLog[]>(KEY.weekly, []),
  addWeeklyLog: (log: WeeklyLog) => {
    const list = get<WeeklyLog[]>(KEY.weekly, []);
    set(KEY.weekly, [log, ...list]);
  },
  updateWeeklyLog: (log: WeeklyLog) => {
    const list = get<WeeklyLog[]>(KEY.weekly, []);
    set(KEY.weekly, list.map((l) => (l.id === log.id ? log : l)));
  },

  getPantry: () => get<PantryItem[]>(KEY.pantry, []),
  addPantryItem: (item: PantryItem) => {
    const list = get<PantryItem[]>(KEY.pantry, []);
    set(KEY.pantry, [item, ...list]);
  },
  removePantryItem: (id: string) => {
    const list = get<PantryItem[]>(KEY.pantry, []);
    set(KEY.pantry, list.filter((i) => i.id !== id));
  },

  getStaples: () => get<StaplePrice[]>(KEY.staples, []),
  addStaple: (item: StaplePrice) => {
    const list = get<StaplePrice[]>(KEY.staples, []);
    set(KEY.staples, [item, ...list]);
  },
  removeStaple: (id: string) => {
    const list = get<StaplePrice[]>(KEY.staples, []);
    set(KEY.staples, list.filter((s) => s.id !== id));
  },

  getCycles: () => get<SupermarketCycle[]>(KEY.cycles, []),
  addCycle: (item: SupermarketCycle) => {
    const list = get<SupermarketCycle[]>(KEY.cycles, []);
    set(KEY.cycles, [item, ...list]);
  },
  updateCycle: (item: SupermarketCycle) => {
    const list = get<SupermarketCycle[]>(KEY.cycles, []);
    set(KEY.cycles, list.map((c) => (c.id === item.id ? item : c)));
  },
  removeCycle: (id: string) => {
    const list = get<SupermarketCycle[]>(KEY.cycles, []);
    set(KEY.cycles, list.filter((c) => c.id !== id));
  },

  getScenarios: () => get<BudgetScenario[]>(KEY.scenarios, []),
  addScenario: (s: BudgetScenario) => {
    const list = get<BudgetScenario[]>(KEY.scenarios, []);
    set(KEY.scenarios, [s, ...list]);
  },
  removeScenario: (id: string) => {
    const list = get<BudgetScenario[]>(KEY.scenarios, []);
    set(KEY.scenarios, list.filter((s) => s.id !== id));
  },

  clearAll: () => {
    Object.values(KEY).forEach((k) => localStorage.removeItem(k));
  },
};
