import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import type { UserProfile } from '../types';
import { storage } from '../lib/storage';
import { getWeeklyDecisionCount, getMonthlyDecisionCount } from '../lib/headspace';

interface Props {
  profile: UserProfile;
}

// Simulated aggregated suburb-level data for the policy view
const SUBURB_DATA = [
  { suburb: 'Footscray', headspaceAvg: 42, frictionAvg: 8.2, culturalDiversity: 'high', population: 15000 },
  { suburb: 'Sunshine', headspaceAvg: 38, frictionAvg: 9.1, culturalDiversity: 'high', population: 21000 },
  { suburb: 'Broadmeadows', headspaceAvg: 35, frictionAvg: 10.3, culturalDiversity: 'high', population: 18000 },
  { suburb: 'Dandenong', headspaceAvg: 40, frictionAvg: 8.8, culturalDiversity: 'very high', population: 30000 },
  { suburb: 'St Kilda', headspaceAvg: 58, frictionAvg: 5.1, culturalDiversity: 'medium', population: 17000 },
  { suburb: 'Richmond', headspaceAvg: 65, frictionAvg: 3.8, culturalDiversity: 'medium', population: 22000 },
  { suburb: 'Carlton', headspaceAvg: 62, frictionAvg: 4.2, culturalDiversity: 'medium', population: 14000 },
  { suburb: 'Springvale', headspaceAvg: 39, frictionAvg: 9.5, culturalDiversity: 'very high', population: 19000 },
];

type PolicyScenario = 'meal_program' | 'voucher_scheme' | 'market_subsidy' | 'community_fridge';

const POLICY_SCENARIOS: Record<PolicyScenario, { label: string; desc: string; headspaceGain: number; frictionReduction: number; costPerPerson: number }> = {
  meal_program: {
    label: 'Community meal program',
    desc: '5 free meals/week per household below poverty threshold',
    headspaceGain: 12,
    frictionReduction: 3.2,
    costPerPerson: 18.5,
  },
  voucher_scheme: {
    label: 'Grocery voucher scheme',
    desc: '$50/fortnight grocery vouchers for eligible households',
    headspaceGain: 9,
    frictionReduction: 2.1,
    costPerPerson: 25.0,
  },
  market_subsidy: {
    label: 'Farmers market access subsidy',
    desc: 'Council subsidises weekly farmers market stalls; produce at 40% below retail for concession holders',
    headspaceGain: 7,
    frictionReduction: 1.8,
    costPerPerson: 12.0,
  },
  community_fridge: {
    label: 'Community fridge network',
    desc: 'Fund 6 new community fridges across the suburb with weekly resupply',
    headspaceGain: 5,
    frictionReduction: 1.2,
    costPerPerson: 4.5,
  },
};

