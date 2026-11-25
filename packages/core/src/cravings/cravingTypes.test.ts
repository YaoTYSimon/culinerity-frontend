import { describe, expect, it } from 'vitest';
import { ALL_CRAVING_IDS } from '../sources/mock/data';
import { CRAVING_TYPES, CRAVING_TYPE_OF, cravingTypeOf, cravingIdsOfType } from './cravingTypes';

describe('craving types', () => {
  it('has the six types with short labels', () => {
    expect(CRAVING_TYPES.map((t) => t.label)).toEqual(['Fast food', 'Sweet', 'Salty and crunchy', 'Hot meals', 'Drinks', 'Bakery']);
    expect(new Set(CRAVING_TYPES.map((t) => t.id)).size).toBe(CRAVING_TYPES.length);
  });

  it('gives every craving exactly one known type', () => {
    const ids = new Set<string>(CRAVING_TYPES.map((t) => t.id));
    const missing = ALL_CRAVING_IDS.filter((id) => !ids.has(cravingTypeOf(id) ?? ''));
    expect(missing, `add a type for: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no stale ids', () => {
    const stale = Object.keys(CRAVING_TYPE_OF).filter((id) => !ALL_CRAVING_IDS.includes(id));
    expect(stale).toEqual([]);
  });

  it('lists each craving under one type and every type has some', () => {
    const all = CRAVING_TYPES.flatMap((t) => cravingIdsOfType(t.id));
    expect([...all].sort()).toEqual([...ALL_CRAVING_IDS].sort());
    for (const t of CRAVING_TYPES) expect(cravingIdsOfType(t.id).length).toBeGreaterThan(0);
  });
});
