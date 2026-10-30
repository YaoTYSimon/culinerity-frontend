import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { matchRecipes, pantryIngredients, recipeById, recipesData, safetyLines, type PantryItem, type PantryState, type Recipe, type RecipeMatch } from '@culinerity/core';
import { RecipePage } from './RecipePage';

const NOW = new Date(2026, 9, 29, 12, 0, 0);
const at = NOW.toISOString();
const item = (ingredientId: string, grams?: number): PantryItem => ({ id: `p-${ingredientId}`, ingredientId, name: ingredientId, addedAt: at, ...(grams ? { grams } : {}) });
const prices = new Map(recipesData.prices.map((p) => [p.ingredient, p.perKg]));
const highRisk = new Set(pantryIngredients().filter((i) => i.highRisk).map((i) => i.id));

function matchFor(recipe: Recipe, items: PantryItem[], serves = 2): RecipeMatch {
  const pantry: PantryState = { items, staples: [], serves };
  const { matches } = matchRecipes({ recipes: [recipe], pantry, now: NOW, prices, substitutions: recipesData.substitutions, highRisk });
  return matches[0];
}
const all = (r: Recipe) => r.ingredients.filter((i) => !i.optional).map((i) => item(i.ingredient));
function show(recipe: Recipe, items: PantryItem[], o: { serves?: number; onBack?: () => void; onAddMissing?: () => void } = {}) {
  const serves = o.serves ?? 2;
  const user = userEvent.setup();
  render(<RecipePage recipe={recipe} match={matchFor(recipe, items, serves)} serves={serves} onBack={o.onBack ?? (() => {})} onAddMissing={o.onAddMissing ?? (() => {})} />);
  return user;
}
const stew = () => recipeById('chickpea-tomato-stew') as Recipe;
const chicken = () => recipeById('simple-chicken-curry') as Recipe;

describe('RecipePage content', () => {
  it('has one h1 with the name (focused), the blurb, time and serves', () => {
    const r = stew();
    show(r, all(r));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: r.name })).toHaveFocus();
    expect(screen.getByText(r.blurb)).toBeInTheDocument();
    expect(screen.getByText('About 20 min (estimate) · serves 2')).toBeInTheDocument();
  });

  it('labels each ingredient: in your pantry, swap, missing with a price, optional', () => {
    const dal = recipeById('palak-dal') as Recipe;
    show(dal, [item('lentil-green'), item('spinach'), item('onion'), item('garlic'), item('cumin'), item('turmeric')]);
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(within(list).getByText(/Red lentils, dried/).closest('li')).toHaveTextContent('swap: Green lentils, dried');
    expect(within(list).getByText(/Spinach/).closest('li')).toHaveTextContent('in your pantry');
    expect(within(list).getByText(/Canola oil/).closest('li')).toHaveTextContent('missing, about $0.03 (sample price)');
  });

  it('marks an optional ingredient', () => {
    const r = recipeById('beans-on-toast') as Recipe;
    show(r, [item('baked-beans'), item('bread-white')]);
    expect(within(screen.getByRole('list', { name: 'Ingredients' })).getByText(/Cheddar/).closest('li')).toHaveTextContent('optional');
  });

  it('rescales grams to the chosen serves', () => {
    const r = stew();
    show(r, all(r), { serves: 4 });
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(within(list).getByText(/Chickpeas/).closest('li')).toHaveTextContent('480 g');
    expect(screen.getByText('About 20 min (estimate) · serves 4')).toBeInTheDocument();
  });

  it('shows the steps exactly as the dataset has them, numbered', () => {
    const r = chicken();
    show(r, all(r));
    const steps = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(r.steps);
    expect(screen.getByRole('list', { name: 'Steps' }).tagName).toBe('OL');
  });

  it('shows energy, protein, fibre and sugars per serve, no sodium, and the salt note', () => {
    const r = stew();
    show(r, all(r));
    const n = r.nutrition.perServe;
    const block = screen.getByRole('group', { name: 'Per serve' });
    expect(block).toHaveTextContent(`Energy${Math.round(n.energyKj).toLocaleString('en-AU')} kJ`);
    expect(block).toHaveTextContent('Protein');
    expect(block).toHaveTextContent('Fibre');
    expect(block).toHaveTextContent('Sugars');
    expect(block.textContent).not.toMatch(/sodium/i);
    expect(screen.getByText("Salt isn't counted.")).toBeInTheDocument();
  });

  it('shows the sample cost per serve and the nutrition credit', () => {
    const r = stew();
    show(r, all(r));
    expect(screen.getByText(/^About \$\d+\.\d\d a serve \(sample data\)$/)).toBeInTheDocument();
    expect(screen.getByText(/Nutrition data:/)).toBeInTheDocument();
  });

  it('never prints a figure of its own: no calorie, no sodium, no cooking temperature that is not in the data', () => {
    const r = chicken();
    const { container } = render(<RecipePage recipe={r} match={matchFor(r, all(r))} serves={2} onBack={() => {}} onAddMissing={() => {}} />);
    const allowed = [...r.steps, ...safetyLines(r), ...recipesData.sources.map((s) => s.title)].join(' ');
    const temps = (container.textContent ?? '').match(/\d+\s*(°|degrees|C\b)/g) ?? [];
    for (const t of temps) expect(allowed).toContain(t);
  });
});

