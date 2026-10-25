import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { DecisionEntry } from '../types';
import { storage } from '../lib/storage';
import { getWeeklyDecisionCount, getMonthlyDecisionCount } from '../lib/headspace';
import { usePersistentState } from '../lib/persist';

const REASONS = [
  { value: 'cost', label: 'Cost — couldn\'t afford the preferred option' },
  { value: 'availability', label: 'Availability — not near me or out of stock' },
  { value: 'time', label: 'Time — too long to source or prepare' },
  { value: 'cultural', label: 'Cultural — couldn\'t find culturally appropriate food' },
  { value: 'nutrition', label: 'Nutrition — chose budget over health' },
] as const;

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function getWeekBuckets(decisions: DecisionEntry[]): { week: string; count: number }[] {
  const buckets: Record<string, number> = {};
  decisions.forEach((d) => {
    const date = new Date(d.date);
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    const key = monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    buckets[key] = (buckets[key] ?? 0) + 1;
  });
  return Object.entries(buckets)
    .map(([week, count]) => ({ week, count }))
    .slice(-8);
}

export default function DecisionFriction() {
  const [decisions, setDecisions] = useState(() => storage.getDecisions());
  const [form, setForm] = usePersistentState('friction_form', {
    wanted: '',
    chose: '',
    reason: 'cost' as DecisionEntry['reason'],
    mealType: 'dinner' as DecisionEntry['mealType'],
  });
  const [open, setOpen] = usePersistentState('friction_open', false);
  const [saved, setSaved] = useState(false);

  const weeklyCount = getWeeklyDecisionCount(decisions);
  const monthlyCount = getMonthlyDecisionCount(decisions);
  const buckets = getWeekBuckets(decisions);

  const reasonBreakdown = REASONS.map((r) => ({
    label: r.label.split(' — ')[0],
    count: decisions.filter((d) => d.reason === r.value).length,
  }));

  function add() {
    if (!form.wanted.trim() || !form.chose.trim()) return;
    const entry: DecisionEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...form,
    };
    storage.addDecision(entry);
    const updated = storage.getDecisions();
    setDecisions(updated);
    setForm({ wanted: '', chose: '', reason: 'cost', mealType: 'dinner' });
    setSaved(true);
    setOpen(false);
    setTimeout(() => setSaved(false), 2500);
  }

  function remove(id: string) {
    storage.deleteDecision(id);
    setDecisions(storage.getDecisions());
  }

  const trendDirection = buckets.length > 1
    ? buckets[buckets.length - 1].count - buckets[buckets.length - 2].count
    : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Decision Friction</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Food trade-offs forced by budget, time, or access — logged by you
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Log a trade-off
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'This week', value: weeklyCount },
          { label: 'This month', value: monthlyCount },
          { label: 'Total logged', value: decisions.length },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-display font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">trade-offs</p>
          </div>
        ))}
      </div>

      {buckets.length > 0 && (
        <div className="bg-card border border-border rounded p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Weekly trend</p>
            {trendDirection !== 0 && (
              <span className={`text-xs font-mono ${trendDirection > 0 ? 'text-accent' : 'text-success'}`}>
                {trendDirection > 0 ? `+${trendDirection}` : trendDirection} vs last week
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={buckets} barSize={20}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Trade-offs" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reason breakdown */}
      {decisions.length > 0 && (
        <div className="bg-card border border-border rounded p-5 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Why you traded off</p>
          <div className="space-y-3">
            {reasonBreakdown.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className="w-20 text-sm text-muted-foreground flex-shrink-0">{r.label}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${(r.count / decisions.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-6 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      {decisions.length > 0 && (
        <div className="bg-card border border-border rounded p-5 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Recent entries</p>
          <div className="space-y-2">
            {decisions.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-muted-foreground line-through">{d.wanted}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span>{d.chose}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.reason} · {d.mealType} · {new Date(d.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <button
                  onClick={() => remove(d.id)}
                  className="text-muted-foreground hover:text-accent text-xs flex-shrink-0 mt-0.5"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {decisions.length === 0 && !open && (
        <div className="text-center py-12 text-muted-foreground border border-border rounded bg-card">
          <p className="text-sm mb-1">No trade-offs logged yet.</p>
          <p className="text-xs">Every time budget or access forces you to settle, log it here. The trend is more useful than any single entry.</p>
        </div>
      )}

      {/* Log modal */}
      {open && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded w-full max-w-md p-6">
            <h2 className="text-base font-semibold mb-4">Log a food trade-off</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">What did you want?</label>
                <input
                  className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. fresh salmon, groceries from the halal butcher"
                  value={form.wanted}
                  onChange={(e) => setForm((f) => ({ ...f, wanted: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">What did you choose instead?</label>
                <input
                  className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. canned tuna, chicken mince"
                  value={form.chose}
                  onChange={(e) => setForm((f) => ({ ...f, chose: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Why did you trade off?</label>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setForm((f) => ({ ...f, reason: r.value }))}
                      className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${form.reason === r.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:border-primary'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Meal</label>
                <div className="flex gap-2">
                  {MEAL_TYPES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, mealType: m }))}
                      className={`flex-1 py-1.5 rounded border text-sm capitalize transition-colors ${form.mealType === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 border border-border rounded text-sm hover:border-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={add}
                disabled={!form.wanted.trim() || !form.chose.trim()}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Log trade-off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
