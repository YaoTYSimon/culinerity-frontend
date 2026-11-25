import { useEffect, useMemo, useRef, useState } from 'react';
import { addMissingToList, allRecipes, allSubstitutions, DEFAULT_SERVES, equipmentPhrase, ingredientName, matchRecipes, pantryIngredients, priceTable, suggestAdditions, type EquipmentId, type PantryState, type Profile, type RecipeMatch } from '@culinerity/core';
import { defaultId } from './AddSpend';
import { Disclosure } from './Disclosure';
import { KitchenPicker } from './KitchenPicker';
import { hasFoodRules, noteLines } from './cookNotes';
import { FocusHeading } from './FocusHeading';
import { PageHeader } from './PageHeader';
import {
  COOK_ALL_HIDDEN, COOK_BLOCKED, COOK_FREE_TEXT_ONLY, COOK_NO_PANTRY, COOK_NOTHING_CLOSE, COOK_NOTHING_KITCHEN, COOK_NOTHING_NOW, COOK_RULES_LINE, SECTION_LABELS,
} from './pantryCopy';
import { withPantry, withShopping } from './pantryProfile';
import { PillButton } from './PillButton';
import { RecipePage } from './RecipePage';
import { RecipePicks } from './RecipePicks';
import { RecipeRow } from './RecipeRow';
import { ServesStepper } from './ServesStepper';
import { UndoStatus } from './UndoStatus';
import type { NavTarget } from './views';

interface Props {
  profile: Profile;
  onProfile: (next: Profile) => void;
  now: Date;
  onNavigate: (to: NavTarget) => void;
  /** Open this recipe straight away (from a swap's 'Cook it'); read once when the view opens. */
  openRecipeId?: string | null;
  onOpened?: () => void;
  /** Injected in tests. */
  newId?: () => string;
}

const EMPTY: PantryState = { items: [], staples: [], serves: DEFAULT_SERVES };
const TIERS = ['now', 'one', 'few'] as const;

/** A calm sentence with one link; never a blank screen. */
function Nothing({ text, linkLabel, onLink }: { text: string; linkLabel: string; onLink: () => void }) {
  return (
    <div className="grid justify-items-start gap-1">
      <p className="text-base text-pretty">{text}</p>
      <PillButton variant="text" className="-ml-3" onClick={onLink}>{linkLabel}</PillButton>
    </div>
  );
}

