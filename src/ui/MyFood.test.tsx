import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CulturalMeal, FoodProfile } from '@culinerity/core';
import { MyFood } from './MyFood';

const H = [
  'Which food traditions fit you?',
  'Any food rules?',
  'Anything you need to avoid, like an allergy?',
  'Any occasions you would like a heads-up for?',
  'Here is what you chose',
];
const PRIVACY = 'Optional. Stays on this device. You can clear it any time.';
const SHARED = 'Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device.';
const FOOD: FoodProfile = { traditions: ['greek'], rules: ['halal'], allergies: ['Peanuts'], occasions: [], dismissed: [] };
const MEAL: CulturalMeal = { id: 'm1', at: '2026-10-27T01:00:00.000Z', tradition: 'greek' };

function setup(props: Partial<Parameters<typeof MyFood>[0]> = {}) {
  const fns = { onSave: vi.fn(), onClear: vi.fn(), onDone: vi.fn(), onSaveMeals: vi.fn() };
  const utils = render(<MyFood value={undefined} {...fns} {...props} />);
  return { ...fns, ...utils };
}
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const h1 = () => screen.getByRole('heading', { level: 1 });

describe('MyFood wizard', () => {
  it('walks five steps, each with exactly one focused h1 and the privacy sentence', () => {
    setup();
    H.forEach((name, i) => {
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(h1()).toHaveTextContent(name);
      expect(h1()).toHaveFocus();
      expect(screen.getByText(PRIVACY)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(i + 1));
      if (i < 4) next();
    });
  });

  it('pre-selects nothing on a fresh profile', () => {
    setup();
    screen.getAllByRole('button', { pressed: false }).forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'false'));
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    next();
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it('offers the eight rules with a plain meaning', () => {
    setup();
    next();
    expect(screen.getByText('No pork, no alcohol, meat from halal sources')).toBeInTheDocument();
    ['Halal', 'Kosher', 'Vegetarian', 'Vegan', 'No beef', 'No pork', 'No alcohol', 'Gluten-free'].forEach((n) =>
      expect(screen.getByRole('button', { name: new RegExp(`^${n}`) })).toHaveAttribute('aria-pressed', 'false'));
  });

  it('shows the allergy note exactly', () => {
    setup();
    next();
    next();
    expect(screen.getByText('Tell us what to avoid. This does not replace reading labels or medical advice.')).toBeInTheDocument();
  });

  it('Greek + Halal + Peanuts, then Save, calls onSave with the sanitised draft', () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
    next();
    fireEvent.click(screen.getByRole('button', { name: /^Halal/ }));
    next();
    fireEvent.change(screen.getByLabelText(/Allergies|avoid/i), { target: { value: 'Peanuts' } });
    fireEvent.keyDown(screen.getByLabelText(/Allergies|avoid/i), { key: 'Enter' });
    next();
    next();
    expect(h1()).toHaveTextContent(H[4]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ traditions: ['greek'], rules: ['halal'], allergies: ['Peanuts'], occasions: [], dismissed: [] });
  });

  it('Back keeps the draft', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('typing GREEK in Add your own selects the Greek pill instead of adding a tag', () => {
    setup();
    const input = screen.getByLabelText('Add your own');
    fireEvent.change(input, { target: { value: 'GREEK' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });

  it('keeps an own tradition as a tag and renders markup as text', () => {
    setup();
    const input = screen.getByLabelText('Add your own');
    fireEvent.change(input, { target: { value: '<b>x</b>' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
    expect(document.querySelector('main b, b')).toBeNull();
  });

  it('a 40-character own tradition cannot widen the page', () => {
    const { container } = setup();
    const input = screen.getByLabelText('Add your own');
    fireEvent.change(input, { target: { value: 'W'.repeat(40) } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const tag = screen.getByText('W'.repeat(40));
    expect(tag.className).toMatch(/break-words|\[overflow-wrap:anywhere\]/);
    expect(container.firstElementChild?.className).toMatch(/min-w-0|max-w-full/);
    expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth || container.scrollWidth);
  });

  it('Skip on every step saves nothing and finishes', () => {
    for (let i = 0; i < 5; i++) {
      const { onSave, onDone, unmount } = setup();
      for (let j = 0; j < i; j++) next();
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(onSave).not.toHaveBeenCalled();
      expect(onDone).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it('Escape does not lose the draft', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Greek' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Space and Enter on a focused pill toggle it (native button)', () => {
    setup();
    const pill = screen.getByRole('button', { name: 'Greek' });
    pill.focus();
    expect(pill).toHaveFocus();
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-pressed', 'false');
  });

  it('review has Change per section that jumps to the step and returns to the review', () => {
    setup({ startAtWizard: true, value: FOOD });
    for (let i = 0; i < 4; i++) next();
    fireEvent.click(screen.getByRole('button', { name: 'Change rules' }));
    expect(h1()).toHaveTextContent(H[1]);
    next();
    expect(h1()).toHaveTextContent(H[4]);
  });

  it('shows no state from a previous profile when remounted with a new key', () => {
    const fns = { onSave: vi.fn(), onClear: vi.fn(), onDone: vi.fn() };
    const { rerender } = render(<MyFood key="a" value={undefined} {...fns} />);
    fireEvent.click(screen.getByRole('button', { name: 'Greek' }));
    rerender(<MyFood key="b" value={undefined} {...fns} />);
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('MyFood summary', () => {
  it('opens on the summary when a profile exists, with Change per section and the shared-device sentence', () => {
    setup({ value: FOOD });
    expect(h1()).toHaveTextContent('My food');
    ['traditions', 'rules', 'allergies', 'occasions'].forEach((s) =>
      expect(screen.getByRole('button', { name: `Change ${s}` })).toBeInTheDocument());
    expect(screen.getByText('Greek')).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
    expect(screen.getByText(SHARED)).toBeInTheDocument();
    expect(screen.getByText('These stay with this profile on this device.')).toBeInTheDocument();
  });

  it('startAtWizard opens the wizard even when a profile exists', () => {
    setup({ value: FOOD, startAtWizard: true });
    expect(h1()).toHaveTextContent(H[0]);
    expect(screen.getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Change opens the wizard at that step', () => {
    setup({ value: FOOD });
    fireEvent.click(screen.getByRole('button', { name: 'Change allergies' }));
    expect(h1()).toHaveTextContent(H[2]);
  });

  it('Clear my food settings clears, announces, and Undo restores', () => {
    const { onClear, onSave } = setup({ value: FOOD });
    fireEvent.click(screen.getByRole('button', { name: 'Clear my food settings' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Cleared.');
    fireEvent.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(onSave).toHaveBeenCalledWith(FOOD);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('Clear my meals clears the meals and Undo restores them', () => {
    const { onSaveMeals } = setup({ value: FOOD, meals: [MEAL] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear my meals' }));
    expect(onSaveMeals).toHaveBeenLastCalledWith(undefined);
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(onSaveMeals).toHaveBeenLastCalledWith([MEAL]);
  });

  it('hides Clear my meals when there are none, and Done finishes', () => {
    const { onDone } = setup({ value: FOOD });
    expect(screen.queryByRole('button', { name: 'Clear my meals' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalled();
  });
});
