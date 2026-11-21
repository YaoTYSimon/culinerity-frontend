import { describe, expect, it } from 'vitest';
import {
  BULK_HOURS_TEXT,
  BULK_KINDS,
  BULK_LICENCES,
  BULK_PRICE_TEXT,
  BULK_TIER_LABEL,
  CHECKED_TIER_LABEL,
  bulkKindLabel,
  bulkRowNotes,
  bulkSourceLine,
  tierLabel,
} from './tier';

describe('place tiers', () => {
  it('names the two tiers in plain words', () => {
    expect(tierLabel('checked')).toBe('Checked by us');
    expect(tierLabel('bulk')).toBe('Not checked by us');
    expect(CHECKED_TIER_LABEL).not.toBe(BULK_TIER_LABEL);
  });
  it('labels every bulk kind from the category only, with no health claim', () => {
    expect(BULK_KINDS.map(bulkKindLabel)).toEqual(['Supermarket or grocer', 'Fresh produce', 'Bakery', 'Takeaway', 'Cafe or restaurant', 'Butcher', 'Fishmonger', 'Deli', 'Food relief (listing not checked)']);
    for (const k of BULK_KINDS) expect(bulkKindLabel(k)).not.toMatch(/health|cheap|budget|free|affordable/i);
  });
  it('never states a price or hours for a bulk place', () => {
    expect(BULK_PRICE_TEXT).toBe('Price not known');
    expect(BULK_HOURS_TEXT).toBe('Check hours before you go');
  });
  it('gives a food relief row no price line and a plain "check" line, and every other kind the usual two', () => {
    expect(bulkRowNotes('food-relief')).toEqual({ price: null, hours: 'Check opening hours and who it is for before you go' });
    for (const k of BULK_KINDS.filter((k) => k !== 'food-relief')) expect(bulkRowNotes(k)).toEqual({ price: 'Price not known', hours: 'Check hours before you go' });
    expect(bulkRowNotes('food-relief').hours).not.toMatch(/free|cheap|\$|price/i);
  });
  it('credits the release and says the place is not checked', () => {
    expect(bulkSourceLine('2026-09-17.0')).toBe('Listed by Overture Maps, release 2026-09-17.0. Not checked by us: a sample check did not confirm that these places are open and in the right spot, so some may have closed or moved.');
  });
  it('allows only the permissive licences (no Apache-2.0, so no Foursquare records)', () => {
    expect([...BULK_LICENCES]).toEqual(['CDLA-Permissive-2.0', 'CC0-1.0']);
  });
});