/** Cook with what you have: recipes ranked by what the pantry covers, and the recipe page. All matching happens on this device. */
export function CookView({ profile, onProfile, now, onNavigate, openRecipeId = null, onOpened, newId = defaultId }: Props) {
  const pantry = profile.pantry ?? EMPTY;
  const shopping = profile.shoppingList ?? [];
  const food = profile.foodProfile;
  const recipes = useMemo(() => allRecipes(), []);
  const highRisk = useMemo(() => new Set(pantryIngredients().filter((i) => i.highRisk).map((i) => i.id)), []);
  const prices = useMemo(() => priceTable(), []);
  const [openId, setOpenId] = useState<string | null>(openRecipeId);
  useEffect(() => { if (openRecipeId !== null) onOpened?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(
    () => matchRecipes({ recipes, pantry, food, now, prices, substitutions: allSubstitutions(), highRisk, keep: openId ?? undefined }),
    [recipes, pantry, food, now, prices, highRisk, openId],
  );

  const [message, setMessage] = useState<{ text: string; restore: (() => void) | null } | null>(null);
  const focusRow = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Back from a recipe puts focus on the row it came from.
  useEffect(() => {
    if (openId !== null || focusRow.current === null) return;
    root.current?.querySelector<HTMLElement>(`[data-recipe-id="${CSS.escape(focusRow.current)}"]`)?.focus();
    focusRow.current = null;
  }, [openId]);

  const setServes = (serves: number) => onProfile(withPantry(profile, { ...pantry, serves }));
  const stepper = <ServesStepper serves={pantry.serves} onChange={setServes} />;
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const notesFor = (m: RecipeMatch) => noteLines(m, pantry.items);

  const open = openId ? [...result.matches, ...result.blocked].find((m) => m.recipeId === openId) : undefined;
  const openRecipe = open ? byId.get(open.recipeId) : undefined;
  if (open && openRecipe) {
    const addMissing = () => {
      const before = shopping;
      const r = addMissingToList(shopping, open.missing, openRecipe.id, now, newId);
      if (r.added === 0) return setMessage({ text: 'Already on your list.', restore: null });
      onProfile(withShopping(profile, r.list));
      setMessage({
        text: `Added ${r.added} ${r.added === 1 ? 'thing' : 'things'} to your shopping list.`,
        restore: () => {
          onProfile(withShopping(profile, before));
          setMessage({ text: 'Put back.', restore: null });
        },
      });
    };
    return (
      <div ref={root}>
        <RecipePage
          recipe={openRecipe}
          match={open}
          serves={pantry.serves}
          notes={notesFor(open)}
          servesControl={stepper}
          onAddMissing={addMissing}
          onBack={() => {
            focusRow.current = openRecipe.id;
            setMessage(null);
            setOpenId(null);
          }}
          status={
            <div className="grid justify-items-start gap-1">
              <UndoStatus text={message?.text ?? null} onUndo={message?.restore ?? null} />
              {shopping.length > 0 && <PillButton variant="text" className="-ml-3" onClick={() => onNavigate('pantry')}>See my shopping list</PillButton>}
            </div>
          }
        />
      </div>
    );
  }

  const noPantry = pantry.items.length === 0 && pantry.staples.length === 0;
  const freeTextOnly = !noPantry && pantry.staples.length === 0 && pantry.items.every((i) => i.ingredientId === undefined);
  const hasNow = result.matches.some((m) => m.tier === 'now');
  const suggestions = suggestAdditions(result.matches).map((id) => ingredientName(id));
  const goPantry = () => onNavigate('pantry');
  const setEquipment = (equipment: EquipmentId[]) => onProfile(withPantry(profile, { ...pantry, equipment }));
  const blocked = result.blocked.length > 0 && (
    <section aria-label={COOK_BLOCKED}>
      <Disclosure printOpen={false} summary={<>{COOK_BLOCKED} <span className="font-normal text-muted">{result.blocked.length}</span></>}>
        <ul className="grid">
          {result.blocked.map((m) => (
            <RecipeRow key={m.recipeId} recipe={byId.get(m.recipeId)!} match={m} serves={pantry.serves} notes={[`Needs ${equipmentPhrase(m.lacks)}`, ...notesFor(m)]} onOpen={setOpenId} />
          ))}
        </ul>
      </Disclosure>
    </section>
  );

  let body;
  if (noPantry) body = <Nothing text={COOK_NO_PANTRY} linkLabel="Go to My pantry" onLink={goPantry} />;
  else if (freeTextOnly) body = <Nothing text={COOK_FREE_TEXT_ONLY} linkLabel="Search the ingredient list" onLink={goPantry} />;
  else if (result.matches.length === 0 && result.blocked.length > 0) body = <p className="text-base text-pretty">{COOK_NOTHING_KITCHEN}</p>;
  else if (result.matches.length === 0) {
    body = result.hidden > 0
      ? <Nothing text={COOK_ALL_HIDDEN} linkLabel="Change my food settings" onLink={() => onNavigate('food')} />
      : <Nothing text={COOK_NOTHING_CLOSE} linkLabel="Go to My pantry" onLink={goPantry} />;
  } else {
    body = (
      <>
        {!hasNow && (suggestions.length > 0
          ? <p className="text-base text-pretty">{`${COOK_NOTHING_NOW} Adding one or two more things would help: ${suggestions.join('; ')}.`}</p>
          : <Nothing text={`${COOK_NOTHING_NOW} Add a few more things to My pantry and we will look again.`} linkLabel="Go to My pantry" onLink={goPantry} />)}
        <RecipePicks matches={result.matches} byId={byId} onOpen={setOpenId} />
        {TIERS.map((tier) => {
          const rows = result.matches.filter((m) => m.tier === tier);
          if (rows.length === 0) return null;
          return (
            <section key={tier} aria-labelledby={`cook-${tier}`} className="grid gap-1">
              <h2 id={`cook-${tier}`} className="font-display text-[24px]">{SECTION_LABELS[tier]}</h2>
              <ul className="grid">
                {rows.map((m) => (
                  <RecipeRow key={m.recipeId} recipe={byId.get(m.recipeId)!} match={m} serves={pantry.serves} notes={notesFor(m)} onOpen={setOpenId} />
                ))}
              </ul>
            </section>
          );
        })}
      </>
    );
  }

  return (
    <div ref={root} className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <PageHeader photo="budget-harvest">
        <div className="grid justify-items-start gap-3">
          <FocusHeading>Cook with what you have</FocusHeading>
          {stepper}
        </div>
      </PageHeader>
      <div className="grid justify-items-start gap-3">
        {hasFoodRules(food) && <p className="text-sm text-pretty text-muted">{COOK_RULES_LINE}</p>}
        {result.hidden > 0 && result.matches.length > 0 && (
          <p className="text-sm text-pretty text-muted">{`${result.hidden} ${result.hidden === 1 ? 'recipe is' : 'recipes are'} hidden because of what you told us to avoid.`}</p>
        )}
      </div>
      <KitchenPicker have={pantry.equipment ?? []} onChange={setEquipment} />
      {body}
      {blocked}
    </div>
  );
}
