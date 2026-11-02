/** Two tiers: the hand-read starter set, and places listed in bulk from an open dataset. */
export type PlaceTier = 'checked' | 'bulk';

export const BULK_KINDS = ['supermarket', 'greengrocer', 'bakery', 'takeaway', 'cafe-restaurant', 'butcher', 'fishmonger', 'deli'] as const;
export type BulkKind = (typeof BULK_KINDS)[number];

/** Licences a bulk record may carry. Apache-2.0 is absent on purpose: Foursquare-derived records are left out. */
export const BULK_LICENCES = ['CDLA-Permissive-2.0', 'CC0-1.0'] as const;
export type BulkLicence = (typeof BULK_LICENCES)[number];

/**
 * A place listed in bulk from Overture Maps. Name, position, address and category are the source's own words.
 * There is no price field to fill in (`price` is always `unknown`) and no hours field at all.
 */
export interface BulkPlace {
  /** `ovt-<Overture GERS id>`. */
  id: string;
  name: string;
  kind: BulkKind;
  lat: number;
  lng: number;
  /** Street address as the source gives it. Overture's `locality` is not shipped: it says "Melbourne" for most places. */
  address: string;
  /** Four-digit postcode from the source's address, shown beside the address; absent when the source has none. */
  postcode?: string;
  price: 'unknown';
  /** The source's existence confidence, 0 to 1. Used to filter before sharding; never shown, and shards do not carry it. */
  confidence?: number;
  website?: string;
  source: 'overture';
  /** The contributing dataset named in Overture's `sources` (for example `meta`). */
  sourceDataset: string;
  /** The pinned Overture release id. */
  release: string;
  licence: BulkLicence;
}

export const CHECKED_TIER_LABEL = 'Checked by us';
export const BULK_TIER_LABEL = 'Not checked by us';
export const BULK_PRICE_TEXT = 'Price not known';
export const BULK_HOURS_TEXT = 'Check hours before you go';

export function tierLabel(tier: PlaceTier): string {
  return tier === 'checked' ? CHECKED_TIER_LABEL : BULK_TIER_LABEL;
}

const KIND_LABELS: Record<BulkKind, string> = {
  supermarket: 'Supermarket or grocer',
  greengrocer: 'Fresh produce',
  bakery: 'Bakery',
  takeaway: 'Takeaway',
  'cafe-restaurant': 'Cafe or restaurant',
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  deli: 'Deli',
};

/** A label from the category alone. It never says cheap, healthy or good value. */
export function bulkKindLabel(kind: BulkKind): string {
  return KIND_LABELS[kind];
}

export function bulkSourceLine(release: string): string {
  return `Listed by Overture Maps, release ${release}. Not checked by us.`;
}
