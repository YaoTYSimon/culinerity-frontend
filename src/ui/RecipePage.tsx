import type { ReactNode } from 'react';
import { ingredientName, priceTable, recipeCostPerServeCents, safetyLines, type Recipe, type RecipeMatch } from '@culinerity/core';
import { useMemo } from 'react';
import { dollars, gramsFor, ingredientStatus, timeAndServes } from './cookNotes';
import { FocusHeading } from './FocusHeading';
import { FoodFitNotes } from './FoodFitNotes';
import { NutritionCredit } from './NutritionCredit';
import { ADD_MISSING, NSW_ATTRIBUTION, SAFETY_HEADING, SALT_NOTE } from './pantryCopy';
import { PillButton } from './PillButton';
import { iconKindFor, RecipeIcon } from './recipeIcons';

interface Props {
  recipe: Recipe;
  match: RecipeMatch;
  serves: number;
  onBack: () => void;
  onAddMissing: () => void;
  /** Lines from `noteLines` (uses soon, swaps, look-and-smell). */
  notes?: string[];
  /** The serves stepper, so grams can be rescaled here. */
  servesControl?: ReactNode;
  /** The status line that follows an add, with Undo. */
  status?: ReactNode;
}

const kj = (n: number): string => `${Math.round(n).toLocaleString('en-AU')} kJ`;
const grams1 = (n: number): string => `${Math.round(n * 10) / 10} g`;

/** The recipe: steps and safety lines exactly as the dataset has them; nothing here invents a time or a temperature. */
export function RecipePage({ recipe, match, serves, onBack, onAddMissing, notes = [], servesControl, status }: Props) {
  const prices = useMemo(() => priceTable(), []);
  const perServeCents = recipeCostPerServeCents(recipe, prices);
  const safety = safetyLines(recipe);
  const n = recipe.nutrition.perServe;
  const facts: Array<[string, string]> = [['Energy', kj(n.energyKj)], ['Protein', grams1(n.proteinG)], ['Fibre', grams1(n.fibreG)], ['Sugars', grams1(n.sugarG)]];
  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <div className="grid justify-items-start gap-3">
        <PillButton variant="text" className="-ml-3" onClick={onBack}>Back to recipes</PillButton>
        <RecipeIcon kind={iconKindFor(recipe.id)} size="lg" />
        <FocusHeading>{recipe.name}</FocusHeading>
        <p className="text-base text-pretty text-muted">{recipe.blurb}</p>
        <p className="text-base font-semibold">{timeAndServes(recipe, serves)}</p>
        {servesControl}
        {notes.map((line) => <p key={line} className="text-sm text-pretty text-muted">{line}</p>)}
        <div><FoodFitNotes note={match} /></div>
      </div>

      <section aria-labelledby="recipe-ingredients" className="grid gap-2">
        <h2 id="recipe-ingredients" className="font-display text-[24px]">Ingredients</h2>
        <ul aria-label="Ingredients" className="grid">
          {recipe.ingredients.map((row) => (
            <li key={row.ingredient} className="grid py-1">
              <span className="text-base font-semibold">{ingredientName(row.ingredient)}</span>
              <span className="text-sm text-muted">{`${gramsFor(row, recipe, serves)} g · ${ingredientStatus(row, match)}`}</span>
            </li>
          ))}
        </ul>
        {recipe.seasonings.length > 0 && <p className="text-sm text-muted">{`Season with ${recipe.seasonings.join(' and ')} to taste.`}</p>}
        {recipe.uncounted && recipe.uncounted.length > 0 && <p className="text-sm text-muted">{`Also a little: ${recipe.uncounted.map((id) => ingredientName(id).toLowerCase()).join(', ')} (not counted above).`}</p>}
        {match.missing.length > 0 && <div><PillButton variant="surface" onClick={onAddMissing}>{ADD_MISSING}</PillButton></div>}
        {status}
      </section>

      <section aria-labelledby="recipe-steps" className="grid gap-2">
        <h2 id="recipe-steps" className="font-display text-[24px]">Steps</h2>
        <ol aria-label="Steps" className="grid list-decimal gap-2 pl-6 text-base text-pretty marker:font-semibold">
          {recipe.steps.map((s, i) => <li key={i} className="pl-1">{s}</li>)}
        </ol>
      </section>

      {safety.length > 0 && (
        <section aria-labelledby="recipe-safety" className="grid gap-2">
          <h2 id="recipe-safety" className="font-display text-[24px]">{SAFETY_HEADING}</h2>
          <ul className="grid list-disc gap-1 pl-6 text-base text-pretty">
            {safety.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <p className="text-sm text-pretty text-muted">{NSW_ATTRIBUTION}</p>
        </section>
      )}

      <section aria-labelledby="recipe-nutrition" className="grid gap-2">
        <h2 id="recipe-nutrition" className="font-display text-[24px]">Nutrition</h2>
        <dl role="group" aria-label="Per serve" className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">{SALT_NOTE}</p>
        {perServeCents !== null && <p className="text-base font-semibold">{`About ${dollars(perServeCents)} a serve (sample data)`}</p>}
        <div className="text-sm text-muted"><NutritionCredit /></div>
        {recipe.credit && <p className="text-sm text-pretty text-muted">{recipe.credit}</p>}
      </section>
    </article>
  );
}
