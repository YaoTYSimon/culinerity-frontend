import { useState } from 'react';
import type { UserProfile } from '../types';
import { storage } from '../lib/storage';
import { calculateHeadspaceScore, getFreeScore, simulateScenario } from '../lib/headspace';
import { usePersistentState } from '../lib/persist';

interface Props {
  profile: UserProfile;
}

type ScenarioType = 'rent_increase' | 'lost_shift' | 'grocery_inflation' | 'job_loss' | 'custom';

const PRESETS: { type: ScenarioType; label: string; desc: string }[] = [
  { type: 'rent_increase', label: 'Rent increase (+10%)', desc: 'Landlord raises rent at lease renewal' },
  { type: 'lost_shift', label: 'Lost shift', desc: 'One week of unpaid shifts or casual work dried up' },
  { type: 'grocery_inflation', label: 'Grocery inflation (+15%)', desc: 'Supermarket prices rise across your staples' },
  { type: 'job_loss', label: 'Job loss (4 weeks)', desc: 'Lost employment, waiting for Jobseeker approval' },
  { type: 'custom', label: 'Custom scenario', desc: 'Model your own situation' },
];

export default function BudgetSimulator({ profile }: Props) {
  const [selectedPreset, setSelectedPreset] = usePersistentState<ScenarioType | null>('simulator_preset', null);
  const [custom, setCustom] = usePersistentState('simulator_custom', {
    rentChangePercent: 0,
    incomeChangeDollars: 0,
    groceryInflationPercent: 0,
    description: '',
  });

  const headspaceEntries = storage.getHeadspace();
  const currentScore = headspaceEntries[0]
    ? getFreeScore(headspaceEntries[0])
    : calculateHeadspaceScore({ costPressure: 50, nutritionTradeoffs: 50, timeEffort: 50, culturalFit: 50, decisionFriction: 50 });

  function getScenarioInputs() {
    switch (selectedPreset) {
      case 'rent_increase': return { rentChangePercent: 10 };
      case 'lost_shift': return { incomeChangeDollars: -(profile.weeklyIncome * 0.25 || 300) };
      case 'grocery_inflation': return { groceryInflationPercent: 15 };
      case 'job_loss': return { incomeChangeDollars: -(profile.weeklyIncome || 1000), groceryInflationPercent: 0 };
      case 'custom': return {
        rentChangePercent: custom.rentChangePercent,
        incomeChangeDollars: custom.incomeChangeDollars,
        groceryInflationPercent: custom.groceryInflationPercent,
      };
      default: return {};
    }
  }

  const result = selectedPreset
    ? simulateScenario(
        { weeklyIncome: profile.weeklyIncome || 800, weeklyRent: profile.weeklyRent || 400, weeklyBudget: profile.weeklyBudget },
        getScenarioInputs(),
        currentScore
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Budget Scenarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stress-test what financial shocks would do to your food security and Culinerity Score
        </p>
      </div>

      {/* Current baseline */}
      <div className="bg-card border border-border rounded p-4 mb-6">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Your current baseline</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Weekly income</p>
            <p className="font-mono font-medium">{profile.weeklyIncome > 0 ? `$${profile.weeklyIncome}` : 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Weekly rent</p>
            <p className="font-mono font-medium">{profile.weeklyRent > 0 ? `$${profile.weeklyRent}` : 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Food budget</p>
            <p className="font-mono font-medium">${profile.weeklyBudget}/wk</p>
          </div>
        </div>
        {(profile.weeklyIncome === 0 || profile.weeklyRent === 0) && (
          <p className="text-xs text-muted-foreground mt-3">
            Set income and rent in your profile for more accurate projections. Defaults are used for now.
          </p>
        )}
      </div>

      {/* Current headspace */}
      <div className="bg-card border border-border rounded p-4 mb-6">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Current Culinerity Score</p>
        <p className="text-3xl font-display font-semibold">{currentScore}<span className="text-base font-sans text-muted-foreground ml-1">/ 100</span></p>
        {headspaceEntries.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">No snapshot logged — using mid-range estimate. Update on the Culinerity page.</p>
        )}
      </div>

      {/* Preset selection */}
      <div className="mb-5">
        <p className="text-sm font-medium mb-3">Choose a scenario to model</p>
        <div className="space-y-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.type}
              onClick={() => setSelectedPreset(preset.type)}
              className={`w-full text-left p-4 rounded border transition-colors ${selectedPreset === preset.type ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary'}`}
            >
              <p className="text-sm font-medium">{preset.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom inputs */}
      {selectedPreset === 'custom' && (
        <div className="bg-card border border-border rounded p-5 mb-5 space-y-4">
          <p className="text-sm font-medium">Custom scenario</p>
          <div>
            <label className="block text-sm mb-1.5">Rent change (%)</label>
            <input
              type="number"
              className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. 10 for +10%, -5 for -5%"
              value={custom.rentChangePercent || ''}
              onChange={(e) => setCustom((c) => ({ ...c, rentChangePercent: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">Weekly income change (AUD)</label>
            <input
              type="number"
              className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. -300 for lost shift, -800 for job loss"
              value={custom.incomeChangeDollars || ''}
              onChange={(e) => setCustom((c) => ({ ...c, incomeChangeDollars: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">Grocery inflation (%)</label>
            <input
              type="number"
              className="w-full border border-border rounded px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. 15 for +15%"
              value={custom.groceryInflationPercent || ''}
              onChange={(e) => setCustom((c) => ({ ...c, groceryInflationPercent: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {result && selectedPreset && (
        <div className="space-y-4">
          <div className="border border-border rounded overflow-hidden">
            <div className="bg-foreground text-background px-5 py-3">
              <p className="text-sm font-medium">Projected impact</p>
            </div>
            <div className="bg-card p-5">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Culinerity Score</p>
                  <p className="text-2xl font-display font-semibold">{result.projectedScore}</p>
                  <p className={`text-xs font-mono mt-0.5 ${result.scoreDelta < 0 ? 'text-accent' : 'text-success'}`}>
                    {result.scoreDelta >= 0 ? '+' : ''}{result.scoreDelta} from current
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Weekly food budget</p>
                  <p className="text-2xl font-display font-semibold">${result.newFoodBudget.toFixed(0)}</p>
                  <p className={`text-xs font-mono mt-0.5 ${result.budgetChange < 0 ? 'text-accent' : 'text-success'}`}>
                    {result.budgetChange >= 0 ? '+' : ''}${result.budgetChange.toFixed(0)} change
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Extra trade-offs/wk</p>
                  <p className="text-2xl font-display font-semibold">+{result.tradeoffIncrease}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">forced food decisions</p>
                </div>
              </div>

              {/* Score bar comparison */}
              <div className="mb-5">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Current: {currentScore}%</span>
                  <span>Projected: {result.projectedScore}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                  <div className="h-3 bg-success rounded-full" style={{ width: `${currentScore}%` }} />
                  <div
                    className="h-3 absolute top-0 rounded-full transition-all"
                    style={{
                      width: `${result.projectedScore}%`,
                      background: result.projectedScore < 40 ? 'var(--color-accent)' : result.projectedScore < 60 ? 'var(--color-warning)' : 'var(--color-success)',
                      opacity: 0.5
                    }}
                  />
                </div>
              </div>

              {result.bufferMoves.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Buffer moves</p>
                  <div className="space-y-2">
                    {result.bufferMoves.map((move, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm">{move}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
