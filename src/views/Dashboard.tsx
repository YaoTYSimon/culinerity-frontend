import { useState } from 'react';
import type { UserProfile, HeadspaceEntry } from '../types';
import { storage } from '../lib/storage';
import {
  calculateHeadspaceScore,
  getScoreColor,
  getScoreLabel,
  generateInsights,
  getWeeklyDecisionCount,
} from '../lib/headspace';

interface Props {
  profile: UserProfile;
  onScoreUpdate: (score: number) => void;
}

function Gauge({ score }: { score: number }) {
  const r = 72;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = getScoreColor(score);

  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-muted)" strokeWidth="10" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="38" fontWeight="600" fill="var(--color-foreground)" fontFamily="Fraunces, Georgia, serif">
        {score}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--color-muted-foreground)" fontFamily="DM Sans, system-ui, sans-serif">
        headspace free
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize="10" fill={color} fontFamily="DM Sans, system-ui, sans-serif" fontWeight="500">
        {getScoreLabel(score)}
      </text>
    </svg>
  );
}

const AXES = [
  { key: 'costPressure', label: 'Cost pressure', desc: 'How much financial strain you feel around food spending' },
  { key: 'nutritionTradeoffs', label: 'Nutrition trade-offs', desc: 'How often you settle for less nutritious food due to constraints' },
  { key: 'timeEffort', label: 'Time and effort', desc: 'Mental and physical energy spent on food decisions and preparation' },
  { key: 'culturalFit', label: 'Cultural misalignment', desc: 'Degree to which your food choices don\'t match your cultural preferences' },
  { key: 'decisionFriction', label: 'Decision friction', desc: 'How exhausted you feel making food decisions' },
] as const;

type AxisKey = typeof AXES[number]['key'];

export default function Dashboard({ profile, onScoreUpdate }: Props) {
  const entries = storage.getHeadspace();
  const decisions = storage.getDecisions();
  const weeklyLogs = storage.getWeeklyLogs();
  const latest = entries[0] ?? null;

  const [inputs, setInputs] = useState<Record<AxisKey, number>>({
    costPressure: latest?.costPressure ?? 50,
    nutritionTradeoffs: latest?.nutritionTradeoffs ?? 50,
    timeEffort: latest?.timeEffort ?? 50,
    culturalFit: latest?.culturalFit ?? 50,
    decisionFriction: latest?.decisionFriction ?? 50,
  });
  const [saved, setSaved] = useState(false);

  const currentScore = calculateHeadspaceScore(inputs);
  const weeklyDecisions = getWeeklyDecisionCount(decisions);

  const insights = latest
    ? generateInsights(entries, weeklyLogs, weeklyDecisions, profile.weeklyBudget)
    : [];

  function save() {
    const entry: HeadspaceEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...inputs,
      score: currentScore,
    };
    storage.addHeadspace(entry);
    onScoreUpdate(currentScore);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const fiesRating =
    profile.fiesScore <= 1 ? 'Food secure or mildly insecure' :
    profile.fiesScore <= 3 ? 'Moderately food insecure' :
    'Severely food insecure';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Headspace Score</h1>
        <p className="text-sm text-muted-foreground mt-1">How much mental bandwidth food decisions are consuming right now</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Gauge */}
        <div className="bg-card border border-border rounded p-6 flex flex-col items-center">
          <Gauge score={currentScore} />
          <p className="text-xs text-muted-foreground text-center mt-3 max-w-[220px]">
            Higher is better. 100 means food decisions take no mental space at all.
          </p>
          {entries.length > 1 && (
            <div className="mt-4 flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span>prev: {entries[1].score}</span>
              <span className={currentScore >= entries[1].score ? 'text-success' : 'text-accent'}>
                {currentScore >= entries[1].score ? '+' : ''}{currentScore - entries[1].score}
              </span>
            </div>
          )}
        </div>

        {/* FIES + quick stats */}
        <div className="space-y-3">
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">FIES Baseline</p>
            <p className="text-lg font-display font-semibold">{profile.fiesScore}/8</p>
            <p className="text-sm text-muted-foreground mt-0.5">{fiesRating}</p>
          </div>
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Trade-offs this week</p>
            <p className="text-lg font-display font-semibold">{weeklyDecisions}</p>
            <p className="text-sm text-muted-foreground mt-0.5">food decisions forced by constraint</p>
          </div>
          <div className="bg-card border border-border rounded p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Weekly food budget</p>
            <p className="text-lg font-display font-semibold">${profile.weeklyBudget}</p>
            <p className="text-sm text-muted-foreground mt-0.5">for {profile.householdSize} {profile.householdSize === 1 ? 'person' : 'people'}</p>
          </div>
        </div>
      </div>

      {/* Axis inputs */}
      <div className="bg-card border border-border rounded p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold">Update your headspace inputs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Rate each axis 0 (no pressure) to 100 (maximum pressure)</p>
          </div>
          <button
            onClick={save}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity"
          >
            {saved ? 'Saved' : 'Save snapshot'}
          </button>
        </div>
        <div className="space-y-5">
          {AXES.map((axis) => (
            <div key={axis.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium">{axis.label}</span>
                  <p className="text-xs text-muted-foreground">{axis.desc}</p>
                </div>
                <span className="text-sm font-mono ml-4 flex-shrink-0">{inputs[axis.key]}</span>
              </div>
              <input
                type="range" min={0} max={100}
                value={inputs[axis.key]}
                onChange={(e) => setInputs((p) => ({ ...p, [axis.key]: parseInt(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>No pressure</span>
                <span>Maximum pressure</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="border border-border rounded p-5">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">Insights</h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1 rounded-full bg-primary flex-shrink-0 mt-1" style={{ height: 'auto', minHeight: '16px' }} />
                <p className="text-sm leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No history yet. Set your inputs above and save your first snapshot.</p>
        </div>
      )}
    </div>
  );
}
