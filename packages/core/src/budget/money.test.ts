import { describe, expect, it } from 'vitest';
import { parseMoney } from './money';

describe('parseMoney', () => {
  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['$12.50', 12.5],
    ['$ 12.50', 12.5],
    ['1,200', 1200],
    ['1,200.75', 1200.75],
    ['  7 ', 7],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['0', 0],
  ])('accepts %j as %d', (text, n) => {
    expect(parseMoney(text)).toBe(n);
  });

  it.each(['', '   ', 'abc', '-3', '-0.5', 'NaN', 'Infinity', '1e3', '1,2,3', '12.345', '12.', '$', '1.2.3', '12 dollars', '--5', '１２', '1_000', '0x10', '1,2000', '0,123', '1,23', ',123', '1,000,00'])(
    'rejects %j',
    (text) => {
      expect(parseMoney(text)).toBeNull();
    },
  );

  it('allows zero by default and rejects it when allowZero is false', () => {
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('0.00', { allowZero: false })).toBeNull();
    expect(parseMoney('0.01', { allowZero: false })).toBe(0.01);
  });

  it('rejects amounts over max, accepts max itself', () => {
    expect(parseMoney('10000', { max: 10_000 })).toBe(10_000);
    expect(parseMoney('10000.01', { max: 10_000 })).toBeNull();
    expect(parseMoney('99999999')).toBe(99_999_999);
  });
});
