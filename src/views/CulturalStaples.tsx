import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { UserProfile, StaplePrice } from '../types';
import { storage } from '../lib/storage';

interface Props {
  profile: UserProfile;
}

const COMMUNITY_PRESETS: Record<string, string[]> = {
  'South Asian': ['Basmati rice (5kg)', 'Toor dal (1kg)', 'Halal chicken mince (500g)', 'Paneer (200g)', 'Garam masala (100g)', 'Atta flour (5kg)', 'Ghee (500g)'],
  'East Asian': ['Jasmine rice (5kg)', 'Soy sauce (750ml)', 'Oyster sauce', 'Fish sauce', 'Sesame oil', 'Rice noodles (400g)', 'Tofu (firm, 400g)'],
  'Middle Eastern': ['Basmati rice (5kg)', 'Halal lamb mince (500g)', 'Tahini (500g)', 'Dried chickpeas (1kg)', 'Za\'atar (100g)', 'Halal beef (500g)', 'Sumac'],
  'Sub-Saharan African': ['Long grain rice (5kg)', 'Palm oil (1L)', 'Dried black-eyed peas (1kg)', 'Groundnut paste (jar)', 'Fufu flour', 'Smoked fish'],
  'South East Asian': ['Jasmine rice (5kg)', 'Coconut milk (400ml)', 'Fish sauce', 'Lemongrass', 'Galangal', 'Kaffir lime leaves', 'Shrimp paste'],
  'Latin American': ['Long grain rice (1kg)', 'Dried black beans (1kg)', 'Dried pinto beans (1kg)', 'Masa harina (1kg)', 'Chipotle in adobo', 'Queso fresco'],
};

const STORES = ['Woolworths', 'Coles', 'Aldi', 'IGA', 'Asian grocery', 'Indian grocery', 'Middle Eastern grocery', 'African grocery', 'Latin grocery', 'Butcher', 'Market', 'Other'];

function getItemHistory(staples: StaplePrice[], name: string): { date: string; price: number }[] {
  return staples
    .filter((s) => s.name === name)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((s) => ({
      date: new Date(s.loggedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      price: s.currentPrice,
    }));
}

export default function CulturalStaples({ profile }: Props) {
  const [staples, setStaples] = useState(() => storage.getStaples());
  const [form, setForm] = useState({
    name: '',
    currentPrice: 0,
    unit: '',
    store: 'Woolworths',
    community: profile.culturalBackground || 'General',
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const presets = COMMUNITY_PRESETS[profile.culturalBackground] ?? [];

  function add() {
    if (!form.name.trim() || form.currentPrice <= 0) return;
    const item: StaplePrice = {
      id: Date.now().toString(),
      name: form.name.trim(),
      category: 'staple',
      community: form.community,
      currentPrice: form.currentPrice,
      unit: form.unit,
      store: form.store,
      loggedAt: new Date().toISOString(),
    };
    storage.addStaple(item);
    setStaples(storage.getStaples());
    setForm((f) => ({ ...f, name: '', currentPrice: 0, unit: '' }));
    setShowForm(false);
  }

  function remove(id: string) {
    storage.removeStaple(id);
    setStaples(storage.getStaples());
  }

  // Unique item names
  const uniqueItems = [...new Set(staples.map((s) => s.name))];
  const latest = uniqueItems.map((name) => {
    const entries = staples.filter((s) => s.name === name);
    const latest = entries.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())[0];
    const oldest = entries[entries.length - 1];
    const trend = entries.length > 1 ? latest.currentPrice - oldest.currentPrice : 0;
    return { name, latest, trend, count: entries.length };
  });

  const history = selectedItem ? getItemHistory(staples, selectedItem) : [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Cultural Staples Index</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price tracking for the foods that matter to your community — not a generic basket
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Log a price
        </button>
      </div>

      {/* Community note */}
      <div className="mb-5 p-4 bg-card border border-border rounded">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Your community index</p>
        <p className="text-sm">{profile.culturalBackground || 'General'}</p>
        {presets.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Suggested staples to track: {presets.join(', ')}.
          </p>
        )}
      </div>

      {/* Halal/Kosher price gap note */}
      {(profile.dietaryPreferences.includes('Halal') || profile.dietaryPreferences.includes('Kosher')) && (
        <div className="mb-5 p-4 border border-warning/40 bg-warning/5 rounded">
          <p className="text-xs font-mono uppercase tracking-wider text-warning mb-1">Dietary premium</p>
          <p className="text-sm text-muted-foreground">
            {profile.dietaryPreferences.includes('Halal') ? 'Halal' : 'Kosher'} meat typically costs 15–40% more than conventional equivalents at mainstream supermarkets, and less at specialist grocers. This index tracks your actual prices so the premium is visible over time.
          </p>
        </div>
      )}

      {/* Quick add from presets */}
      {presets.length > 0 && !showForm && staples.length === 0 && (
        <div className="mb-5 bg-card border border-border rounded p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Quick-add a staple to track</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => { setForm((f) => ({ ...f, name: p })); setShowForm(true); }}
                className="text-xs border border-border rounded px-2 py-1.5 bg-background hover:border-primary transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded p-5 mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Log a price</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm mb-1.5">Item</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. Basmati rice 5kg, Halal chicken mince 500g"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Price ($)</label>
              <input
                type="number" min={0} step={0.01}
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.currentPrice || ''}
                onChange={(e) => setForm((f) => ({ ...f, currentPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Unit</label>
              <input
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="per kg, each, per pack..."
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Store</label>
              <select
                className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none"
                value={form.store}
                onChange={(e) => setForm((f) => ({ ...f, store: e.target.value }))}
              >
                {STORES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border rounded text-sm hover:border-primary transition-colors">Cancel</button>
            <button onClick={add} disabled={!form.name.trim() || form.currentPrice <= 0} className="flex-1 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40 transition-opacity">
              Save price
            </button>
          </div>
        </div>
      )}

      {/* Price trend chart */}
      {selectedItem && history.length > 1 && (
        <div className="bg-card border border-border rounded p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{selectedItem} — price history</p>
            <button onClick={() => setSelectedItem(null)} className="text-xs text-muted-foreground hover:text-foreground">close</button>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, 'Price']}
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px' }}
              />
              <Line dataKey="price" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-accent)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Items table */}
      {latest.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded text-muted-foreground">
          <p className="text-sm">No prices logged yet.</p>
          <p className="text-xs mt-1">Start tracking your community's staples — each log builds a price trend over time.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Latest</th>
                <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Trend</th>
                <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Logs</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {latest.map(({ name, latest: l, trend, count }) => (
                <tr key={name} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedItem(selectedItem === name ? null : name)}
                      className="text-left font-medium hover:text-primary transition-colors"
                    >
                      {name}
                    </button>
                    <p className="text-xs text-muted-foreground">{l.store}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${l.currentPrice.toFixed(2)}
                    {l.unit && <span className="text-muted-foreground text-xs ml-1">/{l.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {count > 1 ? (
                      <span className={trend > 0 ? 'text-accent' : trend < 0 ? 'text-success' : 'text-muted-foreground'}>
                        {trend > 0 ? '+' : ''}{trend.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs">{count}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(l.id)} className="text-xs text-muted-foreground hover:text-accent">remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
