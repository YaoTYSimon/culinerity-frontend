import { describe, expect, it } from 'vitest';
import { calendar, culturalSources, labelFor, lastCalendarEnd, occasionDefs, traditions } from './source';
import { OCCASION_IDS } from '../food/types';

describe('cultural source', () => {
  it('lists the 21 starter traditions alphabetically by label', () => {
    const t = traditions();
    expect(t).toHaveLength(21);
    const labels = t.map((x) => x.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
  });
  it('has all 13 selectable occasions and a non-selectable yom-kippur', () => {
    const defs = occasionDefs();
    expect(defs.filter((d) => d.selectable).map((d) => d.id).sort()).toEqual([...OCCASION_IDS].sort());
    expect(defs.find((d) => (d.id as string) === 'yom-kippur')?.selectable).toBe(false);
  });
  it('every calendar row resolves to a source and the calendar runs to at least late 2028', () => {
    const ids = new Set(culturalSources().map((s) => s.id));
    expect(calendar().every((r) => ids.has(r.sourceId))).toBe(true);
    expect(lastCalendarEnd() >= '2028-12-01').toBe(true);
  });
  it('labelFor maps a starter id and returns own text unchanged', () => {
    expect(labelFor('greek')).toBe('Greek');
    expect(labelFor('My nan\'s cooking')).toBe("My nan's cooking");
  });
  it('returns copies', () => {
    traditions()[0].label = 'x';
    expect(traditions()[0].label).not.toBe('x');
  });
});
