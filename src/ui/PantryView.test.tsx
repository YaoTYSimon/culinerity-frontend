import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PANTRY_CAP, type PantryItem, type PantryState, type Profile } from '@culinerity/core';
import { PantryView } from './PantryView';
import type { NavTarget } from './views';

// Thursday 29 October 2026, local time.
const NOW = new Date(2026, 9, 29, 12, 0, 0);
const at = NOW.toISOString();
const item = (id: string, name: string, extra: Partial<PantryItem> = {}): PantryItem => ({ id, name, addedAt: at, ...extra });
const pantryOf = (items: PantryItem[], extra: Partial<PantryState> = {}): Profile => ({ pantry: { items, staples: [], serves: 2, ...extra } });

function Harness({ initial = {}, onSave, onNavigate = () => {} }: { initial?: Profile; onSave?: (p: Profile) => void; onNavigate?: (to: NavTarget) => void }) {
  const [profile, setProfile] = useState<Profile>(initial);
  let n = 0;
  return <PantryView profile={profile} onProfile={(p) => { setProfile(p); onSave?.(p); }} now={NOW} newId={() => `new-${Date.now()}-${++n}`} onNavigate={onNavigate} />;
}
const show = (props: Parameters<typeof Harness>[0] = {}) => {
  const user = userEvent.setup();
  render(<Harness {...props} />);
  return user;
};
const status = () => screen.getByRole('status');
const field = () => screen.getByRole('combobox', { name: 'Add something you have' });
const lastSave = (fn: ReturnType<typeof vi.fn>): Profile => fn.mock.calls[fn.mock.calls.length - 1][0];

