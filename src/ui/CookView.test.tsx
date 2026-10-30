import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FoodProfile, PantryItem, PantryState, Profile } from '@culinerity/core';
import { CookView } from './CookView';
import type { NavTarget } from './views';

// Thursday 29 October 2026, local time.
const NOW = new Date(2026, 9, 29, 12, 0, 0);
const at = NOW.toISOString();
const it_ = (ingredientId: string, name: string, extra: Partial<PantryItem> = {}): PantryItem => ({ id: `p-${ingredientId}`, ingredientId, name, addedAt: at, ...extra });
const stew = [it_('chickpeas-canned', 'Chickpeas, canned'), it_('onion', 'Onion'), it_('garlic', 'Garlic'), it_('cumin', 'Cumin'), it_('canola-oil', 'Canola oil')];
const dal = [it_('lentil-green', 'Green lentils, dried'), it_('spinach', 'Spinach', { dateKind: 'use-by', date: '2026-10-31' }), it_('onion', 'Onion'), it_('garlic', 'Garlic'), it_('cumin', 'Cumin'), it_('turmeric', 'Turmeric'), it_('canola-oil', 'Canola oil')];
const pantryOf = (items: PantryItem[], extra: Partial<PantryState> = {}): Profile => ({ pantry: { items, staples: [], serves: 2, ...extra } });
const FOOD: FoodProfile = { traditions: [], rules: [], allergies: [], occasions: [], dismissed: [] };

function Harness({ initial = {}, onSave, onNavigate = () => {} }: { initial?: Profile; onSave?: (p: Profile) => void; onNavigate?: (to: NavTarget) => void }) {
  const [profile, setProfile] = useState<Profile>(initial);
  return <CookView profile={profile} onProfile={(p) => { setProfile(p); onSave?.(p); }} now={NOW} onNavigate={onNavigate} />;
}
const show = (props: Parameters<typeof Harness>[0] = {}) => {
  const user = userEvent.setup();
  render(<Harness {...props} />);
  return user;
};
const section = (name: string) => screen.getByRole('region', { name });

describe('CookView basics', () => {
  it('has one h1, "Cook with what you have", and focus on it', () => {
    show({ initial: pantryOf(stew) });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Cook with what you have' })).toHaveFocus();
  });

  it('groups recipes into the three sections', () => {
    show({ initial: pantryOf(dal) });
    expect(within(section('You can cook this now')).getByRole('button', { name: 'Spinach dal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Need one more thing' })).toBeInTheDocument();
  });

  it('shows a one-missing row with its sample price', () => {
    show({ initial: pantryOf(stew) });
    const one = section('Need one more thing');
    expect(within(one).getByRole('button', { name: 'Chickpea and tomato stew' })).toBeInTheDocument();
    expect(within(one).getByText('Need one more thing: Tomatoes, tinned (about $0.50, sample price)')).toBeInTheDocument();
    expect(within(one).getAllByText('About 20 min (estimate) · serves 2').length).toBeGreaterThan(0);
  });

  it('shows a few-missing row naming each missing thing', () => {
    show({ initial: pantryOf([it_('chickpeas-canned', 'Chickpeas, canned'), it_('onion', 'Onion'), it_('garlic', 'Garlic'), it_('cumin', 'Cumin')]) });
    const few = section('Need a few more things');
    expect(within(few).getByText('Need a few more things: Tomatoes, tinned; Canola oil (about $0.50, sample price)')).toBeInTheDocument();
  });

  it('says what a recipe uses soon, and what it swapped', () => {
    show({ initial: pantryOf(dal) });
    expect(screen.getAllByText('Uses your spinach (use by Sat 31 Oct)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Using green lentils instead of red').length).toBeGreaterThan(0);
  });

  it('names an item by its first words when its name has a comma', () => {
    show({ initial: pantryOf(dal.map((i) => (i.ingredientId === 'spinach' ? { ...i, name: 'Spinach, baby' } : i))) });
    expect(screen.getAllByText('Uses your spinach (use by Sat 31 Oct)').length).toBeGreaterThan(0);
    expect(screen.queryByText(/spinach, baby \(/)).toBeNull();
  });

  it('rescales with the serves stepper and keeps the choice in the profile', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf(stew), onSave });
    await user.click(screen.getByRole('button', { name: 'More serves' }));
    expect(onSave.mock.calls.at(-1)?.[0].pantry.serves).toBe(3);
    expect(screen.getByText('Serves 3')).toBeInTheDocument();
    for (let i = 0; i < 10; i++) await user.click(screen.getByRole('button', { name: 'More serves' }));
    expect(screen.getByText('Serves 8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More serves' })).toBeDisabled();
  });
});

