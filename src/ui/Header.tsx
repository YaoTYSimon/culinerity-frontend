import { Menu } from './Menu';
import type { NavTarget, View } from './views';

interface Props {
  view: View;
  onNavigate: (to: NavTarget) => void;
  /** Guests choose "Create a profile" in the panel's profile block. */
  onCreateProfile?: () => void;
}

/**
 * Wordmark on the left; the one Menu button (avatar plus "Menu") on the right. The Menu panel (which also holds the Colours choice) drops down over the page.
 */
export function Header({ view, onNavigate, onCreateProfile = () => {} }: Props) {
  return (
    <header className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-2 px-4 py-2">
        <p className="text-base font-extrabold tracking-tight">Culinerity</p>
        <div className="ml-auto flex items-center">
          <Menu current={view} onNavigate={onNavigate} onCreateProfile={onCreateProfile} />
        </div>
      </div>
    </header>
  );
}
