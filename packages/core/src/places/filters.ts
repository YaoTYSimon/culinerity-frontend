import type { BulkKind, BulkPlace } from './tier';
import { BULK_KINDS } from './tier';
import type { Place, PlaceAccess, PlaceFit, PlaceKind } from './types';

/*
 * Nearby filters. Several pills can be on at once: within one group a place needs to match any of the picks (OR),
 * and it needs to match every group that has a pick (AND). A group with nothing picked puts no limit on the list.
 * Only fields that exist in the data are used. Platform-free and pure; nothing here is stored.
 */

export type TypeFilter = 'market' | 'grocer' | 'relief' | 'meal' | 'eatery';
export type CostFilter = 'free' | 'low';
export type FoodFilter = PlaceFit;
export type AccessFilter = 'walk-in' | 'referral';

export interface PlaceFilters {
  type: TypeFilter[];
  cost: CostFilter[];
  food: FoodFilter[];
  access: AccessFilter[];
  checkedOnly: boolean;
}

export const NO_FILTERS: PlaceFilters = { type: [], cost: [], food: [], access: [], checkedOnly: false };

export type FilterGroupId = 'type' | 'cost' | 'food' | 'access' | 'checked';

export interface FilterGroup {
  id: FilterGroupId;
  /** One word. */
  label: string;
  options: { value: string; label: string }[];
}

/** What the pills show, in order. `checked` is a single on/off pill. */
export const FILTER_GROUPS: readonly FilterGroup[] = [
  {
    id: 'type', label: 'Type',
    options: [
      { value: 'market', label: 'Markets' }, { value: 'grocer', label: 'Grocers' }, { value: 'relief', label: 'Food relief' },
      { value: 'meal', label: 'Community meals' }, { value: 'eatery', label: 'Cafes and takeaway' },
    ],
  },
  { id: 'cost', label: 'Cost', options: [{ value: 'free', label: 'Free' }, { value: 'low', label: 'Low cost' }] },
  {
    id: 'food', label: 'Food',
    options: [{ value: 'fresh', label: 'Fresh produce' }, { value: 'meals', label: 'Meals' }, { value: 'packaged', label: 'Packaged' }],
  },
  { id: 'access', label: 'Access', options: [{ value: 'walk-in', label: 'Walk in' }, { value: 'referral', label: 'Referral or appointment' }] },
  { id: 'checked', label: 'Checked', options: [{ value: 'checked', label: 'Checked by us only' }] },
];

export function hasActiveFilters(f: PlaceFilters): boolean {
  return f.type.length > 0 || f.cost.length > 0 || f.food.length > 0 || f.access.length > 0 || f.checkedOnly;
}

const flip = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** A new state with one pill switched. `value` is one of the group's option values. */
export function toggleFilter(f: PlaceFilters, group: FilterGroupId, value: string): PlaceFilters {
  switch (group) {
    case 'type': return { ...f, type: flip(f.type, value as TypeFilter) };
    case 'cost': return { ...f, cost: flip(f.cost, value as CostFilter) };
    case 'food': return { ...f, food: flip(f.food, value as FoodFilter) };
    case 'access': return { ...f, access: flip(f.access, value as AccessFilter) };
    case 'checked': return { ...f, checkedOnly: !f.checkedOnly };
  }
}

const CHECKED_TYPE: Record<PlaceKind, TypeFilter> = {
  market: 'market', grocer: 'grocer', 'co-op': 'grocer', 'social-supermarket': 'grocer', 'food-relief': 'relief', 'community-meal': 'meal',
};
const BULK_TYPE: Record<BulkKind, TypeFilter> = {
  supermarket: 'grocer', greengrocer: 'grocer', butcher: 'grocer', fishmonger: 'grocer', deli: 'grocer', bakery: 'grocer',
  'food-relief': 'relief', takeaway: 'eatery', 'cafe-restaurant': 'eatery',
};
const ACCESS: Partial<Record<PlaceAccess, AccessFilter>> = { open: 'walk-in', referral: 'referral' };
/** Kinds whose category says fresh food. A supermarket is not claimed to be fresh. */
const FRESH_BULK: ReadonlySet<BulkKind> = new Set(['greengrocer', 'butcher', 'fishmonger']);

/** Cost uses stated prices only: a typical-band price is an estimate, so it is never "free" or "low cost". */
function costMatches(p: Place, picks: CostFilter[]): boolean {
  if (p.priceBasis !== 'stated') return false;
  return picks.some((c) => (c === 'free' ? p.priceBand === 'free' : p.priceBand === 'free' || p.priceBand === 'budget'));
}

export function placeMatches(p: Place, f: PlaceFilters): boolean {
  if (f.type.length > 0 && !f.type.includes(CHECKED_TYPE[p.kind])) return false;
  if (f.cost.length > 0 && !costMatches(p, f.cost)) return false;
  if (f.food.length > 0 && !f.food.some((x) => p.fit.includes(x))) return false;
  if (f.access.length > 0) {
    const a = ACCESS[p.access];
    if (!a || !f.access.includes(a)) return false;
  }
  return true;
}

/**
 * A bulk place has an unknown price and no access data, so a Cost or Access pill (or Checked only) leaves it out.
 * Meals and Packaged never match; Fresh produce matches produce, butcher and fish shops.
 */
export function bulkMatches(p: BulkPlace, f: PlaceFilters): boolean {
  if (f.checkedOnly || f.cost.length > 0 || f.access.length > 0) return false;
  if (f.type.length > 0 && !f.type.includes(BULK_TYPE[p.kind])) return false;
  if (f.food.length > 0 && !(f.food.includes('fresh') && FRESH_BULK.has(p.kind))) return false;
  return true;
}

/** False when no bulk kind can match, so the page leaves the tier out instead of showing it empty. */
export const bulkCanMatch = (f: PlaceFilters): boolean => BULK_KINDS.some((kind) => bulkMatches({ kind } as BulkPlace, f));
