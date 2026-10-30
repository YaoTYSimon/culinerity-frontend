import { describe, expect, it } from 'vitest';
import { baselineFromProfile, MAX_SAVED_WHATIFS, removeWhatIf, renameWhatIf, restoreWhatIf, sanitizeWhatIfs, saveWhatIf, type SavedWhatIf } from './saved';
import type { Scenario } from './types';

const SC: Scenario = { kind: 'rent-change', direction: 'up', by: { mode: 'percent', bp: 1000 } };
const item = (n: number, over: Partial<SavedWhatIf> = {}): SavedWhatIf => ({ id: `id${n}`, name: `Rent ${n}`, scenario: SC, savedAt: '2026-10-29T01:00:00.000Z', ...over });
const full = (n: number): SavedWhatIf[] => Array.from({ length: n }, (_, i) => item(i + 1));

describe('saveWhatIf', () => {
  it('adds an item to an empty or missing list', () => {
    expect(saveWhatIf(undefined, item(1))).toEqual({ list: [item(1)] });
    expect(saveWhatIf([item(1)], item(2)).list.map((x) => x.id)).toEqual(['id1', 'id2']);
  });
  it('trims the name and stores a clean copy', () => {
    const r = saveWhatIf([], item(1, { name: '  Rent   up  ' }));
    expect(r.list[0].name).toBe('Rent up');
  });
  it('accepts 10 and refuses the 11th with the list unchanged', () => {
    const ten = full(MAX_SAVED_WHATIFS);
    expect(ten).toHaveLength(10);
    const r = saveWhatIf(ten, item(11));
    expect(r.error).toBe('full');
    expect(r.list).toBe(ten);
    expect(saveWhatIf(full(9), item(10)).list).toHaveLength(10);
  });
  it('refuses blank and 41-character names, accepts 40', () => {
    const l = full(1);
    for (const name of ['', '   ', 'x'.repeat(41)]) {
      const r = saveWhatIf(l, item(2, { name }));
      expect(r.error).toBe('invalid');
      expect(r.list).toBe(l);
    }
    expect(saveWhatIf(l, item(2, { name: 'x'.repeat(40) })).error).toBeUndefined();
  });
  it('refuses an invalid scenario or a missing id', () => {
    const l = full(1);
    expect(saveWhatIf(l, item(2, { scenario: { kind: 'pay-change', direction: 'up', bp: 0 } as Scenario })).error).toBe('invalid');
    expect(saveWhatIf(l, item(2, { id: '' })).error).toBe('invalid');
    expect(saveWhatIf(l, item(2, { id: 'x'.repeat(65) })).error).toBe('invalid');
    expect(saveWhatIf(l, item(2, { id: 'x'.repeat(64) })).error).toBeUndefined();
    for (const savedAt of ['yesterday', '2026-10-29', '2026-13-45T00:00:00.000Z', 'x'.repeat(500)]) expect(saveWhatIf(l, item(2, { savedAt })).error, savedAt).toBe('invalid');
  });
  it('allows duplicate names but not duplicate ids', () => {
    const l = full(1);
    expect(saveWhatIf(l, item(2, { name: 'Rent 1' })).error).toBeUndefined();
    const r = saveWhatIf(l, item(1, { name: 'Other' }));
    expect(r.error).toBe('duplicate-id');
    expect(r.list).toBe(l);
  });
  it('does not mutate its input', () => {
    const l = full(2);
    const copy = JSON.stringify(l);
    saveWhatIf(l, item(3));
    expect(JSON.stringify(l)).toBe(copy);
  });
});

describe('renameWhatIf', () => {
  it('renames in place', () => {
    const r = renameWhatIf(full(3), 'id2', ' New name ');
    expect(r.map((x) => x.name)).toEqual(['Rent 1', 'New name', 'Rent 3']);
  });
  it('leaves the list alone for a bad name or unknown id', () => {
    const l = full(2);
    expect(renameWhatIf(l, 'id1', '')).toBe(l);
    expect(renameWhatIf(l, 'id1', 'x'.repeat(41))).toBe(l);
    expect(renameWhatIf(l, 'nope', 'Fine')).toBe(l);
  });
});