describe('food safety lines', () => {
  it('shows the recipe steps with the thermometer wording and the cook-through lines for chicken', () => {
    const r = chicken();
    show(r, all(r));
    for (const line of safetyLines(r)) expect(screen.getByText(line)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Steps' })).getByText(/thermometer/i)).toBeInTheDocument();
  });

  it('shows the NSW notice and the NSW-not-Victoria wording whenever safety lines show', () => {
    const r = chicken();
    show(r, all(r));
    expect(screen.getByText(/General guidance from NSW Food Authority \(a NSW agency, not Victoria's\)\./)).toBeInTheDocument();
    expect(screen.getByText(/\(c\) State of New South Wales through the NSW Food Authority/)).toBeInTheDocument();
  });

  it('shows no safety block or NSW notice on a recipe with no safety tags', () => {
    const r = recipeById('cheese-tomato-toastie') as Recipe;
    show(r, all(r));
    expect(screen.queryByText(/NSW/)).not.toBeInTheDocument();
  });

  it('leaves out any pregnancy or immune-system line until the NSW PDF has been read (spec: open item)', () => {
    const r = chicken();
    show(r, all(r));
    expect(screen.queryByText(/pregnan|immune/i)).not.toBeInTheDocument();
  });

  it('shows the look-and-smell line for a past best-before item it uses', () => {
    const r = stew();
    const items = all(r).map((i) => (i.ingredientId === 'onion' ? { ...i, name: 'Onion', dateKind: 'best-before' as const, date: '2026-10-20' } : i));
    const match = matchFor(r, items);
    render(<RecipePage recipe={r} match={match} serves={2} notes={['Onion: past its best-before. Check it looks and smells right.']} onBack={() => {}} onAddMissing={() => {}} />);
    expect(screen.getByText('Onion: past its best-before. Check it looks and smells right.')).toBeInTheDocument();
  });
});

describe('RecipePage actions', () => {
  it('Back calls onBack', async () => {
    const onBack = vi.fn();
    const r = stew();
    const user = show(r, all(r), { onBack });
    await user.click(screen.getByRole('button', { name: 'Back to recipes' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('offers Add missing only when something is missing, and calls it', async () => {
    const onAddMissing = vi.fn();
    const r = stew();
    const user = show(r, all(r).filter((i) => i.ingredientId !== 'tomatoes-tinned'), { onAddMissing });
    await user.click(screen.getByRole('button', { name: 'Add missing to my shopping list' }));
    expect(onAddMissing).toHaveBeenCalled();
  });

  it('hides Add missing when nothing is missing, and never offers Log as a meal', () => {
    const r = stew();
    show(r, all(r));
    expect(screen.queryByRole('button', { name: 'Add missing to my shopping list' })).not.toBeInTheDocument();
    expect(screen.queryByText(/log as a meal/i)).not.toBeInTheDocument();
  });
});
