import { describe, expect, it } from 'vitest';
import { StaticBenchmarkSource } from '../benchmarks/source';
import type { Scenario, Step } from './types';
import { hasBannedWord } from './banned';
import { WHATIF_CONTEXT, WHATIF_HELP, contextIds } from './context';

const ids = new Set(new StaticBenchmarkSource().indicators().map((i) => i.id));
const KINDS: Step['kind'][] = ['lose-work', 'pay-change', 'payment-change', 'one-off-bill', 'rent-change', 'food-price-change'];

describe('WHATIF_CONTEXT', () => {
  it('names every step kind, and only indicator ids that exist', () => {
    expect(Object.keys(WHATIF_CONTEXT).sort()).toEqual([...KINDS].sort());
    for (const list of Object.values(WHATIF_CONTEXT)) for (const id of list) expect(ids.has(id), id).toBe(true);
  });
  it('follows the design table', () => {
    expect(WHATIF_CONTEXT['lose-work']).toEqual(['w-min-wage-hour', 'w-min-wage-week']);
    expect(WHATIF_CONTEXT['pay-change']).toEqual(['w-min-wage-hour', 'w-min-wage-week']);
    expect(WHATIF_CONTEXT['rent-change']).toEqual(['w-rent-melb-median', 'w-rent-index-year']);
    expect(WHATIF_CONTEXT['food-price-change']).toEqual(['b-cpi-food-melbourne', 'b-cpi-food-australia']);
    expect(WHATIF_CONTEXT['one-off-bill']).toEqual([]);
    expect(WHATIF_CONTEXT['payment-change']).toEqual([
      'w-jobseeker-single', 'w-jobseeker-single-kids', 'w-jobseeker-partnered', 'w-jobseeker-energy',
      'b-poverty-line-single', 'b-poverty-line-couple-2kids', 'b-jobseeker-shortfall', 'b-parenting-shortfall',
    ]);
  });
  it('our own notes and labels on the context rows have no banned word (source quotes are not scanned)', () => {
    const rows = new StaticBenchmarkSource().indicators();
    for (const id of new Set(Object.values(WHATIF_CONTEXT).flat())) {
      const row = rows.find((i) => i.id === id)!;
      for (const text of [row.label, row.note ?? '', row.scope, row.period]) expect(hasBannedWord(text), `${id}: ${text}`).toBe(false);
    }
  });
  it('never includes prevalence figures', () => {
    for (const id of Object.values(WHATIF_CONTEXT).flat()) expect(id).not.toMatch(/^p-/);
  });
});

describe('contextIds', () => {
  const rent: Step = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
  const food: Step = { kind: 'food-price-change', direction: 'up', bp: 500 };
  it('returns a single step list', () => {
    expect(contextIds(rent)).toEqual(WHATIF_CONTEXT['rent-change']);
  });
  it('is the union without duplicates for combined', () => {
    const s: Scenario = { kind: 'combined', steps: [rent, food, rent] };
    expect(contextIds(s)).toEqual([...WHATIF_CONTEXT['rent-change'], ...WHATIF_CONTEXT['food-price-change']]);
    const two: Scenario = { kind: 'combined', steps: [{ kind: 'pay-change', direction: 'down', bp: 100 }, { kind: 'lose-work', unit: 'hours', count: 1, payPerUnit: 100, everyWeeks: 1 }] };
    expect(contextIds(two)).toEqual(['w-min-wage-hour', 'w-min-wage-week']);
  });
  it('is empty for a one-off bill', () => {
    expect(contextIds({ kind: 'one-off-bill', cents: 100, week: 1 })).toEqual([]);
  });
  it('returns copies', () => {
    contextIds(rent).push('x');
    expect(WHATIF_CONTEXT['rent-change']).toHaveLength(2);
  });
});

describe('WHATIF_HELP', () => {
  it('lists exactly the two verified contacts', () => {
    expect(WHATIF_HELP.map((h) => h.id)).toEqual(['national-debt-helpline', 'foodbank-find-food']);
    const ndh = WHATIF_HELP[0];
    expect(ndh.phone).toBe('1800 007 007');
    expect(ndh.hours).toBe('weekdays 9:30am to 4:30pm, chat weekdays 9am to 8pm');
    expect(ndh.url).toBe('https://ndh.org.au/');
    expect(WHATIF_HELP[1].url).toBe('https://findfood.foodbank.org.au/');
  });
  it('has https urls, a source id, a label and a verified date', () => {
    for (const h of WHATIF_HELP) {
      expect(h.url.startsWith('https://')).toBe(true);
      expect(h.label).toMatch(/\S/);
      expect(h.sourceId).toMatch(/\S/);
      expect(h.verifiedOn).toBe('2026-10-29');
    }
  });
});