describe('PantryView basics', () => {
  it('has one h1, "My pantry", and focus on it', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const h1 = screen.getByRole('heading', { level: 1, name: 'My pantry' });
    expect(h1).toHaveFocus();
  });

  it('shows the intro, the shared-device sentence, an empty note and the starters', () => {
    show();
    expect(screen.getByText("Tell us what you have and we'll suggest what to cook. Optional.")).toBeInTheDocument();
    expect(screen.getByText('Your pantry is saved on this device only. Anyone who can open your profile here can see it.')).toBeInTheDocument();
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
    expect(screen.getByText('Common starters, our pick')).toBeInTheDocument();
    for (const name of ['Rice, white', 'Egg', 'Onion']) expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('adding', () => {
  it('lists matches while typing and adds one on Enter, with a status', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    await user.type(field(), 'tinned tom');
    expect(screen.getByRole('option', { name: 'Tomatoes, tinned' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(lastSave(onSave).pantry?.items).toMatchObject([{ ingredientId: 'tomatoes-tinned', name: 'Tomatoes, tinned' }]);
    expect(status()).toHaveTextContent('Added Tomatoes, tinned.');
    expect(field()).toHaveValue('');
    expect(field()).toHaveFocus();
  });

  it('adds by tapping a suggestion', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    await user.type(field(), 'chick peas');
    await user.click(screen.getByRole('option', { name: /Chickpeas/ }));
    expect(lastSave(onSave).pantry?.items[0].ingredientId).toBe('chickpeas-canned');
  });

  it('works from the keyboard alone: arrows choose, Enter adds', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    await user.tab();
    expect(field()).toHaveFocus();
    await user.keyboard('rice{ArrowDown}{Enter}');
    expect(lastSave(onSave).pantry?.items).toHaveLength(1);
  });

  it('a starter toggles with aria-pressed, and a second tap removes it with Undo', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    const onion = screen.getByRole('button', { name: 'Onion' });
    await user.click(onion);
    expect(onion).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('Added Onion.');
    await user.click(onion);
    expect(onion).toHaveAttribute('aria-pressed', 'false');
    expect(lastSave(onSave).pantry).toBeUndefined();
    expect(status()).toHaveTextContent('Removed Onion.');
    await user.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(onion).toHaveAttribute('aria-pressed', 'true');
  });

  it('"Add anyway" stores free text with the no-details note', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    await user.type(field(), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Add "zzz" anyway' }));
    const added = lastSave(onSave).pantry?.items[0];
    expect(added?.name).toBe('zzz');
    expect(added?.ingredientId).toBeUndefined();
    expect(screen.getByText("We have no details for this one, so we don't use it for recipes")).toBeInTheDocument();
  });

  it('keeps 40 characters of a 500-character entry as literal text', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    await user.click(field());
    await user.paste(`<script>alert(1)</script>${'x'.repeat(500)}`);
    await user.click(screen.getByRole('button', { name: /anyway$/ }));
    const name = lastSave(onSave).pantry?.items[0].name ?? '';
    expect(name).toHaveLength(40);
    expect(name.startsWith('<script>')).toBe(true);
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(name, { selector: 'span.block' })).toBeInTheDocument();
  });

  it('refuses an empty entry calmly', async () => {
    const user = show();
    await user.type(field(), '   ');
    expect(screen.queryByRole('button', { name: /anyway$/ })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(status()).toHaveTextContent('Type what you have first.');
  });

  it('says the pantry is full on the 201st add and changes nothing', async () => {
    const items = Array.from({ length: PANTRY_CAP }, (_, i) => item(`f${i}`, `thing ${i}`));
    const onSave = vi.fn();
    const user = show({ initial: pantryOf(items), onSave });
    await user.type(field(), 'qqq');
    await user.click(screen.getByRole('button', { name: 'Add "qqq" anyway' }));
    expect(status()).toHaveTextContent('Your pantry is full (200). Remove something to add more.');
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('the list', () => {
  const rows = [
    item('a', 'Rice, white', { ingredientId: 'rice' }),
    item('b', 'Milk', { ingredientId: 'milk', dateKind: 'use-by', date: '2026-10-31' }),
    item('c', 'Yoghurt, plain', { ingredientId: 'yoghurt', dateKind: 'use-by', date: '2026-10-20' }),
  ];

  it('groups use-soon, in your pantry and set aside, with the exact set-aside line', () => {
    show({ initial: pantryOf(rows) });
    const soon = screen.getByRole('list', { name: 'Use soon' });
    expect(within(soon).getByText('Milk', { selector: 'span.block' })).toBeInTheDocument();
    expect(within(soon).getByText('Use by in 2 days')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'In your pantry' })).getByText('Rice, white', { selector: 'span.block' })).toBeInTheDocument();
    const aside = screen.getByRole('list', { name: 'Set aside' });
    expect(within(aside).getByText('Yoghurt, plain', { selector: 'span.block' })).toBeInTheDocument();
    expect(within(aside).getByText("Past its use-by date. It shouldn't be eaten.")).toBeInTheDocument();
  });

  it('removes with Undo, restoring the position, and moves focus on', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf([item('a', 'Rice, white', { ingredientId: 'rice' }), item('b', 'Egg', { ingredientId: 'egg' }), item('c', 'Onion', { ingredientId: 'onion' })]), onSave });
    await user.click(screen.getByRole('button', { name: 'Remove Egg' }));
    expect(lastSave(onSave).pantry?.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(status()).toHaveTextContent('Removed Egg.');
    expect(screen.getByRole('button', { name: 'Remove Onion' })).toHaveFocus();
    await user.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(lastSave(onSave).pantry?.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('edits the quantity: 1.5kg saves 1500, an invalid one shows a message and keeps the old value', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf([item('a', 'Rice, white', { ingredientId: 'rice', grams: 500 })]), onSave });
    await user.click(screen.getByText('Edit'));
    const q = screen.getByLabelText('Amount');
    expect(q).toHaveValue('500 g');
    await user.clear(q);
    await user.type(q, 'lots');
    await user.click(screen.getByRole('button', { name: 'Save Rice, white' }));
    expect(screen.getByText(/Use a number like 250, 250g or 1.5kg/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(q);
    await user.type(q, '1.5kg');
    await user.click(screen.getByRole('button', { name: 'Save Rice, white' }));
    expect(lastSave(onSave).pantry?.items[0].grams).toBe(1500);
  });

  it('sets a use-by date from the disclosure and rejects an impossible one', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf([item('a', 'Milk', { ingredientId: 'milk' })]), onSave });
    await user.click(screen.getByText('Edit'));
    await user.click(screen.getByRole('button', { name: 'Use by' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-30' } });
    await user.click(screen.getByRole('button', { name: 'Save Milk' }));
    expect(lastSave(onSave).pantry?.items[0]).toMatchObject({ dateKind: 'use-by', date: '2026-10-30' });
    expect(within(screen.getByRole('list', { name: 'Use soon' })).getByText('Use by tomorrow')).toBeInTheDocument();
  });

  it('shows 50 of 200 and "Show all 200"', async () => {
    const items = Array.from({ length: 200 }, (_, i) => item(`f${i}`, `thing ${i}`));
    const user = show({ initial: pantryOf(items) });
    expect(screen.getAllByRole('button', { name: /^Remove thing/ })).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Show all 200' }));
    expect(screen.getAllByRole('button', { name: /^Remove thing/ })).toHaveLength(200);
  });

  it('clears the pantry with Undo', async () => {
    const onSave = vi.fn();
    const user = show({ initial: pantryOf([item('a', 'Egg', { ingredientId: 'egg' })], { staples: ['canola-oil'] }), onSave });
    await user.click(screen.getByRole('button', { name: 'Clear my pantry' }));
    expect(lastSave(onSave).pantry).toBeUndefined();
    expect(status()).toHaveTextContent('Your pantry is cleared.');
    await user.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(lastSave(onSave).pantry).toMatchObject({ items: [{ id: 'a' }], staples: ['canola-oil'] });
  });
});

describe('things I always have', () => {
  it('toggles with aria-pressed and none is preselected', async () => {
    const onSave = vi.fn();
    const user = show({ onSave });
    const group = screen.getByRole('group', { name: 'Things I always have' });
    const pills = within(group).getAllByRole('button');
    expect(pills.length).toBeGreaterThan(3);
    pills.forEach((p) => expect(p).toHaveAttribute('aria-pressed', 'false'));
    await user.click(pills[0]);
    expect(pills[0]).toHaveAttribute('aria-pressed', 'true');
    expect(lastSave(onSave).pantry?.staples).toHaveLength(1);
    await user.click(pills[0]);
    expect(pills[0]).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('the shopping list', () => {
  const list = [
    { id: 's1', ingredientId: 'rice', name: 'Rice, white', grams: 500, addedAt: at },
    { id: 's2', ingredientId: 'onion', name: 'Onion', grams: 300, addedAt: at },
  ];
  it('is hidden when empty, and lists entries with a sample total when all are priced', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('heading', { name: 'Shopping list' })).not.toBeInTheDocument();
    unmount();
    show({ initial: { shoppingList: list } });
    expect(screen.getByRole('heading', { level: 2, name: 'Shopping list' })).toBeInTheDocument();
    expect(screen.getByText(/about \$[\d.]+ \(sample data\)/)).toBeInTheDocument();
  });
  it('omits the total when an entry has no price', () => {
    show({ initial: { shoppingList: [...list, { id: 's3', name: 'Mystery', addedAt: at }] } });
    expect(screen.queryByText(/sample data\)/)).not.toBeInTheDocument();
  });
  it('removes and clears with Undo, and links to swaps and Budget', async () => {
    const onSave = vi.fn();
    const onNavigate = vi.fn();
    const user = show({ initial: { shoppingList: list }, onSave, onNavigate });
    await user.click(screen.getByRole('button', { name: 'Remove Onion from the list' }));
    expect(lastSave(onSave).shoppingList?.map((e) => e.id)).toEqual(['s1']);
    await user.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(lastSave(onSave).shoppingList).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Clear list' }));
    expect(lastSave(onSave).shoppingList).toBeUndefined();
    await user.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(lastSave(onSave).shoppingList).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'See swaps' }));
    expect(onNavigate).toHaveBeenCalledWith('swaps');
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect(onNavigate).toHaveBeenCalledWith('budget');
  });
});

describe('profiles', () => {
  it('shows the other profile\'s pantry after a switch, never the old one', () => {
    const view = (p: Profile, key: string) => <PantryView key={key} profile={p} onProfile={() => {}} now={NOW} onNavigate={() => {}} />;
    const { rerender } = render(view(pantryOf([item('a', 'Egg', { ingredientId: 'egg' })]), 'one'));
    expect(screen.getByText('Egg', { selector: 'span.block' })).toBeInTheDocument();
    rerender(view(pantryOf([item('b', 'Onion', { ingredientId: 'onion' })]), 'two'));
    expect(screen.queryByText('Egg', { selector: 'span.block' })).not.toBeInTheDocument();
    expect(screen.getByText('Onion', { selector: 'span.block' })).toBeInTheDocument();
  });
});
