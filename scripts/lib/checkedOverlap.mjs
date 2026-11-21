// The checked record wins: a food relief row from the bulk tier that sits within 100 m of one of our hand-verified places
// with a similar name is dropped from the bulk tier. Pure; the caller reads docs/superpowers/research/2026-10-27-nearby-places.json.
import { distanceMeters } from './overtureFilter.mjs';
import { nameTokens } from './placeQuality.mjs';

/** Metres within which a bulk food relief row is the same place as a checked one (given a similar name). */
export const CHECKED_OVERLAP_METERS = 100;

// Words every food relief name has; they never make two names "similar" on their own.
const RELIEF_WORDS = new Set(['food', 'foodbank', 'bank', 'hub', 'foodhub', 'community', 'centre', 'center', 'pantry', 'relief', 'emergency', 'inc', 'ltd', 'neighbourhood', 'neighborhood', 'house', 'church', 'churches', 'service', 'services', 'support', 'victoria', 'collective', 'kitchen', 'little', 'free', 'pickup', 'parcels', 'vouchers']);

const distinct = (name) => nameTokens(name).filter((t) => !RELIEF_WORDS.has(t));
const compact = (name) => distinct(name).join('');

/** True when the names share a distinctive word, or the distinctive words run together match ("Wood Side" and "Woodside"). */
export function similarReliefNames(a, b) {
  const da = new Set(distinct(a));
  if (distinct(b).some((t) => da.has(t))) return true;
  const [ca, cb] = [compact(a), compact(b)];
  return ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca));
}

/** Splits places into `kept` and `dropped` ({ id, name, of }): only `food-relief` rows are tested against `checked` ({ name, lat, lng }). */
export function dropNearChecked(places, checked, meters = CHECKED_OVERLAP_METERS) {
  const kept = [];
  const dropped = [];
  for (const p of places) {
    const twin = p.kind === 'food-relief' ? checked.find((c) => distanceMeters(c, p) <= meters && similarReliefNames(c.name, p.name)) : undefined;
    if (twin) dropped.push({ id: p.id, name: p.name, of: twin.name });
    else kept.push(p);
  }
  return { kept, dropped };
}
