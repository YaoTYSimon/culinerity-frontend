import { describe, expect, it } from 'vitest';
import { StaticBenchmarkSource, isOlderData, verificationLabel } from './source';
import type { Indicator } from './types';

const base: Indicator = {
  id: 'x',
  group: 'budget',
  label: 'x',
  value: 1,
  unit: 'u',
  scope: 's',
  period: 'p',
  year: 2022,
  verification: 'primary',
  sourceId: 'abs-copyright',
};
const now = new Date('2026-10-26T00:00:00');

describe('isOlderData', () => {
  it('flags data more than five years old', () => {
    expect(isOlderData({ ...base, year: 2014 }, now)).toBe(true);
    expect(isOlderData({ ...base, year: 2020 }, now)).toBe(true);
  });
  it('does not flag recent data', () => {
    expect(isOlderData({ ...base, year: 2022 }, now)).toBe(false);
    expect(isOlderData({ ...base, year: 2021 }, now)).toBe(false);
  });
  it('flags dated rows with no known year', () => {
    const { year: _y, ...noYear } = { ...base, dated: true };
    expect(isOlderData(noYear, now)).toBe(true);
  });
  it('flags dated rows whatever the year', () => {
    expect(isOlderData({ ...base, year: 2026, dated: true }, now)).toBe(true);
  });
  it('uses the injected now', () => {
    expect(isOlderData({ ...base, year: 2022 }, new Date('2030-01-01T00:00:00'))).toBe(true);
  });
});

describe('verificationLabel', () => {
  it('uses the three plain labels', () => {
    expect(verificationLabel('primary')).toBe('Read from the source itself');
    expect(verificationLabel('secondary')).toBe('Read from a published report that cites it');
    expect(verificationLabel('press')).toBe('Press report only (not checked against the study)');
  });
});

