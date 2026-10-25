import type { NavView } from '../types';
import { FRUITS, FRUIT_ORDER, type FruitId } from '../lib/fruits';
import { FruitLogo } from './Fruit';

interface NavItem {
  id: NavView;
  label: string;
  group: 'main' | 'tools' | 'policy';
  icon: string;
}

// 24×24 stroke icons
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Culinerity', group: 'main', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' },
  { id: 'weekly', label: 'Weekly Balance', group: 'main', icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { id: 'friction', label: 'Decision Friction', group: 'main', icon: '<path d="M7 4v7a5 5 0 0 0 10 0V4M12 16v5M9 21h6"/>' },
  { id: 'craving', label: 'Craving Swap', group: 'main', icon: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>' },
  { id: 'assets', label: 'Food Assets', group: 'main', icon: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>' },
  { id: 'simulator', label: 'Budget Scenarios', group: 'main', icon: '<path d="M3 17l5-5 4 3 9-9M15 6h6v6"/>' },
  { id: 'pantry', label: 'Pantry', group: 'tools', icon: '<path d="M7 3h10M8 3v3a4 4 0 0 0-2 3.5V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9.5A4 4 0 0 0 16 6V3"/><path d="M6 12h12"/>' },
  { id: 'halfprice', label: 'Half-Price Cycles', group: 'tools', icon: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>' },
  { id: 'staples', label: 'Cultural Staples', group: 'tools', icon: '<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>' },
  { id: 'policy', label: 'Policy Dashboard', group: 'policy', icon: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>' },
];

interface Props {
  current: NavView;
  onChange: (v: NavView) => void;
  profileName: string;
  score: number | null;
  fruit: FruitId;
  onFruitChange: (f: FruitId) => void;
}

export default function Sidebar({ current, onChange, profileName, score, fruit, onFruitChange }: Props) {
  return (
    <aside className="grain fixed left-0 top-0 h-full w-60 bg-sidebar text-sidebar-foreground flex flex-col z-20 transition-colors duration-500">
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <FruitLogo fruit={fruit} className="w-8 h-8 shrink-0" />
        <span className="font-display text-2xl leading-none">Culinerity</span>
      </div>

      <div className="mx-3 mb-2 p-3 rounded-md border border-sidebar-foreground/10 bg-sidebar-foreground/5 flex items-center gap-3">
        <span
          className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold shrink-0 text-sidebar"
          style={{ background: 'radial-gradient(circle at 35% 30%, var(--color-highlight), var(--color-brand))' }}
        >
          {profileName.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{profileName}</p>
          {score !== null ? (
            <div className="mt-1 flex items-center gap-2" title="Headspace free">
              <div className="h-1.5 flex-1 rounded-full bg-sidebar-foreground/15 overflow-hidden">
                <div className="h-full rounded-full bg-highlight transition-all duration-700" style={{ width: `${score}%` }} />
              </div>
              <span className="text-xs font-mono">{score}%</span>
            </div>
          ) : (
            <p className="text-xs text-sidebar-muted mt-0.5">No check-in yet</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <NavGroup label="Overview" items={NAV.filter((n) => n.group === 'main')} current={current} onChange={onChange} />
        <NavGroup label="Kitchen" items={NAV.filter((n) => n.group === 'tools')} current={current} onChange={onChange} />
        <NavGroup label="Research" items={NAV.filter((n) => n.group === 'policy')} current={current} onChange={onChange} />
      </nav>

      <div className="mx-3 mb-3 p-3 rounded-md bg-sidebar-raised">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[10.5px] font-mono uppercase tracking-widest text-highlight">Theme</p>
          <p className="text-xs text-sidebar-muted">{FRUITS[fruit].name}</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Choose a fruit theme">
          {FRUIT_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              title={FRUITS[f].name}
              aria-label={`${FRUITS[f].name} theme`}
              aria-pressed={f === fruit}
              onClick={() => onFruitChange(f)}
              className={`aspect-square rounded-sm grid place-items-center transition-all focus-visible:outline-2 focus-visible:outline-highlight ${
                f === fruit ? 'bg-sidebar-foreground/20 ring-2 ring-highlight' : 'hover:bg-sidebar-foreground/10'
              }`}
            >
              <FruitLogo fruit={f} className="w-6 h-6" />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-sidebar-muted mt-2.5">Your data stays on this device.</p>
      </div>
    </aside>
  );
}

function NavGroup({ label, items, current, onChange }: { label: string; items: NavItem[]; current: NavView; onChange: (v: NavView) => void }) {
  return (
    <div className="mb-3">
      <p className="px-2.5 pt-2 pb-1 text-[10.5px] font-mono uppercase tracking-widest text-sidebar-muted/70">{label}</p>
      {items.map((item) => {
        const on = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-current={on ? 'page' : undefined}
            className={`relative w-full flex items-center gap-3 text-left px-2.5 py-2 rounded-sm text-sm transition-colors ${
              on ? 'text-sidebar-foreground font-semibold' : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-foreground/5'
            }`}
            style={on ? { background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-brand) 45%, transparent), color-mix(in srgb, var(--color-brand) 10%, transparent))' } : undefined}
          >
            {on && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-highlight" />}
            <svg
              viewBox="0 0 24 24"
              className="w-[17px] h-[17px] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
