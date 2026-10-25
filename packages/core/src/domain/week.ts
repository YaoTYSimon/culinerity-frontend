import { isIsoDate } from './history';
import type { Aud, WeekSwap } from './types';

export type { WeekSwap };

export const MAX_WEEK_SWAPS = 50;
const SHARE_MAX_ITEMS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeekSummary {
  total: Aud;
  items: { itemId: string; name: string; count: number; saving: Aud }[];
}

const roundCents = (n: number): number => Math.round(n * 100) / 100;
const isPositiveFinite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function isWeekSwap(x: unknown): x is WeekSwap {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return typeof e.itemId === 'string' && typeof e.name === 'string' && isPositiveFinite(e.saving) && isIsoDate(e.at);
}

/** Add one swap entry; a non-positive or non-finite saving leaves the list unchanged. */
export function addWeekSwap(week: WeekSwap[] | undefined, swap: Omit<WeekSwap, 'at'>, now: string): WeekSwap[] {
  const list = week ?? [];
  if (!isPositiveFinite(swap.saving)) return list;
  return [...list, { itemId: swap.itemId, name: swap.name, saving: swap.saving, at: now }].slice(-MAX_WEEK_SWAPS);
}

/** Remove the newest entry for an item. */
export function removeOneWeekSwap(week: WeekSwap[] | undefined, itemId: string): WeekSwap[] {
  const list = week ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].itemId === itemId) return [...list.slice(0, i), ...list.slice(i + 1)];
  }
  return list;
}

/** Group the last rolling 7 days by item. */
export function weekSummary(week: WeekSwap[] | undefined, now: string): WeekSummary {
  const nowMs = Date.parse(now);
  const groups = new Map<string, { itemId: string; name: string; count: number; saving: number }>();
  for (const w of week ?? []) {
    const age = nowMs - Date.parse(w.at);
    if (!(age <= WEEK_MS)) continue;
    const g = groups.get(w.itemId);
    if (g) {
      g.count += 1;
      g.saving += w.saving;
    } else groups.set(w.itemId, { itemId: w.itemId, name: w.name, count: 1, saving: w.saving });
  }
  const items = [...groups.values()].map((g) => ({ ...g, saving: roundCents(g.saving) }));
  return { total: roundCents(items.reduce((s, i) => s + i.saving, 0)), items };
}

const money = (n: Aud): string => `$${n.toFixed(2)}`;

/** Shareable text: swap names, savings and total only. */
export function shareText(summary: WeekSummary): string {
  const shown = summary.items.slice(0, SHARE_MAX_ITEMS);
  const lines = shown.map((i) => `${i.name}${i.count > 1 ? ` ×${i.count}` : ''}: ${money(i.saving)}`);
  const more = summary.items.length - shown.length;
  if (more > 0) lines.push(`+${more} more`);
  lines.push(`Saved this week: ${money(summary.total)}`, 'Made with Culinerity');
  return lines.join('\n');
}
