import { type Recipe, type RecipeMatch } from '@culinerity/core';
import { FoodFitNotes } from './FoodFitNotes';
import { statusLine, timeAndServes } from './cookNotes';
import { STATUS_LABELS } from './pantryCopy';
import { PillButton } from './PillButton';
import { iconKindFor, RecipeIcon } from './recipeIcons';

interface Props {
  recipe: Recipe;
  match: RecipeMatch;
  serves: number;
  /** Uses-soon, swap and look-and-smell lines from `noteLines`. */
  notes: string[];
  onOpen: (recipeId: string) => void;
}

/** One recipe in the results: its name opens the page; the lines say what is needed and why it ranks here. */
export function RecipeRow({ recipe, match, serves, notes, onOpen }: Props) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-2">
      <RecipeIcon kind={iconKindFor(recipe.id)} className="mt-1" />
      <div className="grid min-w-0">
      <PillButton variant="text" data-recipe-id={recipe.id} className="-ml-3 justify-start text-left [overflow-wrap:anywhere]" onClick={() => onOpen(recipe.id)}>
        {recipe.name}
      </PillButton>
      <div className="grid gap-0.5">
        <p className="text-sm text-muted">{timeAndServes(recipe, serves)}</p>
        {match.tier !== 'now' && <p className="text-base text-pretty">{statusLine(STATUS_LABELS[match.tier], match)}</p>}
        {notes.map((n) => <p key={n} className="text-sm text-pretty text-muted">{n}</p>)}
        <FoodFitNotes note={match} />
      </div>
      </div>
    </li>
  );
}
