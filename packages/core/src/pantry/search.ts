import type { IngredientRow } from '../recipes/types';

/** Lower case, diacritics folded, spaces collapsed. */
export function foldText(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const PREFIX = 0;
const WORD_PREFIX = 1;
const SUBSTRING = 2;

function rank(candidate: string, q: string): number | null {
  if (candidate.startsWith(q)) return PREFIX;
  if (candidate.split(' ').some((w) => w.startsWith(q))) return WORD_PREFIX;
  return candidate.includes(q) ? SUBSTRING : null;
}

/** Ingredients matching the query by name prefix, then word prefix, then substring, over `name` and `aliases`. Ties keep table order. */
export function searchIngredients(query: string, ingredients: IngredientRow[], limit = 8): IngredientRow[] {
  const q = foldText(query);
  if (!q) return [];
  const hits: { row: IngredientRow; rank: number; index: number }[] = [];
  ingredients.forEach((row, index) => {
    const ranks = [row.name, ...(row.aliases ?? [])].map((c) => rank(foldText(c), q)).filter((r): r is number => r !== null);
    if (ranks.length > 0) hits.push({ row, rank: Math.min(...ranks), index });
  });
  return hits
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map((h) => h.row);
}
