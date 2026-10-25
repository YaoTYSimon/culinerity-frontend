import { describe, expect, it } from 'vitest';
import { bandHeadline, rankNudge, SUPPORT_BELOW } from './bands';

describe('bandHeadline', () => {
  it.each([
    [0, 'Food is taking up almost all your headspace.'],
    [19, 'Food is taking up almost all your headspace.'],
    [20, 'Food is taking up a lot of room.'],
    [39, 'Food is taking up a lot of room.'],
    [40, 'Food is on your mind a lot.'],
    [59, 'Food is on your mind a lot.'],
    [60, 'Food is mostly in hand.'],
    [79, 'Food is mostly in hand.'],
    [80, 'Food is in a good place.'],
    [100, 'Food is in a good place.'],
  ])('score %i', (s, h) => expect(bandHeadline(s)).toBe(h));
});

describe('rankNudge', () => {
  it.each([
    [0, 'cheapest'], [19, 'cheapest'], [20, 'cheapest'], [39, 'cheapest'],
    [40, 'balanced'], [59, 'balanced'],
    [60, 'healthiest'], [79, 'healthiest'], [80, 'healthiest'], [100, 'healthiest'],
  ])('score %i', (s, n) => expect(rankNudge(s)).toBe(n));
});

it('SUPPORT_BELOW is 40', () => expect(SUPPORT_BELOW).toBe(40));
