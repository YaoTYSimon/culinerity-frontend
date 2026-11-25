import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EQUIPMENT, type EquipmentId } from '@culinerity/core';
import { KitchenPicker } from './KitchenPicker';

function Harness({ initial = [], spy = () => {} }: { initial?: EquipmentId[]; spy?: (v: EquipmentId[]) => void }) {
  const [have, setHave] = useState<EquipmentId[]>(initial);
  return <KitchenPicker have={have} onChange={(v) => { setHave(v); spy(v); }} />;
}

describe('KitchenPicker', () => {
  it('is closed to start and names itself', () => {
    render(<Harness />);
    expect(screen.getByText('My kitchen').closest('details')).not.toHaveAttribute('open');
  });
  it('has one pressed-state toggle per kind of equipment, none pressed to start', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('My kitchen'));
    const group = screen.getByRole('group', { name: 'My kitchen equipment' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(EQUIPMENT.length);
    for (const b of buttons) expect(b).toHaveAttribute('aria-pressed', 'false');
  });
  it('toggles on and off with the keyboard, reporting the list in table order', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await user.click(screen.getByText('My kitchen'));
    const oven = screen.getByRole('button', { name: 'Oven' });
    const stove = screen.getByRole('button', { name: 'Stove' });
    oven.focus();
    await user.keyboard('{Enter}');
    expect(oven).toHaveAttribute('aria-pressed', 'true');
    await user.click(stove);
    expect(spy).toHaveBeenLastCalledWith(['stove', 'oven']);
    await user.keyboard(' ');
    expect(spy).toHaveBeenLastCalledWith(['oven']);
    expect(stove).toHaveAttribute('aria-pressed', 'false');
  });
  it('shows what is chosen when closed, as text for screen readers', () => {
    render(<Harness initial={['oven', 'blender']} />);
    expect(screen.getByText('Oven, Blender')).toHaveClass('sr-only');
  });
  it('gives every toggle a 44px touch target', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('My kitchen'));
    for (const b of screen.getByRole('group', { name: 'My kitchen equipment' }).querySelectorAll('button')) expect(b.className).toContain('min-h-11');
  });
});