describe('removeWhatIf and restoreWhatIf', () => {
  it('removes and restores in the same place', () => {
    const l = full(4);
    const r = removeWhatIf(l, 'id2');
    expect(r.list.map((x) => x.id)).toEqual(['id1', 'id3', 'id4']);
    expect(r.removed).toEqual(l[1]);
    expect(r.index).toBe(1);
    expect(restoreWhatIf(r.list, r.removed!, r.index!)).toEqual(l);
  });
  it('restores at the ends and clamps a stale index', () => {
    const l = full(3);
    const first = removeWhatIf(l, 'id1');
    expect(restoreWhatIf(first.list, first.removed!, 0)).toEqual(l);
    const last = removeWhatIf(l, 'id3');
    expect(restoreWhatIf(last.list, last.removed!, 99)).toEqual(l);
  });
  it('an unknown id removes nothing', () => {
    const l = full(2);
    expect(removeWhatIf(l, 'nope')).toEqual({ list: l });
  });
  it('restore refuses a duplicate id and a full list', () => {
    const l = full(2);
    expect(restoreWhatIf(l, l[0], 0)).toBe(l);
    const ten = full(10);
    expect(restoreWhatIf(ten, item(11), 0)).toBe(ten);
  });
});

describe('sanitizeWhatIfs', () => {
  it('keeps valid items and drops the rest', () => {
    const raw: unknown[] = [item(1), null, 5, 'x', [], { id: 'a' }, item(2, { scenario: { kind: 'nope' } as never }), item(3, { name: '' }), item(4, { savedAt: 5 as never }), item(5)];
    expect(sanitizeWhatIfs(raw).map((x) => x.id)).toEqual(['id1', 'id5']);
  });
  it('first duplicate id wins', () => {
    const out = sanitizeWhatIfs([item(1, { name: 'First' }), item(1, { name: 'Second' })]);
    expect(out).toEqual([item(1, { name: 'First' })]);
  });
  it('caps at 10', () => {
    expect(sanitizeWhatIfs(full(15))).toHaveLength(10);
  });
  it('strips unknown fields and cleans the scenario', () => {
    const out = sanitizeWhatIfs([{ ...item(1), extra: 1, scenario: { ...SC, junk: true } }]);
    expect(out).toEqual([item(1)]);
  });
  it('never throws on garbage', () => {
    for (const g of [null, undefined, 5, 'x', {}, [null, [[]], { id: { a: {} } }, { id: 'a', name: 'b', scenario: { steps: [[[]]] }, savedAt: 'x' }]]) {
      expect(() => sanitizeWhatIfs(g as unknown[])).not.toThrow();
    }
    expect(sanitizeWhatIfs(null as never)).toEqual([]);
  });
});

describe('baselineFromProfile', () => {
  it('turns dollars into cents and leaves absent fields absent', () => {
    expect(baselineFromProfile({ incomeWeekly: 900, housingWeekly: 450.5 })).toEqual({ incomeWeekly: 90000, housingWeekly: 45050 });
    expect(baselineFromProfile({})).toEqual({});
  });
  it('converts all four and keeps zero', () => {
    expect(baselineFromProfile({ incomeWeekly: 0, housingWeekly: 450, otherFixedWeekly: 60, foodBudgetWeekly: 120 })).toEqual({ incomeWeekly: 0, housingWeekly: 45000, otherFixedWeekly: 6000, foodBudgetWeekly: 12000 });
  });
  it('ignores negative, non-finite and out-of-range values', () => {
    expect(baselineFromProfile({ incomeWeekly: -1, housingWeekly: NaN, otherFixedWeekly: Infinity, foodBudgetWeekly: 10_000.01 })).toEqual({});
    expect(baselineFromProfile({ incomeWeekly: 20_000, housingWeekly: 10_000, otherFixedWeekly: 10_000, foodBudgetWeekly: 10_000 })).toEqual({ incomeWeekly: 2_000_000, housingWeekly: 1_000_000, otherFixedWeekly: 1_000_000, foodBudgetWeekly: 1_000_000 });
    expect(baselineFromProfile({ incomeWeekly: 20_000.01 })).toEqual({});
  });
});
