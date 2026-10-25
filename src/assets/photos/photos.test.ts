import { describe, expect, it } from 'vitest';
import { photoFor, PHOTO_CREDITS } from './index';

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

describe('PHOTO_CREDITS', () => {
  it('has one complete entry per photo', () => {
    expect(PHOTO_CREDITS).toHaveLength(10);
    expect(PHOTO_CREDITS.map((c) => c.itemId).sort()).toEqual([...IDS].sort());
    for (const c of PHOTO_CREDITS) {
      expect(c.licence, c.itemId).toBeTruthy();
      expect(c.creator, c.itemId).toBeTruthy();
      expect(c.licenceUrl, c.itemId).toMatch(/^https:\/\//);
      expect(c.sourceUrl, c.itemId).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
