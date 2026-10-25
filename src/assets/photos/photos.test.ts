import { describe, expect, it } from 'vitest';
import { photoFor, photoUrl, PHOTO_CREDITS } from './index';

const IDS = ['burger', 'hot-chips', 'bubble-tea', 'instant-noodles', 'pizza', 'fried-chicken', 'kebab', 'pastry', 'soft-drink', 'chocolate'];

describe('photoFor', () => {
  it('resolves every photographed craving', () => {
    for (const id of IDS) expect(photoFor(id), id).toMatch(/\.jpg/);
  });
  it('returns undefined for swaps and unknown ids', () => {
    expect(photoFor('smash-burger')).toBeUndefined();
    expect(photoFor('nope')).toBeUndefined();
    expect(photoFor('toString')).toBeUndefined();
  });
});

const WELCOME = ['welcome-curry', 'welcome-soup', 'welcome-pancakes'] as const;

describe('photoUrl', () => {
  it('resolves the three welcome photos', () => {
    for (const name of WELCOME) expect(photoUrl(name), name).toMatch(/\.jpg/);
  });
});

describe('PHOTO_CREDITS', () => {
  it('has one complete entry per photo', () => {
    expect(PHOTO_CREDITS).toHaveLength(13);
    expect(PHOTO_CREDITS.map((c) => c.itemId).sort()).toEqual([...IDS, ...WELCOME].sort());
    for (const c of PHOTO_CREDITS) {
      expect(c.title, c.itemId).toBeTruthy();
      expect(c.licence, c.itemId).toBe('CC0');
      expect(c.creator, c.itemId).toBeTruthy();
      expect(c.licenceUrl, c.itemId).toMatch(/^https:\/\//);
      expect(c.sourceUrl, c.itemId).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
