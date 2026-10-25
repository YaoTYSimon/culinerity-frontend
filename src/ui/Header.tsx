import { Menu } from './Menu';
import { ThemeDots } from './ThemeDots';
import type { NavTarget, View } from './views';

interface Props {
  view: View;
  onNavigate: (to: NavTarget) => void;
}

/** Wordmark on the left; theme dots and the Menu button on the right. The menu list drops down over the page. */
export function Header({ view, onNavigate }: Props) {
  return (
    <header className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-2 px-4 py-2">
        <p className="text-base font-extrabold tracking-tight">Culinerity</p>
        <div className="ml-auto flex items-center gap-1">
          <ThemeDots />
          <Menu current={view} onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  );
}
