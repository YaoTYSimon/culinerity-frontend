import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareText, weekSummary, type CulturalMeal } from '@culinerity/core';
import { MealsView } from './MealsView';
import { WeekCard } from './WeekCard';

// Wednesday 28 October 2026, local time. The week began Monday 26th; last week began Monday 19th.
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const meal = (id: string, day: number, tradition = 'greek', extra: Partial<CulturalMeal> = {}): CulturalMeal => ({
  id, tradition, at: new Date(2026, 9, day, 18, 0, 0).toISOString(), ...extra,
});

function Harness({ initial, traditions = ['greek', 'vietnamese'], onSave, onSetUpFood = () => {} }: {
  initial?: CulturalMeal[]; traditions?: string[]; onSave?: (m: CulturalMeal[]) => void; onSetUpFood?: () => void;
}) {
  const [meals, setMeals] = useState(initial);
  let n = 0;
  return (
    <MealsView
      meals={meals} traditions={traditions} now={NOW} newId={() => `new-${++n}`}
      onChange={(m) => { setMeals(m); onSave?.(m); }} onSetUpFood={onSetUpFood}
    />
  );
}
const show = (props: Parameters<typeof Harness>[0] = {}) => render(<Harness {...props} />);
const openAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add a meal' }));
const status = () => screen.getByRole('status');

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());

