import type { BulkKind, PlaceAccess, PlaceFit, PlaceKind, PriceBand } from '@culinerity/core';

const SVG = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const BASKET = 'M4 10h16l-2 9H6zM9 10l3-6 3 6';
const BOWL = 'M3 11h18a9 9 0 01-18 0zM8 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4';
const HEART = 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z';
const STALL = 'M3 10l1.5-5h15L21 10v1a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0zM5 14v6h14v-6';
const BAG = 'M6 8h12l1 12H5zM9 8a3 3 0 016 0';

const KIND: Record<PlaceKind, string> = {
  market: STALL, grocer: BASKET, 'social-supermarket': BASKET, 'co-op': BASKET, 'community-meal': BOWL, 'food-relief': HEART, takeaway: BAG, 'cafe-restaurant': BOWL,
};
const BULK: Record<BulkKind, string> = {
  supermarket: BASKET, greengrocer: BASKET, bakery: BAG, takeaway: BAG, 'cafe-restaurant': BOWL, butcher: BAG, fishmonger: BAG, deli: BAG, 'food-relief': HEART,
};
const FIT: Record<PlaceFit, string> = {
  fresh: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l7-7', // leaf
  meals: BOWL,
  packaged: 'M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9', // box
};
const ACCESS: Record<PlaceAccess, string> = {
  open: 'M6 21V4h9v17M3 21h18M12 12.5v.01', // door
  referral: 'M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h6', // note
  membership: 'M3 6h18v12H3zM3 10h18M7 15h4', // card
};

const Icon = ({ d, className = 'size-5' }: { d: string; className?: string }) => (
  <svg {...SVG} className={`${className} shrink-0`}><path d={d} /></svg>
);

export const KindGlyph = ({ kind }: { kind: PlaceKind }) => <Icon d={KIND[kind]} />;
export const BulkKindGlyph = ({ kind }: { kind: BulkKind }) => <Icon d={BULK[kind]} />;
export const FitGlyph = ({ fit }: { fit: PlaceFit }) => <Icon d={FIT[fit]} className="size-4" />;
export const AccessGlyph = ({ access }: { access: PlaceAccess }) => <Icon d={ACCESS[access]} className="size-4" />;
export const ClockGlyph = () => <Icon d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="size-4" />;
export const PinGlyph = () => <Icon d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11zM12 12.5v.01" />;
export const WarnGlyph = () => <Icon d="M12 4l9 16H3zM12 10v4M12 17v.01" className="size-4" />;

/** Four steps of cost as dots: free has none filled, pricier has three. The words beside it carry the meaning. */
export function PriceDots({ band }: { band: PriceBand }) {
  const filled = { free: 0, budget: 1, mid: 2, pricier: 3 }[band];
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => <span key={i} className={`size-2 rounded-full ${i < filled ? 'bg-ink' : 'bg-muted opacity-40'}`} />)}
    </span>
  );
}

export const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-4 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 6l4.5 4.5L12.5 6" />
  </svg>
);
