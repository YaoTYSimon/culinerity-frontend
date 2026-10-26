import { describe, expect, it } from 'vitest';
import type { Indicator } from '@culinerity/core';
import { figureParts } from './BenchmarkRows';

const base: Indicator = { id: 'x', group: 'policy', label: 'l', value: 1, unit: '', scope: 's', period: 'p', verification: 'primary', sourceId: 's', year: 2025 };

describe('figureParts', () => {
  it('puts thousands separators in large numbers and dollar amounts', () => {
    expect(figureParts({ ...base, value: 3500000, unit: 'households' })).toEqual({ main: '3,500,000', unit: 'households' });
    expect(figureParts({ ...base, value: 18000000, unit: 'AUD' })).toEqual({ main: '$18,000,000', unit: '' });
    expect(figureParts({ ...base, value: 1226, unit: 'AUD per week' })).toEqual({ main: '$1,226', unit: 'per week' });
  });
  it('keeps decimals and percentages as sourced', () => {
    expect(figureParts({ ...base, value: 424.06, unit: 'AUD per fortnight' }).main).toBe('$424.06');
    expect(figureParts({ ...base, value: 13.2, unit: '% of households' })).toEqual({ main: '13.2%', unit: 'of households' });
  });
  it('keeps the decimals the source writes', () => {
    expect(figureParts({ ...base, value: 34, decimals: 1, unit: '% of lone-parent families' }).main).toBe('34.0%');
    expect(figureParts({ ...base, value: 3, decimals: 1, unit: '% change over 12 months' }).main).toBe('3.0%');
    expect(figureParts({ ...base, value: 1226, decimals: 2, unit: 'AUD per week' }).main).toBe('$1,226.00');
  });
  it('uses display verbatim', () => {
    expect(figureParts({ ...base, value: null, display: 'about 1 in 5', unit: 'share of 18-24 year olds' }).main).toBe('about 1 in 5');
  });
});
