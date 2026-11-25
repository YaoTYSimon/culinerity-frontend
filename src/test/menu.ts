import { fireEvent, screen, within } from '@testing-library/react';

/** Click a Menu destination by name, opening its (collapsed) group first. The Menu panel must be open. */
export function pickMenuItem(name: string) {
  const nav = screen.getByRole('navigation', { name: 'Menu' });
  const item = within(nav).getByRole('button', { name, hidden: true });
  const list = item.closest('ul');
  if (list?.hidden) fireEvent.click(document.getElementById(list.getAttribute('aria-labelledby')!)!);
  fireEvent.click(item);
}
