import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addItem, listTotalCents, pantryIngredients, recipesData, removeEntry, removeItem, sanitizePantry, setStaple, STARTER_IDS, updateItem,
  type ItemEdit, type PantryItem, type PantryState, type Profile, type ShoppingEntry, clearList, clearPantry, DEFAULT_SERVES,
} from '@culinerity/core';
import { defaultId } from './AddSpend';
import { FocusHeading } from './FocusHeading';
import { ADD_ERRORS, EMPTY_PANTRY, INTRO, SHARED_DEVICE, STAPLE_IDS, STAPLES_HINT, STAPLES_LABEL } from './pantryCopy';
import { PantryAdd } from './PantryAdd';
import { PantryList } from './PantryList';
import { PantryShopping } from './PantryShopping';
import { PillButton } from './PillButton';
import type { NavTarget } from './views';

interface Props {
  profile: Profile;
  /** Called with the whole updated profile. */
  onProfile: (next: Profile) => void;
  now: Date;
  onNavigate: (to: NavTarget) => void;
  /** Injected in tests. */
  newId?: () => string;
}

const EMPTY: PantryState = { items: [], staples: [], serves: DEFAULT_SERVES };

/** The profile with its pantry set (the key is dropped when there is nothing to keep). */
function withPantry(profile: Profile, state: PantryState): Profile {
  const { pantry: _dropped, ...rest } = profile;
  const clean = sanitizePantry(state);
  return clean ? { ...rest, pantry: clean } : rest;
}
function withShopping(profile: Profile, list: ShoppingEntry[]): Profile {
  const { shoppingList: _dropped, ...rest } = profile;
  return list.length > 0 ? { ...rest, shoppingList: list } : rest;
}

type Message = { text: string; restore: ((p: Profile) => Profile) | null };

