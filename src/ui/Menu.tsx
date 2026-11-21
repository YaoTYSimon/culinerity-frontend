import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { PillButton } from './PillButton';
import type { NavTarget, View } from './views';

interface Props {
  current: View;
  /** Controlled open state (the header keeps the Menu and the profile panel from being open together). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate: (to: NavTarget) => void;
}

const ITEMS: { to: NavTarget; label: string }[] = [
  { to: 'home', label: 'Home' },
  { to: 'swaps', label: 'Swaps' },
  { to: 'checkin', label: 'Check-in' },
  { to: 'budget', label: 'Budget' },
  { to: 'whatif', label: 'What if' },
  { to: 'support', label: 'Food support' },
  { to: 'nearby', label: 'Nearby' },
  { to: 'food', label: 'My food' },
  { to: 'meals', label: 'Meals that felt like home' },
  { to: 'pantry', label: 'My pantry' },
  { to: 'cook', label: 'Cook with what you have' },
  { to: 'foodsafety', label: 'Food safety' },
  { to: 'tradeoffs', label: 'Trade-offs' },
  { to: 'week', label: 'My week' },
  { to: 'welcome', label: 'Welcome' },
  { to: 'policy', label: 'Data and policy' },
];

/** A "Menu" button that opens a plain list of destinations. Escape closes it and focus returns to the button. */
export function Menu({ current, onNavigate, open: controlled, onOpenChange }: Props) {
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (open) firstItem.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };

  return (
    <div onKeyDown={onKeyDown}>
      <PillButton
        ref={button}
        variant="surface"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className="px-4"
      >
        Menu
      </PillButton>
      {open && (
        <nav id={listId} aria-label="Menu" className="absolute inset-x-0 top-full z-10 grid gap-1 bg-surface px-4 pb-4 pt-2">
          <ul className="grid gap-1">
            {ITEMS.map(({ to, label }, i) => (
              <li key={to}>
                <button
                  ref={i === 0 ? firstItem : undefined}
                  type="button"
                  aria-current={to === current || (to === 'home' && current === 'number') ? 'page' : undefined}
                  onClick={() => {
                    onNavigate(to);
                    close();
                  }}
                  className="focus-ring motion-colors flex min-h-11 w-full items-center rounded-full px-4 text-left text-lg font-semibold hover:bg-bg aria-[current=page]:bg-bg"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
