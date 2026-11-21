// Conservative, mechanical quality rules for kept Overture places (names, addresses, shared points). Pure: no file or network access.
// Nothing here edits or invents a value: a record either passes unchanged or is dropped. Chains are never a reason to drop.

export const QUALITY_REASONS = ['truncated-name', 'junk-name', 'bad-address', 'centroid'];
/** More distinct names than this at one 5-decimal point means a centre point (a mall or food court), not a shop position. */
export const MAX_NAMES_PER_POINT = 8;

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** Words that can never end a whole name: the name was cut off ("Wyndham Community And"). */
const DANGLING = /(?:^|\s)(?:and|&|of|the|at|in|for|with|to|a|an|by)$/i;
/** "eat in" and "dine in" are complete endings. */
const COMPLETE_IN = /\b(?:eat|dine|sit|take|walk|drive|drop)[ -]?in$/i;

/** Whole-name words that say only what kind of place it is. Deliberately short: "Fish and Chips" and "Kitchen" are left alone. */
const KIND_WORDS = new Set([
  'cafe', 'cafes', 'restaurant', 'restaurants', 'bakery', 'bakeries', 'supermarket', 'supermarkets', 'takeaway', 'takeaways',
  'butcher', 'butchers', 'butchery', 'deli', 'delicatessen', 'pizza', 'pizzeria', 'food', 'foods', 'grocery', 'groceries',
  'grocer', 'greengrocer', 'coffee', 'market', 'kebab', 'kebabs', 'bar', 'shop', 'store', 'eatery', 'cafeteria',
]);

/** Words too common to identify a place on their own (kind words and cuisines); a name made only of these is never matched by prefix. */
export const GENERIC_WORDS = new Set([...KIND_WORDS, 'thai', 'sushi', 'chinese', 'indian', 'italian', 'japanese', 'korean', 'vietnamese', 'turkish', 'greek', 'mexican', 'burger', 'burgers', 'chicken', 'noodle', 'noodles', 'fish', 'chips', 'kitchen', 'house', 'fresh', 'express']);

const letters = (s) => s.normalize('NFD').replace(/\p{M}/gu, '');
export const nameTokens = (s) =>
  letters(s)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && w !== 'and' && w !== 'the');

function truncated(name) {
  if (/[,;:\-\u2013\u2014/|]$/u.test(name)) return true; // ends in a dangling separator ("Cafe -", "Bakery,")
  if ((name.match(/\(/g) ?? []).length > (name.match(/\)/g) ?? []).length) return true;
  return DANGLING.test(name) && !COMPLETE_IN.test(name);
}

function junk(name) {
  if ([...name].length < 2) return true;
  if (!/\p{L}/u.test(name)) return true; // digits and punctuation only
  if (/https?:\/\/|www\./i.test(name) || /^\S+\.(?:com|net|org|io|co)(?:\.au)?$|^\S+\.au$/i.test(name)) return true;
  if ((name.match(/\d/g) ?? []).length >= 8) return true; // a phone number
  if (/\s{4,}/.test(name)) return true; // padded spam text
  const w = nameTokens(name);
  if (w.length > 0 && w.every((x) => KIND_WORDS.has(x))) return true;
  return false;
}

const STREET_WORD = /\b(?:street|st|road|rd|avenue|ave|highway|hwy|drive|dr|lane|ln|court|ct|place|pl|parade|pde|boulevard|blvd|terrace|tce|crescent|cres|close|way|freeway|fwy|circuit|esplanade)\b/gi;
/** A named venue stands in for a number: a shop in "Brimbank Central Shopping Centre" is as locatable as the source allows. */
const VENUE_WORD = /\b(?:shopping centre|shopping center|plaza|mall|westfield|market|station|airport|terminal|village|square|arcade)\b/i;

/** A usable address has a street word and a number, or two streets at a corner, or a named shopping venue. */
function badAddress(address) {
  if (!/\p{L}{3,}/u.test(address)) return true;
  if (/\d/.test(address)) return false;
  if (/\b(?:cnr|corner)\b|&/i.test(address) || VENUE_WORD.test(address)) return false;
  return (address.match(STREET_WORD) ?? []).length < 2;
}

/** The reason a record cannot be shown honestly, or null. Checks the name first, then the address. */
export function qualityDrop(place) {
  const name = text(place.name);
  if (truncated(name)) return 'truncated-name';
  if (junk(name)) return 'junk-name';
  if (badAddress(text(place.address))) return 'bad-address';
  return null;
}

/** Records sharing one point (5 decimals, as shipped) with more than `max` distinct names are all dropped: a centre point, not a shop. */
export function dropCentroids(places, max = MAX_NAMES_PER_POINT) {
  const at = new Map();
  for (const q of places) {
    const key = `${q.lat.toFixed(5)},${q.lng.toFixed(5)}`;
    if (!at.has(key)) at.set(key, { names: new Set(), items: [] });
    const g = at.get(key);
    g.names.add(nameTokens(q.name).join(' '));
    g.items.push(q);
  }
  const kept = [];
  const dropped = [];
  for (const g of at.values()) (g.names.size > max ? dropped : kept).push(...g.items);
  const order = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { kept: kept.sort(order), dropped: dropped.sort(order) };
}
