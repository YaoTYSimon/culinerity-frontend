import { useContext, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AuthContext } from '../auth/useAuth';
import { Avatar } from './Avatar';
import { PillButton } from './PillButton';
import { DeleteDialog, GuestAvatar, ProfileBlock } from './ProfileMenu';
import type { NavTarget, View } from './views';

interface Props {
  current: View;
  /** Controlled open state (optional; the Menu keeps its own otherwise). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate: (to: NavTarget) => void;
  /** Guests: open the create-a-profile screen (the shell shows it; one h1 stays on the page). */
  onCreateProfile?: () => void;
}

export const GROUPS: { heading: string; items: { to: NavTarget; label: string }[] }[] = [
  {
    heading: 'Today',
    items: [
      { to: 'home', label: 'Home' },
      { to: 'swaps', label: 'Swaps' },
      { to: 'checkin', label: 'Check-in' },
      { to: 'week', label: 'My week' },
    ],
  },
  {
    heading: 'Money',
    items: [
      { to: 'budget', label: 'Budget' },
      { to: 'whatif', label: 'What if' },
      { to: 'tradeoffs', label: 'Trade-offs' },
    ],
  },
  {
    heading: 'Food',
    items: [
      { to: 'cook', label: 'Cook with what you have' },
      { to: 'pantry', label: 'My pantry' },
      { to: 'food', label: 'My food' },
      { to: 'meals', label: 'Meals that felt like home' },
      { to: 'foodsafety', label: 'Food safety' },
    ],
  },
  {
    heading: 'Help',
    items: [
      { to: 'nearby', label: 'Nearby' },
      { to: 'support', label: 'Food support' },
    ],
  },
  {
    heading: 'About',
    items: [
      { to: 'welcome', label: 'Welcome' },
      { to: 'policy', label: 'Data and policy' },
    ],
  },
];

/**
 * The one header button (the avatar, or a guest glyph, plus "Menu") and its one panel: the profile block on
 * top, the destinations in compact groups below. It is a disclosure: focus moves into the panel on open,
 * Escape closes it and focus returns to the button. Outside an AuthProvider there is no profile block.
 */
export function Menu({ current, onNavigate, open: controlled, onOpenChange, onCreateProfile = () => {} }: Props) {
  const auth = useContext(AuthContext);
  const [own, setOwn] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  const button = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const homeItem = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (open) (firstItem.current ?? homeItem.current)?.focus();
  }, [open]);

  // Focus goes back to the button once the delete dialog has closed and the page is no longer inert.
  const wasDeleting = useRef(false);
  useEffect(() => {
    if (wasDeleting.current && !deleting) button.current?.focus();
    wasDeleting.current = deleting;
  }, [deleting]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close();
    }
  };
  const person = auth?.current;

  return (
    <div onKeyDown={onKeyDown}>
      <PillButton
        ref={button}
        variant="surface"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={auth ? 'gap-2 pl-1.5 pr-4' : 'px-4'}
      >
        {auth && (person ? <Avatar name={person.name} colour={person.colour} size={36} /> : <GuestAvatar />)}
        Menu
      </PillButton>
      {open && (
        <div id={panelId} className="absolute inset-x-0 top-full z-10 grid gap-2 bg-surface px-4 pb-4 pt-1">
          {auth && (
            <ProfileBlock
              auth={auth}
              firstItem={firstItem}
              onClose={() => setOpen(false)}
              onDelete={() => setDeleting(true)}
              onCreateProfile={onCreateProfile}
            />
          )}
          <nav aria-label="Menu" className="grid gap-2">
            {GROUPS.map(({ heading, items }) => (
              <div key={heading}>
                <p id={`${panelId}-${heading}`} className="px-4 pb-0.5 text-sm text-muted">
                  {heading}
                </p>
                <ul aria-labelledby={`${panelId}-${heading}`} className="grid grid-cols-2 items-start gap-x-1">
                  {items.map(({ to, label }) => (
                    <li key={to}>
                      <button
                        ref={to === 'home' ? homeItem : undefined}
                        type="button"
                        aria-current={to === current || (to === 'home' && current === 'number') ? 'page' : undefined}
                        onClick={() => {
                          onNavigate(to);
                          close();
                        }}
                        className="focus-ring motion-colors flex min-h-11 w-full items-center rounded-full px-4 text-left text-base font-semibold leading-tight hover:bg-bg aria-[current=page]:bg-bg"
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      )}
      {deleting && person && <DeleteDialog auth={auth!} account={person} onClose={() => setDeleting(false)} />}
    </div>
  );
}
