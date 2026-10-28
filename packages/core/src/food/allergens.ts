import type { AllergenId } from './types';

const TREE_NUTS: AllergenId[] = ['almond', 'brazil-nut', 'cashew', 'hazelnut', 'macadamia', 'pecan', 'pistachio', 'pine-nut', 'walnut'];
const GLUTEN_GRAINS: AllergenId[] = ['wheat', 'barley', 'rye', 'oats'];

/** Words that carry no allergen, only framing ("nut allergy", "gluten intolerance"). */
const FRAMING = /\b(allerg(?:y|ies|ic)|intoleran(?:ce|t)|to|free|sensitivity)\b/g;

/** Normalised (lower case, singular) phrase to the allergens it names. Plain "nut" is read cautiously: tree nuts and peanut. */
const PHRASES: Record<string, AllergenId[]> = {
  peanut: ['peanut'],
  nut: [...TREE_NUTS, 'peanut'],
  'tree nut': TREE_NUTS,
  dairy: ['milk'],
  milk: ['milk'],
  egg: ['egg'],
  soy: ['soy'],
  soya: ['soy'],
  soybean: ['soy'],
  wheat: ['wheat'],
  gluten: GLUTEN_GRAINS,
  sesame: ['sesame'],
  fish: ['fish'],
  shellfish: ['crustacean', 'mollusc'],
  lupin: ['lupin'],
  sulphite: ['sulphites'],
};

function normalisePhrase(text: string): string {
  const base = text.toLowerCase().replace(FRAMING, ' ').replace(/\s+/g, ' ').trim();
  return base.endsWith('s') && !base.endsWith('ss') ? base.slice(0, -1) : base;
}

/**
 * Map typed allergy words onto FSANZ allergen ids. A word that maps to nothing is returned in
 * `unmatched` so the app can say it cannot check it. Empty strings are ignored.
 */
export function matchAllergies(texts: string[]): { ids: AllergenId[]; unmatched: string[] } {
  const ids = new Set<AllergenId>();
  const unmatched: string[] = [];
  for (const raw of texts) {
    const text = raw.trim();
    if (!text) continue;
    const found = PHRASES[normalisePhrase(text)];
    if (found) found.forEach((id) => ids.add(id));
    else unmatched.push(text);
  }
  return { ids: [...ids], unmatched };
}
