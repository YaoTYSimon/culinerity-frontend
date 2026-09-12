import type { NavView } from '../types';

interface NavItem {
  id: NavView;
  label: string;
  group: 'main' | 'tools' | 'policy';
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Headspace', group: 'main' },
  { id: 'weekly', label: 'Weekly Balance', group: 'main' },
  { id: 'friction', label: 'Decision Friction', group: 'main' },
  { id: 'craving', label: 'Craving Swap', group: 'main' },
  { id: 'assets', label: 'Food Assets', group: 'main' },
  { id: 'simulator', label: 'Budget Scenarios', group: 'main' },
  { id: 'pantry', label: 'Pantry', group: 'tools' },
  { id: 'halfprice', label: 'Half-Price Cycles', group: 'tools' },
  { id: 'staples', label: 'Cultural Staples', group: 'tools' },
  { id: 'policy', label: 'Policy Dashboard', group: 'policy' },
];

interface Props {
  current: NavView;
  onChange: (v: NavView) => void;
  profileName: string;
  score: number | null;
}

export default function Sidebar({ current, onChange, profileName, score }: Props) {
  const mainItems = NAV.filter((n) => n.group === 'main');
  const toolItems = NAV.filter((n) => n.group === 'tools');
  const policyItems = NAV.filter((n) => n.group === 'policy');

  return (
    <aside
      className="fixed left-0 top-0 h-full w-52 border-r border-border bg-card flex flex-col z-20"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Identity */}
      <div className="px-4 py-5 border-b border-border">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Headspace</p>
        <p className="text-sm font-medium text-foreground truncate">{profileName}</p>
        {score !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-1 flex-1 rounded-full bg-muted"
            >
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  backgroundColor: score >= 75 ? 'var(--color-success)' : score >= 55 ? 'var(--color-warning)' : 'var(--color-accent)',
                }}
              />
            </div>
            <span className="text-xs font-mono text-foreground">{score}%</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <NavGroup label="Overview" items={mainItems} current={current} onChange={onChange} />
        <NavGroup label="Tools" items={toolItems} current={current} onChange={onChange} />
        <NavGroup label="Research" items={policyItems} current={current} onChange={onChange} />
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">Data stays on device by default.</p>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  current,
  onChange,
}: {
  label: string;
  items: NavItem[];
  current: NavView;
  onChange: (v: NavView) => void;
}) {
  return (
    <div className="mb-4">
      <p className="px-4 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
            current === item.id
              ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
              : 'text-foreground hover:bg-secondary'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
