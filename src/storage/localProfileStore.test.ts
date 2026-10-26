import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProfileStore } from './localProfileStore';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('LocalProfileStore', () => {
  it('round-trips a profile under culinerity.profile.v1', () => {
    const s = new LocalProfileStore();
    s.save({ foodBudgetWeekly: 60, suburb: 'Carnegie', score: 40 });
    expect(s.load()).toEqual({ foodBudgetWeekly: 60, suburb: 'Carnegie', score: 40 });
    expect(localStorage.getItem('culinerity.profile.v1')).not.toBeNull();
  });
  it('returns {} when nothing is stored', () => {
    expect(new LocalProfileStore().load()).toEqual({});
  });
  it('returns {} for corrupt JSON or non-object JSON', () => {
    localStorage.setItem('culinerity.profile.v1', '{nope');
    expect(new LocalProfileStore().load()).toEqual({});
    localStorage.setItem('culinerity.profile.v1', '[1,2]');
    expect(new LocalProfileStore().load()).toEqual({});
    localStorage.setItem('culinerity.profile.v1', 'null');
    expect(new LocalProfileStore().load()).toEqual({});
  });
  it('drops wrong-typed and unknown fields', () => {
    localStorage.setItem(
      'culinerity.profile.v1',
      JSON.stringify({ foodBudgetWeekly: '60', incomeWeekly: 500, score: null, suburb: 5, scoreTakenAt: '2026-10-01', extra: 1 }),
    );
    expect(new LocalProfileStore().load()).toEqual({ incomeWeekly: 500, scoreTakenAt: '2026-10-01' });
  });
  it('returns {} when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(new LocalProfileStore().load()).toEqual({});
  });
  it('does not throw when setItem or removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const s = new LocalProfileStore();
    expect(() => s.save({ score: 1 })).not.toThrow();
    expect(() => s.clear()).not.toThrow();
  });
  it('clear removes the profile', () => {
    const s = new LocalProfileStore();
    s.save({ score: 1 });
    s.clear();
    expect(s.load()).toEqual({});
  });
  it('uses culinerity.profile.v1.<id> for a suffixed store and keeps profiles apart from the guest', () => {
    const guest = new LocalProfileStore();
    const a = new LocalProfileStore('.a1');
    const b = new LocalProfileStore('.b2');
    guest.save({ score: 1 });
    a.save({ score: 2 });
    b.save({ score: 3 });
    expect(localStorage.getItem('culinerity.profile.v1.a1')).toBe(JSON.stringify({ score: 2 }));
    expect([guest.load().score, a.load().score, b.load().score]).toEqual([1, 2, 3]);
    a.clear();
    expect(a.load()).toEqual({});
    expect(guest.load().score).toBe(1);
    expect(b.load().score).toBe(3);
  });
  it('a suffixed store never throws either', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const s = new LocalProfileStore('.x');
    expect(s.load()).toEqual({});
    expect(() => s.save({ score: 1 })).not.toThrow();
    expect(() => s.clear()).not.toThrow();
  });
});
