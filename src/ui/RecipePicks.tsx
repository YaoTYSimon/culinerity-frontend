import type { Recipe, RecipeMatch } from '@culinerity/core';
import { RecipeImage } from './RecipeImage';
import { PICKS_LABEL } from './pantryCopy';

const MAX_PICKS = 5;

/** "Good with what you have": the best pantry matches, already ranked by `matchRecipes`. No popularity claim and no counts beyond what the pantry covers. */
export function RecipePicks({ matches, byId, onOpen }: { matches: RecipeMatch[]; byId: Map<string, Recipe>; onOpen: (id: string) => void }) {
  const picks = matches.filter((m) => m.have > 0).slice(0, MAX_PICKS);
  if (picks.length === 0) return null;
  return (
    <section aria-labelledby="cook-picks" className="grid gap-3">
      <h2 id="cook-picks" className="font-display text-[24px]">{PICKS_LABEL}</h2>
      <ul className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
        {picks.map((m) => {
          const recipe = byId.get(m.recipeId)!;
          const dots = Math.min(m.core, 8);
          return (
            <li key={m.recipeId} className="w-28 shrink-0">
              <button type="button" data-pick-id={m.recipeId} aria-label={`${recipe.name}, uses ${m.have} of your items`} onClick={() => onOpen(m.recipeId)} className="focus-ring motion-colors grid w-full justify-items-center gap-1.5 rounded-3xl p-1 text-center">
                <RecipeImage recipeId={recipe.id} size="lg" />
                <span className="text-sm font-semibold text-pretty [overflow-wrap:anywhere]">{recipe.name}</span>
                <span className="text-xs text-muted">{`Uses ${m.have} of your items`}</span>
                <span aria-hidden="true" className="flex gap-0.5">
                  {Array.from({ length: dots }, (_, i) => <span key={i} className={`size-1.5 rounded-full ${i < Math.min(m.have, dots) ? 'bg-ink' : 'bg-muted opacity-40'}`} />)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
