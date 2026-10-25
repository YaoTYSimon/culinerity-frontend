import { useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import type { UserProfile, WeeklyLog } from '../types';
import { storage } from '../lib/storage';
import { usePersistentState } from '../lib/persist';

interface Props {
  profile: UserProfile;
}

function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function formatWeek(weekStart: string): string {
  const d = new Date(weekStart);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function WeeklyBalance({ profile }: Props) {
  const logs = storage.getWeeklyLogs();
  const thisWeek = getWeekStart();
  const existing = logs.find((l) => l.weekStart === thisWeek);

  const [form, setForm] = usePersistentState(`weekly_form_${thisWeek}`, {
    moneySpent: existing?.moneySpent ?? 0,
    nutritionScore: existing?.nutritionScore ?? 5,
    timeSpent: existing?.timeSpent ?? 0,
    culturalFitScore: existing?.culturalFitScore ?? 5,
    notes: existing?.notes ?? '',
  });
  const [saved, setSaved] = useState(false);

  function save() {
    const log: WeeklyLog = {
      id: existing?.id ?? Date.now().toString(),
      weekStart: thisWeek,
      ...form,
    };
    if (existing) storage.updateWeeklyLog(log);
    else storage.addWeeklyLog(log);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const radarData = [
    { axis: 'Cost', value: form.moneySpent > 0 ? Math.min(10, (form.moneySpent / profile.weeklyBudget) * 10) : 5 },
    { axis: 'Nutrition', value: form.nutritionScore },
    { axis: 'Time', value: form.timeSpent > 0 ? Math.min(10, form.timeSpent / 2) : 5 },
    { axis: 'Cultural fit', value: form.culturalFitScore },
  ];

  const recentLogs = logs.slice(0, 8).reverse();
  const trendData = recentLogs.map((l) => ({
    week: formatWeek(l.weekStart),
    nutrition: l.nutritionScore,
    cultural: l.culturalFitScore,
    cost: Math.min(10, (l.moneySpent / profile.weeklyBudget) * 10),
    time: Math.min(10, l.timeSpent / 2),
  }));

  const pressureAxis = radarData.reduce((a, b) => {
    const aScore = a.axis === 'Cost' || a.axis === 'Time' ? a.value : 10 - a.value;
    const bScore = b.axis === 'Cost' || b.axis === 'Time' ? b.value : 10 - b.value;
    return bScore > aScore ? b : a;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Weekly Balance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Four axes of this week's pressure — so the insight is specific, not generic
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Radar */}
        <div className="bg-card border border-border rounded p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">This week</p>
          {logs.length > 0 || form.moneySpent > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)', fontFamily: 'DM Sans' }} />
                <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Log this week's data to see the chart
            </div>
          )}
          {form.moneySpent > 0 && (
            <p className="text-xs text-center mt-2 text-muted-foreground">
              Primary pressure: <span className="text-foreground font-medium">{pressureAxis.axis}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Log this week — {formatWeek(thisWeek)}</p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Money spent on food (AUD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number" min={0}
                className="w-full border border-border rounded pl-7 pr-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="0"
                value={form.moneySpent || ''}
                onChange={(e) => setForm((f) => ({ ...f, moneySpent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            {form.moneySpent > 0 && (
              <p className={`text-xs mt-1 ${form.moneySpent > profile.weeklyBudget ? 'text-accent' : 'text-success'}`}>
                {form.moneySpent > profile.weeklyBudget
                  ? `$${(form.moneySpent - profile.weeklyBudget).toFixed(2)} over budget`
                  : `$${(profile.weeklyBudget - form.moneySpent).toFixed(2)} under budget`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nutrition quality <span className="text-muted-foreground font-normal">— {form.nutritionScore}/10</span>
            </label>
            <input
              type="range" min={1} max={10}
              value={form.nutritionScore}
              onChange={(e) => setForm((f) => ({ ...f, nutritionScore: parseInt(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>Mostly processed</span><span>Balanced and varied</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Time spent on food (hours total)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Shopping + cooking + deciding"
              value={form.timeSpent || ''}
              onChange={(e) => setForm((f) => ({ ...f, timeSpent: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Cultural fit <span className="text-muted-foreground font-normal">— {form.culturalFitScore}/10</span>
            </label>
            <input
              type="range" min={1} max={10}
              value={form.culturalFitScore}
              onChange={(e) => setForm((f) => ({ ...f, culturalFitScore: parseInt(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>Nothing felt right</span><span>Fully aligned</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Anything notable about this week's food situation"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <button
            onClick={save}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity"
          >
            {saved ? 'Saved' : existing ? 'Update this week' : 'Log this week'}
          </button>
        </div>
      </div>

      {/* Trend chart */}
      {trendData.length > 1 && (
        <div className="bg-card border border-border rounded p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">8-week trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px' }}
              />
              <Line dataKey="nutrition" name="Nutrition" stroke="var(--color-success)" strokeWidth={1.5} dot={false} />
              <Line dataKey="cultural" name="Cultural fit" stroke="var(--color-brand)" strokeWidth={1.5} dot={false} />
              <Line dataKey="cost" name="Cost pressure" stroke="var(--color-accent)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line dataKey="time" name="Time load" stroke="var(--color-highlight-ink)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { color: 'var(--color-success)', label: 'Nutrition (higher = better)' },
              { color: 'var(--color-brand)', label: 'Cultural fit (higher = better)' },
              { color: 'var(--color-accent)', label: 'Cost pressure (higher = over budget)' },
              { color: 'var(--color-highlight-ink)', label: 'Time load (higher = more hours)' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5" style={{ background: l.color }} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