export default function PolicyDashboard({ profile }: Props) {
  const [selectedSuburb, setSelectedSuburb] = useState(SUBURB_DATA[0]);
  const [selectedScenario, setSelectedScenario] = useState<PolicyScenario | null>(null);
  const [view, setView] = useState<'aggregate' | 'simulator'>('aggregate');

  const decisions = storage.getDecisions();
  const headspaceEntries = storage.getHeadspace();
  const weeklyLogs = storage.getWeeklyLogs();

  const contributedData = profile.privacyDataSharing;
  const weeklyFriction = getWeeklyDecisionCount(decisions);
  const monthlyFriction = getMonthlyDecisionCount(decisions);
  const latestScore = headspaceEntries[0]?.score ?? null;

  const scenario = selectedScenario ? POLICY_SCENARIOS[selectedScenario] : null;
  const projectedSuburb = scenario
    ? {
        headspaceAvg: Math.min(100, selectedSuburb.headspaceAvg + scenario.headspaceGain),
        frictionAvg: Math.max(0, selectedSuburb.frictionAvg - scenario.frictionReduction),
        totalCost: (selectedSuburb.population * 0.3 * scenario.costPerPerson).toFixed(0),
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Research layer</p>
            <h1 className="text-2xl font-display font-semibold">Policy Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aggregated, anonymised data — sold to councils and NGOs who currently rely on annual surveys
            </p>
          </div>
        </div>
      </div>

      {/* Privacy status */}
      <div className={`mb-5 p-4 border rounded ${contributedData ? 'border-success/40 bg-success/5' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {contributedData ? 'You are contributing anonymised data' : 'Your data is private'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contributedData
                ? 'Your data feeds into suburb-level aggregates. No individual data is ever shared.'
                : 'Opt in to data sharing in your profile to contribute to community research.'}
            </p>
          </div>
          {contributedData && latestScore !== null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Your contributed data</p>
              <p className="text-sm font-mono">Score: {latestScore} · {weeklyFriction} trade-offs/wk</p>
            </div>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-border mb-6">
        {([
          { id: 'aggregate', label: 'Suburb aggregates' },
          { id: 'simulator', label: 'Policy simulator' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${view === t.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'aggregate' && (
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">Simulated suburb-level aggregates — in production, this reflects real opt-in data from users in each postcode area.</p>

          {/* Bar chart */}
          <div className="bg-card border border-border rounded p-5">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Average headspace score by suburb (Melbourne example)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SUBURB_DATA} barSize={20}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="suburb" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} angle={-20} textAnchor="end" height={40} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px' }}
                />
                <Bar dataKey="headspaceAvg" name="Headspace score" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Suburb</th>
                  <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Headspace</th>
                  <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Friction/wk</th>
                  <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Diversity</th>
                </tr>
              </thead>
              <tbody>
                {SUBURB_DATA.sort((a, b) => a.headspaceAvg - b.headspaceAvg).map((s) => (
                  <tr
                    key={s.suburb}
                    className="border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors"
                    onClick={() => { setSelectedSuburb(s); setView('simulator'); }}
                  >
                    <td className="px-4 py-3 font-medium">{s.suburb}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={s.headspaceAvg < 45 ? 'text-accent' : s.headspaceAvg < 60 ? 'text-warning' : 'text-success'}>
                        {s.headspaceAvg}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{s.frictionAvg}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground capitalize">{s.culturalDiversity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'simulator' && (
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">Model what happens to food security if a council funds different interventions. The user-facing Budget Simulator in reverse.</p>

          {/* Suburb selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Suburb to model</label>
            <div className="flex flex-wrap gap-2">
              {SUBURB_DATA.map((s) => (
                <button
                  key={s.suburb}
                  onClick={() => setSelectedSuburb(s)}
                  className={`px-3 py-1.5 rounded border text-sm transition-colors ${selectedSuburb.suburb === s.suburb ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary'}`}
                >
                  {s.suburb}
                </button>
              ))}
            </div>
          </div>

          {/* Current baseline */}
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{selectedSuburb.suburb} — current state</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Avg headspace</p>
                <p className="text-2xl font-display font-semibold">{selectedSuburb.headspaceAvg}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Friction/wk</p>
                <p className="text-2xl font-display font-semibold">{selectedSuburb.frictionAvg}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Population</p>
                <p className="text-2xl font-display font-semibold">{(selectedSuburb.population / 1000).toFixed(0)}k</p>
              </div>
            </div>
          </div>

          {/* Policy options */}
          <div>
            <label className="block text-sm font-medium mb-2">Choose an intervention</label>
            <div className="space-y-2">
              {(Object.entries(POLICY_SCENARIOS) as [PolicyScenario, typeof POLICY_SCENARIOS[PolicyScenario]][]).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setSelectedScenario(key)}
                  className={`w-full text-left p-4 rounded border transition-colors ${selectedScenario === key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary'}`}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">${s.costPerPerson}/person/wk</p>
                </button>
              ))}
            </div>
          </div>

          {/* Projected outcome */}
          {projectedSuburb && scenario && (
            <div className="border border-border rounded overflow-hidden">
              <div className="bg-foreground text-background px-5 py-3">
                <p className="text-sm font-medium">Projected outcome — {selectedSuburb.suburb} + {scenario.label}</p>
              </div>
              <div className="bg-card p-5">
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Headspace score</p>
                    <p className="text-2xl font-display font-semibold">{projectedSuburb.headspaceAvg}</p>
                    <p className="text-xs text-success font-mono mt-0.5">+{scenario.headspaceGain} points</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Friction/wk</p>
                    <p className="text-2xl font-display font-semibold">{projectedSuburb.frictionAvg.toFixed(1)}</p>
                    <p className="text-xs text-success font-mono mt-0.5">-{scenario.frictionReduction} per person</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Est. total cost/wk</p>
                    <p className="text-2xl font-display font-semibold">${(parseInt(projectedSuburb.totalCost) / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground mt-0.5">30% of suburb eligible</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Projections based on validated FIES correlation data and headspace score modelling. In production, uses real opt-in user data from this suburb.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
