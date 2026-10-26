import { useState } from 'react';
import { Menu } from './Menu';
import { ProfileMenu } from './ProfileMenu';
import { ThemeDots } from './ThemeDots';
import type { NavTarget, View } from './views';

interface Props {
  view: View;
  onNavigate: (to: NavTarget) => void;
  /** Guests choose "Create a profile" in the profile panel. */
  onCreateProfile?: () => void;
}

/**
 * Wordmark on the left; theme dots, the profile avatar and the Menu button on the right (on narrow
 * screens the avatar and Menu drop to a second row, right-aligned). Only one of the Menu and the profile panel is
 * open at a time; each list drops down over the page.
 */
export function Header({ view, onNavigate, onCreateProfile = () => {} }: Props) {
  const [open, setOpen] = useState<'menu' | 'profile' | null>(null);
  return (
    <header className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-2 px-4 py-2">
        <p className="text-base font-extrabold tracking-tight">Culinerity</p>
        <div className="ml-auto">
          <ThemeDots />
        </div>
        <div className="ml-auto flex items-center gap-1 min-[460px]:ml-0">
          <ProfileMenu
            open={open === 'profile'}
            onOpenChange={(o) => setOpen(o ? 'profile' : null)}
            onCreateProfile={onCreateProfile}
          />
          <Menu
            current={view}
            onNavigate={onNavigate}
            open={open === 'menu'}
            onOpenChange={(o) => setOpen(o ? 'menu' : null)}
          />
        </div>
      </div>
    </header>
  );
}
