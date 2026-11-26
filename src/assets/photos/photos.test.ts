import { describe, expect, it } from 'vitest';
import { allRecipes, SEED_DATA } from '@culinerity/core';
import { DISH_PHOTO, photoFor, photoUrl, PHOTO_CREDITS, PHOTO_IDS } from './index';

const IDS = ['burger', 'hot-chips', 'bubble-tea', 'instant-noodles', 'pizza', 'fried-chicken', 'kebab', 'pastry', 'soft-drink', 'chocolate'];

describe('photoFor', () => {
  it('resolves every photographed craving', () => {
    for (const id of IDS) expect(photoFor(id), id).toMatch(/\.jpg/);
  });
  it('resolves swaps and recipes through their dish photo', () => {
    expect(photoFor('smash-burger')).toBe(photoFor('burger'));
    expect(photoFor('scrambled-eggs-toast')).toBe(photoFor('eggs-on-toast'));
  });
  it('returns undefined for unknown ids', () => {
    expect(photoFor('nope')).toBeUndefined();
    expect(photoFor('toString')).toBeUndefined();
  });
});

describe('dish photos', () => {
  const ids = [...new Set([...SEED_DATA.allCravingIds, ...SEED_DATA.swaps.map((s) => s.alternativeId), ...allRecipes().map((r) => r.id)])];
  it('gives every craving, swap food and recipe a photo', () => {
    const missing = ids.filter((id) => !photoFor(id));
    expect(missing, `add a row to DISH_PHOTO for: ${missing.join(', ')}`).toEqual([]);
  });
  it('points every row at a photo file', () => {
    const bad = Object.entries(DISH_PHOTO).filter(([, dish]) => !PHOTO_IDS.includes(dish));
    expect(bad).toEqual([]);
  });
  it('has no stale ids and no row that hides an id own photo', () => {
    expect(Object.keys(DISH_PHOTO).filter((id) => !ids.includes(id))).toEqual([]);
    expect(Object.keys(DISH_PHOTO).filter((id) => PHOTO_IDS.includes(id))).toEqual([]);
  });
});

const WELCOME = ['welcome-curry', 'welcome-soup', 'welcome-pancakes'] as const;

describe('photoUrl', () => {
  it('resolves the three welcome photos', () => {
    for (const name of WELCOME) expect(photoUrl(name), name).toMatch(/\.jpg/);
  });
});

const HEADERS = ['budget-harvest', 'policy-shared-meal', 'signin-cups', 'nearby-market'] as const;

describe('photoUrl (screen headers)', () => {
  it('resolves the four header photos', () => {
    for (const name of HEADERS) expect(photoUrl(name), name).toMatch(/\.jpg/);
  });
});

describe('PHOTO_CREDITS', () => {
  it('has one complete entry per photo', () => {
    expect(PHOTO_CREDITS).toHaveLength(PHOTO_IDS.length);
    expect(PHOTO_CREDITS.map((c) => c.itemId).sort()).toEqual([...PHOTO_IDS].sort());
    for (const c of PHOTO_CREDITS) {
      expect(c.title, c.itemId).toBeTruthy();
      expect(['CC0', 'Pixabay Content Licence'], c.itemId).toContain(c.licence);
      expect(c.creator, c.itemId).toBeTruthy();
      expect(c.licenceUrl, c.itemId).toMatch(/^https:\/\//);
      expect(c.sourceUrl, c.itemId).toMatch(c.licence === 'CC0' ? /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/ : /^https:\/\/pixabay\.com\/photos\//);
    }
  });
});
