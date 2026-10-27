export type PlaceKind = 'market' | 'grocer' | 'social-supermarket' | 'community-meal' | 'food-relief' | 'co-op';
export type PriceBand = 'free' | 'budget' | 'mid' | 'pricier';
export type PlaceFit = 'fresh' | 'packaged' | 'meals';
export type PlaceAccess = 'open' | 'referral' | 'membership';

export interface PlaceSourceRecord {
  id: string;
  publisher: string;
  /** Page title plus how the coordinates were obtained. */
  title: string;
  url: string;
  licence: string;
  accessed: string;
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  address: string;
  suburb: string;
  priceBand: PriceBand;
  fit: PlaceFit[];
  access: PlaceAccess;
  /** The source's own words; absent when the source states none. */
  hours?: string;
  sourceId: string;
  verification: 'primary' | 'secondary';
  /** ISO date (YYYY-MM-DD) the source was last read. */
  checked: string;
}

export interface PlaceData {
  generatedAt: string;
  sources: PlaceSourceRecord[];
  places: Place[];
  notFound: string[];
}
