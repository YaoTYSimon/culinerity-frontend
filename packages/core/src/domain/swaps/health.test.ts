import { describe, expect, it } from 'vitest';
import { healthScore, NEUTRAL_SODIUM_MG } from './health';

const base = { itemId: 'x', energyKj: 1500, proteinG: 20, fibreG: 5, sugarG: 5 };

describe('healthScore sodium', () => {
  it('penalises modelled sodium', () => {
    expect(healthScore({ ...base, sodiumMg: 100 })).toBeGreaterThan(healthScore({ ...base, sodiumMg: 1500 }));
  });
  it('ignores the sodium figure when it is not modelled and scores it as neutral', () => {
    const low = healthScore({ ...base, sodiumMg: 0, sodiumModelled: false });
    const high = healthScore({ ...base, sodiumMg: 3000, sodiumModelled: false });
    expect(low).toBe(high);
    expect(low).toBe(healthScore({ ...base, sodiumMg: NEUTRAL_SODIUM_MG }));
  });
  it('treats an absent flag or true as modelled', () => {
    expect(healthScore({ ...base, sodiumMg: 800, sodiumModelled: true })).toBe(healthScore({ ...base, sodiumMg: 800 }));
  });
});
