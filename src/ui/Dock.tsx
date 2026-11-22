import type { ReactNode } from 'react';
import { BudgetIcon, CookIcon, HomeIcon, NearbyIcon } from './dockIcons';
import type { NavTarget, View } from './views';

/** The four dock items, in order. The one place to change which destinations the dock holds. */
export const DOCK_ITEMS: { to: NavTarget; label: string; icon: ReactNode }[] = [
  { to: 'home', label: 'Home', icon: <HomeIcon /> },
  { to: 'nearby', label: 'Nearby', icon: <NearbyIcon /> },
  { to: 'budget', label: 'Budget', icon: <BudgetIcon /> },
  { to: 'cook', label: 'Cook', icon: <CookIcon /> },
];

interface Props {
  current: View;
  onNavigate: (to: NavTarget) => void;
}

/** Home is current on the swap search and on the number, the two things "home" resolves to. */
const isCurrent = (to: NavTarget, current: View) => to === current || (to === 'home' && (current === 'number' || current === 'swaps'));

/**
 * The floating island: four round bubbles. The current one grows into an accent pill that shows its label;
 * the others are icon only (their name stays for screen readers). It is fixed to the bottom of the 520px app
 * column, inset by 12px plus the safe area; the page reserves --dock-h (index.css) so nothing hides behind it.
 * Separation from the page is tone (surface on bg) plus a faint ring of the muted token, no shadow.
 */
export function Dock({ current, onNavigate }: Props) {
  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[520px] justify-center pb-[calc(12px+env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface p-1.5 ring-2 ring-muted/40">
        {DOCK_ITEMS.map(({ to, label, icon }) => {
          const active = isCurrent(to, current);
          return (
            <li key={to}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(to)}
                className={`focus-ring inline-flex h-14 min-w-14 items-center justify-center rounded-full text-sm font-semibold motion-safe:transition-[background-color,color,transform] motion-safe:duration-250 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:active:scale-[0.94] ${
                  active ? 'bg-accent px-4 text-accent-ink' : 'text-ink hover:bg-bg'
                }`}
              >
                {icon}
                <span
                  className={`overflow-hidden whitespace-nowrap motion-safe:transition-[max-width,margin,opacity] motion-safe:duration-250 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    active ? 'ml-2 max-w-24 opacity-100' : 'ml-0 max-w-0 opacity-0'
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