describe('MealsView', () => {
  it('has exactly one h1, "Meals that felt like home"', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Meals that felt like home' })).toBeInTheDocument();
  });

  it('saves a meal dated now with the tradition id in two interactions', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual([{ id: 'new-1', tradition: 'greek', at: NOW.toISOString() }]);
  });

  it('offers the traditions plus Other, and a Today day control', () => {
    show();
    openAdd();
    for (const name of ['Greek', 'Vietnamese', 'Other']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change day' })).toBeInTheDocument();
  });

  it('with no traditions shows Other and a "Set up My food" button', () => {
    const onSetUpFood = vi.fn();
    show({ traditions: [], onSetUpFood });
    openAdd();
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up My food' }));
    expect(onSetUpFood).toHaveBeenCalledTimes(1);
  });

  it("shows the person's own tradition text as given and stores it", () => {
    const onSave = vi.fn();
    show({ traditions: ["My nan's cooking"], onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: "My nan's cooking" }));
    expect(onSave.mock.calls[0][0][0].tradition).toBe("My nan's cooking");
  });

  it('announces "Added: Greek, today." with Add details and Undo', () => {
    show();
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(status()).toHaveTextContent('Added: Greek, today.');
    expect(within(status()).getByRole('button', { name: 'Add details' })).toBeInTheDocument();
    expect(within(status()).getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('Undo after adding removes the meal', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(onSave).toHaveBeenLastCalledWith([]);
    expect(screen.getByText('Nothing here yet this week. Add a meal when you like.')).toBeInTheDocument();
  });

  it('Add details saves a dish and who with onto the same meal', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    fireEvent.click(within(status()).getByRole('button', { name: 'Add details' }));
    const dish = screen.getByLabelText('Dish (optional)');
    expect(dish).toHaveAttribute('maxLength', '40');
    fireEvent.change(dish, { target: { value: 'Moussaka' } });
    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(onSave).toHaveBeenLastCalledWith([{ id: 'new-1', tradition: 'greek', at: NOW.toISOString(), dish: 'Moussaka', with: 'family' }]);
    expect(screen.getByText('Moussaka')).toBeInTheDocument();
    expect(screen.getByText(/with family/)).toBeInTheDocument();
  });

  it('keeps the status line while details are open, and drops it later otherwise', () => {
    show();
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    fireEvent.click(within(status()).getByRole('button', { name: 'Add details' }));
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.getByLabelText('Dish (optional)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    act(() => { vi.advanceTimersByTime(20000); });
    expect(status()).toBeEmptyDOMElement();
  });

  it('Remove shows "Removed. Undo" and Undo restores the meal with the same id', () => {
    const onSave = vi.fn();
    show({ initial: [meal('a', 27)], onSave });
    fireEvent.click(screen.getByRole('button', { name: /^Remove Greek/ }));
    expect(onSave).toHaveBeenLastCalledWith([]);
    expect(status()).toHaveTextContent('Removed.');
    fireEvent.click(within(status()).getByRole('button', { name: 'Undo' }));
    expect(onSave.mock.calls.at(-1)?.[0]).toEqual([meal('a', 27)]);
  });

  it('the Removed line goes away after a while', () => {
    show({ initial: [meal('a', 27)] });
    fireEvent.click(screen.getByRole('button', { name: /^Remove Greek/ }));
    act(() => { vi.advanceTimersByTime(7000); });
    expect(status()).toBeEmptyDOMElement();
  });

  it('Change day cannot choose tomorrow or a day before last Monday', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Change day' }));
    const day = screen.getByLabelText('Day');
    expect(day).toHaveAttribute('max', '2026-10-28');
    expect(day).toHaveAttribute('min', '2026-10-19');
    fireEvent.change(day, { target: { value: '2026-10-29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Pick a day from Mon, 19 Oct to today\./)).toBeInTheDocument();
    fireEvent.change(day, { target: { value: '2026-10-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('a meal logged for an earlier day is dated that day and says so', () => {
    const onSave = vi.fn();
    show({ onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Change day' }));
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-10-26' } });
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(onSave.mock.calls[0][0][0].at).toBe(new Date(2026, 9, 26, 12, 0, 0).toISOString());
    expect(status()).toHaveTextContent('Added: Greek, Mon, 26 Oct.');
  });

  it('marks Monday, Wednesday and Saturday on the ring for meals on those days', () => {
    // Saturday 24th is last week, so use this week: Mon 26 and Wed 28 only, then check the label wording.
    show({ initial: [meal('a', 26), meal('b', 28)] });
    expect(screen.getByRole('img', { name: 'Monday to Sunday: meals on Monday and Wednesday' })).toBeInTheDocument();
  });

  it('empty state has no digit and no number 0', () => {
    show();
    const copy = screen.getByText('Nothing here yet this week. Add a meal when you like.');
    expect(copy.textContent).not.toMatch(/\d/);
    expect(screen.queryByText(/meals? that felt like home this week/)).toBeNull();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Monday to Sunday: no meals yet');
  });

  it('says "1 meal" and "4 meals" in the sentence', () => {
    const { unmount } = show({ initial: [meal('a', 27)] });
    expect(screen.getByText('1 meal that felt like home this week')).toBeInTheDocument();
    unmount();
    show({ initial: [meal('a', 26), meal('b', 27), meal('c', 27, 'vietnamese'), meal('d', 28)] });
    expect(screen.getByText('4 meals that felt like home this week')).toBeInTheDocument();
  });

  it('shows a meal from last week only under "Last week"', () => {
    show({ initial: [meal('a', 21, 'vietnamese', { dish: 'Pho' })] });
    const main = screen.getByText('Last week').closest('details') as HTMLElement;
    expect(main).not.toHaveAttribute('open');
    expect(within(main).getByText('Pho')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet this week. Add a meal when you like.')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Monday to Sunday: no meals yet');
  });

  it('a 201st meal drops the oldest', () => {
    const many: CulturalMeal[] = Array.from({ length: 200 }, (_, i) => ({
      id: `m${i}`, tradition: 'greek', at: new Date(2026, 9, 20, 0, 0, i).toISOString(),
    }));
    const onSave = vi.fn();
    show({ initial: many, onSave });
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    const saved = onSave.mock.calls[0][0] as CulturalMeal[];
    expect(saved).toHaveLength(200);
    expect(saved.some((m) => m.id === 'm0')).toBe(false);
    expect(saved.some((m) => m.id === 'new-1')).toBe(true);
  });

  it('uses no streak, target, total, badge or comparison wording', () => {
    const { container } = show({ initial: [meal('a', 26), meal('b', 21)] });
    expect(container.textContent).not.toMatch(/streak|goal|target|total|badge|best|record|more than|fewer|in a row|keep it up|missed/i);
  });

  it('can be finished with the keyboard alone: add, details, remove, undo', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onSave = vi.fn();
    show({ onSave });
    screen.getByRole('button', { name: 'Add a meal' }).focus();
    await user.keyboard('{Enter}');
    await user.tab(); // from the pills' first button: focus moves into the pills
    const pill = screen.getByRole('button', { name: 'Greek' });
    pill.focus();
    await user.keyboard('{Enter}');
    const details = within(status()).getByRole('button', { name: 'Add details' });
    expect(details).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Dish (optional)')).toHaveFocus();
    await user.keyboard('Salad');
    await user.tab();
    await user.keyboard('{Enter}'); // first "with" pill
    screen.getByRole('button', { name: 'Save details' }).focus();
    await user.keyboard('{Enter}');
    expect(onSave.mock.calls.at(-1)?.[0][0].dish).toBe('Salad');
    screen.getByRole('button', { name: /^Remove Salad/ }).focus();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenLastCalledWith([]);
    within(status()).getByRole('button', { name: 'Undo' }).focus();
    await user.keyboard('{Enter}');
    expect(onSave.mock.calls.at(-1)?.[0]).toHaveLength(1);
  });
});

describe('meals never reach the share card', () => {
  const MEALS = [meal('a', 27, 'greek', { dish: 'Moussaka', with: 'family' })];

  it('WeekCard and shareText carry no meal text', () => {
    const week = [{ itemId: 'x', name: 'Soup', saving: 4, at: NOW.toISOString() }];
    const { container } = render(
      <WeekCard week={week} now={NOW.toISOString()} onRemoveOne={() => {}} onClear={() => {}} onSeeSwaps={() => {}} onOpenMeals={() => {}} />,
    );
    const everything = `${container.textContent} ${shareText(weekSummary(week, NOW.toISOString()))}`;
    for (const word of ['Moussaka', 'Greek', 'greek', 'family']) expect(everything).not.toContain(word);
    expect(MEALS).toHaveLength(1);
  });

  it('WeekCard has a text button that opens the meals view', () => {
    const onOpenMeals = vi.fn();
    render(<WeekCard week={[]} now={NOW.toISOString()} onRemoveOne={() => {}} onClear={() => {}} onSeeSwaps={() => {}} onOpenMeals={onOpenMeals} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meals that felt like home' }));
    expect(onOpenMeals).toHaveBeenCalledTimes(1);
  });
});
