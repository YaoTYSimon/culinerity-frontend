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
    expect(verificationLabel('secondary')).toBe('Read from a research paper that reports it');
    expect(verificationLabel('press')).toBe('Press report only (not checked against the study)');
  });
});

describe('StaticBenchmarkSource', () => {
  const src = new StaticBenchmarkSource();
  it('filters indicators by group', () => {
    const budget = src.indicators('budget');
    expect(budget.length).toBeGreaterThan(0);
    expect(budget.every((i) => i.group === 'budget')).toBe(true);
    expect(src.indicators('policy').every((i) => i.group === 'policy')).toBe(true);
    expect(src.indicators().length).toBe(budget.length + src.indicators('policy').length);
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
      expect(Number.isInteger(i.year)).toBe(true);
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
  it('exposes caveats and the not-found list', () => {
    expect(src.caveats().length).toBeGreaterThan(0);
    expect(src.notFound().length).toBeGreaterThan(0);
    expect(src.caveats().join(' ')).not.toMatch(/LGA/);
  });
});