describe('StaticBenchmarkSource', () => {
  const src = new StaticBenchmarkSource();
  it('states the decimals the source writes for the ABS lone-parent and national CPI rows', () => {
    const find = (id: string) => src.indicators().find((i) => i.id === id)!;
    expect(find('p-abs-single-parent').decimals).toBe(1);
    expect(find('b-cpi-food-australia').decimals).toBe(1);
  });
  it('reports when the dataset was last updated', () => {
    expect(src.updated()).toBe('2026-10-26');
  });
  it('filters indicators by group', () => {
    const budget = src.indicators('budget');
    expect(budget.length).toBeGreaterThan(0);
    expect(budget.every((i) => i.group === 'budget')).toBe(true);
    expect(src.indicators('policy').every((i) => i.group === 'policy')).toBe(true);
    expect(src.indicators().length).toBe(budget.length + src.indicators('policy').length + src.indicators('whatif').length);
  });
  it('has numeric SEIFA scores and no lga', () => {
    for (const a of src.areas()) {
      expect(typeof a.seifaIrsdScore).toBe('number');
      expect('lga' in a).toBe(false);
    }
  });
  it('has unique ids and resolvable https sources', () => {
    const ids = src.indicators().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sources = new Map(src.sources().map((s) => [s.id, s]));
    for (const s of sources.values()) expect(s.url.startsWith('https://')).toBe(true);
    for (const i of src.indicators()) expect(sources.has(i.sourceId)).toBe(true);
    for (const a of src.areas()) expect(sources.has(a.sourceId)).toBe(true);
    for (const i of src.interventions()) expect(sources.has(i.sourceId)).toBe(true);
  });
  it('every indicator has a verification and a year; numbers are numbers', () => {
    for (const i of src.indicators()) {
      expect(['primary', 'secondary', 'press']).toContain(i.verification);
      if (i.dated && i.year === undefined) expect(i.id).toBe('p-foodbank-vic-monthly');
      else expect(Number.isInteger(i.year)).toBe(true);
      expect(i.value === null || typeof i.value === 'number').toBe(true);
      if (i.value === null) expect(i.display).toBeTruthy();
    }
  });
  it('omits the unverified youth row and the old confidence field', () => {
    expect(src.indicators().some((i) => i.id === 'p-youth-whole-day')).toBe(false);
    expect(src.indicators().some((i) => 'confidence' in i)).toBe(false);
  });
  it('carries the ABS figures from the ABS release', () => {
    const get = (id: string) => src.indicators('policy').find((i) => i.id === id)!;
    expect(get('p-abs-national-2023').value).toBe(13.2);
    expect(get('p-abs-lowest-quintile').value).toBe(23.2);
    expect(get('p-abs-single-parent').value).toBe(34.0);
    expect(get('p-abs-group-households').value).toBe(27.8);
    for (const id of ['p-abs-national-2023', 'p-abs-lowest-quintile', 'p-abs-single-parent', 'p-abs-group-households']) {
      expect(get(id).verification).toBe('primary');
      expect(get(id).sourceId).toBe('abs-food-insecurity-2023');
    }
  });
  it('marks press-only rows and dated rows', () => {
    const all = src.indicators();
    expect(all.filter((i) => i.verification === 'press').map((i) => i.id).sort()).toEqual(
      ['b-student-ua-living-costs', 'p-student-hardship', 'p-student-tas-2024', 'p-youth-one-in-five'].sort(),
    );
    for (const i of all.filter((i) => /^(b-vhfb-|b-hes-)/.test(i.id) || ['b-jobseeker-shortfall', 'b-parenting-shortfall'].includes(i.id))) {
      expect(i.dated).toBe(true);
    }
  });
  it('does not assert a year for the undated Foodbank Victoria page', () => {
    const row = src.indicators('policy').find((i) => i.id === 'p-foodbank-vic-monthly')!;
    expect(row.year).toBeUndefined();
    expect(row.dated).toBe(true);
    expect(row.period).toBe('not stated');
    expect(row.note).toMatch(/gives no date, so we do not know which year/);
  });
  it('words the middle-income comparison from the source', () => {
    const row = src.indicators('policy').find((i) => i.id === 'p-hunger-middle-income-trend')!;
    expect(row.label).toMatch(/\$33,800-\$90,999/);
    expect(row.previous?.period).toMatch(/three years earlier/);
  });
  it('returns copies so callers cannot mutate shared rows', () => {
    const a = src.indicators('budget')[0]!;
    a.label = 'changed';
    a.previous = { value: 1, period: 'x' };
    expect(src.indicators('budget')[0]!.label).not.toBe('changed');
    const area = src.areas()[0]!;
    area.name = 'changed';
    expect(src.areas()[0]!.name).not.toBe('changed');
    src.caveats()[0] = 'changed';
    expect(src.caveats()[0]).not.toBe('changed');
    src.sources()[0]!.url = 'changed';
    expect(src.sources()[0]!.url).not.toBe('changed');
    src.interventions()[0]!.label = 'changed';
    expect(src.interventions()[0]!.label).not.toBe('changed');
  });
  it('exposes caveats and the not-found list', () => {
    expect(src.caveats().length).toBeGreaterThan(0);
    expect(src.notFound().length).toBeGreaterThan(0);
    expect(src.caveats().join(' ')).not.toMatch(/LGA/);
  });
  it('tags every not-found gap with a group and filters by it', () => {
    const all = src.notFound();
    const budget = src.notFound('budget');
    const policy = src.notFound('policy');
    expect(budget.length).toBeGreaterThan(0);
    expect(policy.length).toBeGreaterThan(0);
    expect([...budget, ...policy].sort()).toEqual([...all].sort());
    expect(budget.join(' ')).toMatch(/healthy food basket/);
    expect(policy.join(' ')).not.toMatch(/healthy food basket/);
  });
  it('keeps research-process remarks out of the user-facing notes', () => {
    const rendered = [...src.indicators().flatMap((i) => [i.note ?? '', i.measure ?? '']), ...src.notFound()].join('\n');
    expect(rendered).not.toMatch(/HTTP \d{3}|extraction|access date|could not be opened/i);
  });
  it('keeps the process remarks in a separate research note that is optional', () => {
    const row = src.indicators('budget').find((i) => i.id === 'b-poverty-line-single')!;
    expect(row.research).toMatch(/HTTP 403/);
    expect(src.indicators('budget').find((i) => i.id === 'b-cpi-food-australia')!.research).toBeUndefined();
  });
  it('does not repeat the percent sign in a display figure and its unit', () => {
    const row = src.indicators('budget').find((i) => i.display)!;
    expect(row.display).toMatch(/%/);
    expect(row.unit).not.toMatch(/^%/);
  });
  describe('what-if context rows', () => {
    const rows = () => src.indicators('whatif');
    const get = (id: string) => rows().find((i) => i.id === id)!;
    it('has exactly the eight sourced rows', () => {
      expect(rows().map((i) => i.id).sort()).toEqual(
        ['w-jobseeker-energy', 'w-jobseeker-partnered', 'w-jobseeker-single', 'w-jobseeker-single-kids', 'w-min-wage-hour', 'w-min-wage-week', 'w-rent-index-year', 'w-rent-melb-median'],
      );
    });
    it('carries the exact sourced values', () => {
      expect(get('w-min-wage-hour').value).toBe(26.44);
      expect(get('w-min-wage-hour').decimals).toBe(2);
      expect(get('w-min-wage-week').value).toBe(1004.9);
      expect(get('w-min-wage-week').decimals).toBe(2);
      expect(get('w-jobseeker-single').value).toBe(824.9);
      expect(get('w-jobseeker-single').previous?.value).toBe(808.7);
      expect(get('w-jobseeker-energy').value).toBe(8.8);
      expect(get('w-jobseeker-single-kids').value).toBe(883.3);
      expect(get('w-jobseeker-partnered').value).toBe(755.1);
      expect(get('w-rent-melb-median').value).toBe(595);
      expect(get('w-rent-index-year').value).toBe(4.8);
    });
    it('every row has a year, refreshAfter, primary verification and one of the three new sources', () => {
      const ids = new Set(['fairwork-minwage', 'dss-rates-2026-09-20', 'dffh-rental-report-jun2026']);
      const byId = new Map(src.sources().map((s) => [s.id, s]));
      for (const i of rows()) {
        expect(Number.isInteger(i.year), i.id).toBe(true);
        expect(i.refreshAfter, i.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(i.verification).toBe('primary');
        expect(ids.has(i.sourceId), i.id).toBe(true);
        expect(byId.get(i.sourceId)!.url.startsWith('https://')).toBe(true);
        expect(byId.get(i.sourceId)!.accessed).toBe('2026-10-29');
        expect(i.research, i.id).toMatch(/\S/);
        expect(i.period, i.id).toMatch(/\S/);
      }
    });
    it('does not leak into the budget and policy views', () => {
      expect(src.indicators('budget').length).toBe(12);
      expect(src.indicators('policy').length).toBe(25);
      expect([...src.indicators('budget'), ...src.indicators('policy')].some((i) => i.id.startsWith('w-'))).toBe(false);
    });
  });
});