/** My pantry: what the person has, in two taps or a few words. Everything stays on this device. */
export function PantryView({ profile, onProfile, now, onNavigate, newId = defaultId }: Props) {
  const pantry = profile.pantry ?? EMPTY;
  const shopping = profile.shoppingList ?? [];
  const ingredients = useMemo(() => pantryIngredients(), []);
  const known = useMemo(() => new Set(ingredients.map((i) => i.id)), [ingredients]);
  const highRisk = useMemo(() => new Set(ingredients.filter((i) => i.highRisk).map((i) => i.id)), [ingredients]);
  const prices = useMemo(() => new Map(recipesData.prices.map((p) => [p.ingredient, p.perKg])), []);
  const starters = STARTER_IDS.filter((id) => known.has(id));
  const staples = STAPLE_IDS.filter((id) => known.has(id));
  const nameOf = (id: string) => ingredients.find((i) => i.id === id)?.name ?? id;

  const [message, setMessage] = useState<Message | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<{ id: string | null } | null>(null);

  // After a row is removed, focus lands on its neighbour's Remove button, or the list heading.
  useEffect(() => {
    const pending = focusAfter.current;
    if (!pending) return;
    focusAfter.current = null;
    const target = pending.id ? list.current?.querySelector<HTMLElement>(`[data-remove-id="${CSS.escape(pending.id)}"]`) : null;
    (target ?? listHeading.current)?.focus();
  }, [profile]);

  const say = (text: string) => setMessage({ text, restore: null });
  /** Save a new profile and say what happened, with Undo putting the earlier pantry or list back. */
  const commit = (next: Profile, text: string, restore: (p: Profile) => Profile) => {
    onProfile(next);
    setMessage({ text, restore });
  };
  const changePantry = (state: PantryState, text: string) => {
    const before = pantry;
    commit(withPantry(profile, state), text, (p) => withPantry(p, before));
  };
  const changeShopping = (next: ShoppingEntry[], text: string) => {
    const before = shopping;
    commit(withShopping(profile, next), text, (p) => withShopping(p, before));
  };

  const add = (entry: { ingredientId?: string; name: string }): boolean => {
    const r = addItem(pantry, entry, now, newId);
    if (r.error) {
      say(ADD_ERRORS[r.error]);
      return false;
    }
    changePantry(r.state, `Added ${entry.name}.`);
    return true;
  };
  const toggleStarter = (ingredientId: string, name: string, on: boolean) => {
    if (on) return void add({ ingredientId, name });
    changePantry({ ...pantry, items: pantry.items.filter((i) => i.ingredientId !== ingredientId) }, `Removed ${name}.`);
  };
  const remove = (item: PantryItem, neighbour: string | null) => {
    focusAfter.current = { id: neighbour };
    changePantry(removeItem(pantry, item.id).state, `Removed ${item.name}.`);
  };
  const edit = (id: string, change: ItemEdit) => {
    const r = updateItem(pantry, id, change, now);
    if (r.error) return r.error;
    const name = pantry.items.find((i) => i.id === id)?.name ?? '';
    changePantry(r.state, `Saved ${name}.`);
    return undefined;
  };
  const undo = () => {
    if (!message?.restore) return;
    onProfile(message.restore(profile));
    say('Put back.');
    listHeading.current?.focus();
  };

  const empty = pantry.items.length === 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-2">
      <div className="grid gap-3">
        <FocusHeading>My pantry</FocusHeading>
        <p className="text-base text-pretty text-muted">{INTRO}</p>
      </div>

      <PantryAdd ingredients={ingredients} starters={starters} isOn={(id) => pantry.items.some((i) => i.ingredientId === id)} onAdd={add} onToggleStarter={toggleStarter} />
      <p className="text-sm text-pretty text-muted">{SHARED_DEVICE}</p>

      <div role="status" aria-live="polite" className="empty:hidden">
        {message && (
          <div className="flex flex-wrap items-center gap-x-1">
            <p className="text-base font-semibold">{message.text}</p>
            {message.restore && <PillButton variant="text" onClick={undo}>Undo</PillButton>}
          </div>
        )}
      </div>

      <section aria-labelledby="pantry-list" className="grid gap-2">
        <h2 id="pantry-list" ref={listHeading} tabIndex={-1} className="font-display text-[24px] outline-none">Your pantry</h2>
        <div ref={list}>
          {empty ? (
            <p className="text-base text-pretty text-muted">{EMPTY_PANTRY}</p>
          ) : (
            <PantryList items={pantry.items} now={now} highRisk={highRisk} onRemove={remove} onEdit={edit} />
          )}
        </div>
        {!(empty && pantry.staples.length === 0) && (
          <div>
            <PillButton variant="text" className="-ml-3" onClick={() => changePantry(clearPantry(pantry).state, 'Your pantry is cleared.')}>Clear my pantry</PillButton>
          </div>
        )}
      </section>

      <section aria-labelledby="pantry-staples" className="grid gap-2">
        <h2 id="pantry-staples" className="font-display text-[24px]">{STAPLES_LABEL}</h2>
        <p className="text-sm text-pretty text-muted">{STAPLES_HINT}</p>
        <div role="group" aria-labelledby="pantry-staples" className="flex flex-wrap gap-2">
          {staples.map((id) => {
            const on = pantry.staples.includes(id);
            return (
              <PillButton key={id} variant={on ? 'primary' : 'surface'} aria-pressed={on} onClick={() => onProfile(withPantry(profile, setStaple(pantry, id, !on)))}>
                {nameOf(id)}
              </PillButton>
            );
          })}
        </div>
      </section>

      {shopping.length > 0 && (
        <PantryShopping
          list={shopping}
          totalCents={listTotalCents(shopping, prices)}
          onRemove={(e) => changeShopping(removeEntry(shopping, e.id).list, `Removed ${e.name} from the list.`)}
          onClear={() => changeShopping(clearList(shopping).list, 'Your list is cleared.')}
          onSwaps={() => onNavigate('swaps')}
          onBudget={() => onNavigate('budget')}
        />
      )}
    </div>
  );
}
