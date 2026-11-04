// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applySuppress, validateSuppressList } from './suppress.mjs';

const places = [{ id: 'ovt-aaa1' }, { id: 'ovt-bbb2' }, { id: 'ovt-ccc3' }];

describe('suppress list', () => {
  it('removes the listed ids and keeps the rest in order', () => {
    const r = applySuppress(places, ['ovt-bbb2']);
    expect(r.places.map((p) => p.id)).toEqual(['ovt-aaa1', 'ovt-ccc3']);
    expect(r.suppressed).toBe(1);
  });
  it('an empty list changes nothing', () => {
    expect(applySuppress(places, []).places).toEqual(places);
  });
  it('fails on an id that is not in the data, naming it', () => {
    expect(() => applySuppress(places, ['ovt-ddd4'])).toThrow(/not in the data: ovt-ddd4/);
  });
  it('warns, not fails, for an id that de-duplication already removed', () => {
    const r = applySuppress(places, ['ovt-bbb2', 'ovt-dee9'], ['ovt-dee9']);
    expect(r.places.map((p) => p.id)).toEqual(['ovt-aaa1', 'ovt-ccc3']);
    expect(r.suppressed).toBe(1);
    expect(r.warnings.join()).toMatch(/ovt-dee9/);
    expect(() => applySuppress(places, ['ovt-dee9', 'ovt-ddd4'], ['ovt-dee9'])).toThrow(/not in the data: ovt-ddd4/);
  });
  it('fails on a malformed or duplicated list', () => {
    expect(validateSuppressList('x')).toHaveLength(1);
    expect(validateSuppressList([1, 'name', 'ovt-aaa1', 'ovt-aaa1']).length).toBe(3);
    expect(() => applySuppress(places, ['ovt-aaa1', 'ovt-aaa1'])).toThrow(/duplicate/);
  });
  it('the committed scripts/suppress.json is a valid list and holds no email address', () => {
    const raw = readFileSync(new URL('../suppress.json', import.meta.url), 'utf8');
    expect(validateSuppressList(JSON.parse(raw))).toEqual([]);
    expect(raw).not.toMatch(/@/);
  });
});
