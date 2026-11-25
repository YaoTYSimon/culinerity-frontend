import { useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { AuthContext } from '../auth/useAuth';
import { Avatar } from './Avatar';
import { GROUP_ICONS } from './menuIcons';
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

export const GROUPS: { id: string; heading: string; items: { to: NavTarget; label: string }[] }[] = [
  {
    id: 'today',
    heading: 'Today',
    items: [
      { to: 'home', label: 'Home' },
      { to: 'swaps', label: 'Swaps' },
      { to: 'checkin', label: 'Check-in' },
      { to: 'week', label: 'My week' },
    ],
  },
  {
    id: 'money',
    heading: 'Money',
    items: [
      { to: 'budget', label: 'Budget' },
      { to: 'whatif', label: 'What if' },
      { to: 'tradeoffs', label: 'Trade-offs' },
    ],
  },
  {
    id: 'food',
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
    id: 'find',
    heading: 'Find food',
    items: [
      { to: 'nearby', label: 'Nearby' },
      { to: 'support', label: 'Food support' },
    ],
  },
  {
    id: 'about',
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
        <div id={panelId} className="absolute inset-x-0 top-full z-10 grid max-h-[calc(100dvh-7rem-var(--dock-h))] content-start gap-2 overflow-y-auto overscroll-contain bg-surface px-4 pb-4 pt-1">
          {auth && (
            <ProfileBlock
              auth={auth}
              firstItem={firstItem}
              onClose={() => setOpen(false)}
              onDelete={() => setDeleting(true)}
              onCreateProfile={onCreateProfile}
            />
          )}
          <MenuGroups
            current={current}
            panelId={panelId}
            homeItem={homeItem}
            onPick={(to) => {
              onNavigate(to);
              close();
            }}
          />
        </div>
      )}
      {deleting && person && <DeleteDialog auth={auth!} account={person} onClose={() => setDeleting(false)} />}
    </div>
  );
}

const groupOf = (current: View) => {
  const view = current === 'number' ? 'home' : current;
  return GROUPS.find((g) => g.items.some((i) => i.to === view))?.id;
};

/**
 * The destination groups. Each heading is a disclosure button (round chevron, `aria-expanded`,
 * `aria-controls`). Today and the group holding the current page start open. The open state lives here only,
 * so it is forgotten whenever the panel closes (this component unmounts with it); nothing is stored.
 */
function MenuGroups({
  current,
  panelId,
  homeItem,
  onPick,
}: {
  current: View;
  panelId: string;
  homeItem: RefObject<HTMLButtonElement | null>;
  onPick: (to: NavTarget) => void;
}) {
  const [opened, setOpened] = useState<Set<string>>(() => new Set(['today', groupOf(current) ?? 'today']));
  const toggle = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <nav aria-label="Menu" className="grid gap-1">
      {GROUPS.map(({ id, heading, items }) => {
        const isOpen = opened.has(id);
        const listId = `${panelId}-${id}-list`;
        const GroupIcon = GROUP_ICONS[id];
        return (
          <div key={id}>
            <button
              type="button"
              id={`${panelId}-${id}`}
              aria-expanded={isOpen}
              aria-controls={listId}
              onClick={() => toggle(id)}
              className="focus-ring motion-colors flex min-h-11 w-full items-center justify-between gap-2 rounded-full px-4 text-left text-sm font-semibold text-muted hover:bg-bg"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-bg">
                  <GroupIcon />
                </span>
                {heading}
              </span>
              <span aria-hidden className="grid size-6 place-items-center rounded-full bg-bg">
                <svg
                  viewBox="0 0 12 12"
                  className={`size-3 motion-safe:transition-transform motion-safe:duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 4.5 6 8l3.5-3.5" />
                </svg>
              </span>
            </button>
            <ul id={listId} hidden={!isOpen} aria-labelledby={`${panelId}-${id}`} className="grid grid-cols-2 items-start gap-x-1">
              {items.map(({ to, label }) => (
                <li key={to}>
                  <button
                    ref={to === 'home' ? homeItem : undefined}
                    type="button"
                    aria-current={to === current || (to === 'home' && current === 'number') ? 'page' : undefined}
                    onClick={() => onPick(to)}
                    className="focus-ring motion-colors flex min-h-11 w-full items-center rounded-full px-4 text-left text-base font-semibold leading-tight hover:bg-bg aria-[current=page]:bg-bg"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