describe('the open recipe page', () => {
  it('stays open when more serves push it over the missing limit', async () => {
    const exact = [it_('chickpeas-canned', 'Chickpeas, canned', { grams: 240 }), it_('tomatoes-tinned', 'Tomatoes, tinned', { grams: 200 }), it_('onion', 'Onion', { grams: 80 }), it_('garlic', 'Garlic', { grams: 5 }), it_('cumin', 'Cumin'), it_('canola-oil', 'Canola oil')];
    const user = show({ initial: pantryOf(exact) });
    await user.click(screen.getByRole('button', { name: 'Chickpea and tomato stew' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Chickpea and tomato stew' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More serves' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Chickpea and tomato stew' })).toBeInTheDocument();
    expect(screen.getByText('Serves 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to recipes' })).toBeInTheDocument();
  });
});

describe('food rules', () => {
  it('shows the guide line only when food settings exist, with the swaps wording', () => {
    const { unmount } = render(<Harness initial={pantryOf(stew)} />);
    expect(screen.queryByText(/Showing recipes that avoid/)).not.toBeInTheDocument();
    unmount();
    show({ initial: { ...pantryOf(stew), foodProfile: { ...FOOD, rules: ['vegan'] } } });
    expect(screen.getByText('Showing recipes that avoid what you told us to avoid. This is a guide, not a certification. Check labels.')).toBeInTheDocument();
  });

  it('counts the recipes hidden by the rules, and hides them', () => {
    show({ initial: { ...pantryOf([it_('egg', 'Egg'), it_('onion', 'Onion'), it_('tomato', 'Tomato'), it_('canola-oil', 'Canola oil')]), foodProfile: { ...FOOD, rules: ['vegan'] } } });
    expect(screen.getByText(/\d+ recipes? (are|is) hidden because of what you told us to avoid\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomato and pepper eggs' })).not.toBeInTheDocument();
  });

  it('marks a recipe whose ingredients we cannot fully check', () => {
    show({ initial: { ...pantryOf(stew), foodProfile: { ...FOOD, allergies: ['Zzquince'] } } });
    // Allergy words we cannot match to a known allergen are not guessed: the recipe stays and says to check.
    expect(screen.getAllByText('Check the ingredients').length).toBeGreaterThan(0);
  });
});

describe('nothing to show is never blank', () => {
  it('no pantry: a calm sentence and a link to My pantry', async () => {
    const onNavigate = vi.fn();
    const user = show({ onNavigate });
    expect(screen.getByText('Your pantry is empty. Add a few things and we will suggest what to cook.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to My pantry' }));
    expect(onNavigate).toHaveBeenCalledWith('pantry');
  });

  it('only free-text items: says none can be used yet and offers the ingredient search', async () => {
    const onNavigate = vi.fn();
    const user = show({ initial: pantryOf([{ id: 'f1', name: 'Grandma jam', addedAt: at }]), onNavigate });
    expect(screen.getByText('None of what you added can be used for recipes yet. We only use items we have details for.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search the ingredient list' }));
    expect(onNavigate).toHaveBeenCalledWith('pantry');
  });

  it('everything filtered by the rules: a calm sentence and a link to My food', async () => {
    const onNavigate = vi.fn();
    // Nothing but wombok: the only close recipes contain egg, milk, cheese or bread-and-cheese, so vegan hides them all.
    const user = show({ initial: { ...pantryOf([it_('wombok', 'Wombok')]), foodProfile: { ...FOOD, rules: ['vegan'] } }, onNavigate });
    expect(screen.getByText('Every recipe near what you have is hidden because of what you told us to avoid.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change my food settings' }));
    expect(onNavigate).toHaveBeenCalledWith('food');
  });

  it('nothing you can cook now: says so, and suggests what would help', () => {
    show({ initial: pantryOf(stew) });
    expect(screen.getByText(/Nothing you can cook right now\. Adding one or two more things would help: Tomatoes, tinned/)).toBeInTheDocument();
  });

  it('nothing you can cook and nothing single to add: a calm sentence and a link', async () => {
    const onNavigate = vi.fn();
    const user = show({ initial: pantryOf([it_('wombok', 'Wombok')]), onNavigate });
    expect(screen.getByText('Nothing you can cook right now. Add a few more things to My pantry and we will look again.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to My pantry' }));
    expect(onNavigate).toHaveBeenCalledWith('pantry');
  });
});

describe('opening a recipe', () => {
  it('opens the page, then Back restores focus to the row', async () => {
    const user = show({ initial: pantryOf(stew) });
    await user.click(screen.getByRole('button', { name: 'Chickpea and tomato stew' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Chickpea and tomato stew' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Back to recipes' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Cook with what you have' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chickpea and tomato stew' })).toHaveFocus();
  });

  it('adds only the missing items to the shopping list, with Undo, and skips duplicates', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf(stew), onSave });
    await user.click(screen.getByRole('button', { name: 'Chickpea and tomato stew' }));
    await user.click(screen.getByRole('button', { name: 'Add missing to my shopping list' }));
    const list = onSave.mock.calls.at(-1)?.[0].shoppingList;
    expect(list).toMatchObject([{ ingredientId: 'tomatoes-tinned', recipeId: 'chickpea-tomato-stew', grams: 200 }]);
    expect(screen.getByRole('status')).toHaveTextContent('Added 1 thing to your shopping list.');
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(onSave.mock.calls.at(-1)?.[0].shoppingList).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Add missing to my shopping list' }));
    await user.click(screen.getByRole('button', { name: 'Add missing to my shopping list' }));
    expect(onSave.mock.calls.at(-1)?.[0].shoppingList).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Already on your list.');
  });
});
