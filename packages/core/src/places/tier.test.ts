import { describe, expect, it } from 'vitest';
import {
  BULK_HOURS_TEXT,
  BULK_KINDS,
  BULK_LICENCES,
  BULK_PRICE_TEXT,
  BULK_TIER_LABEL,
  CHECKED_TIER_LABEL,
  bulkKindLabel,
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
    expect(BULK_KINDS.map(bulkKindLabel)).toEqual(['Supermarket', 'Fresh produce', 'Bakery', 'Takeaway', 'Cafe or restaurant']);
    for (const k of BULK_KINDS) expect(bulkKindLabel(k)).not.toMatch(/health|cheap|budget|free|affordable/i);
  });
  it('never states a price or hours for a bulk place', () => {
    expect(BULK_PRICE_TEXT).toBe('Price not known');
    expect(BULK_HOURS_TEXT).toBe('Check hours before you go');
  });
  it('credits the release and says the place is not checked', () => {
    expect(bulkSourceLine('2026-09-17.0')).toBe('Listed by Overture Maps, release 2026-09-17.0. Not checked by us.');
  });
  it('allows only the permissive licences (no Apache-2.0, so no Foursquare records)', () => {
    expect([...BULK_LICENCES]).toEqual(['CDLA-Permissive-2.0', 'CC0-1.0']);
  });
});
