import { useState } from 'react';
import type { CLHDomain, CLHResponses, UserProfile, HeadspaceEntry } from '../types';
import { storage } from '../lib/storage';
import {
  calculateHeadspaceScore,
  getScoreColor,
  getScoreLabel,
  generateInsights,
  getWeeklyDecisionCount,
  calculateCLHScore,
  getCLHBand,
  getLegacyScore,
} from '../lib/headspace';
import { usePersistentState, clearDraft } from '../lib/persist';
import type { FruitId } from '../lib/fruits';
import { FruitScatter, ScorePlate, portionColour, type PlatePortion } from '../components/Fruit';

interface Props {
  profile: UserProfile;
  fruit: FruitId;
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

const FIES_QUESTIONS = [
  'You were worried you would not have enough food to eat', 'You were unable to eat healthy and nutritious food',
  'You ate only a few kinds of foods', 'You had to skip a meal', 'You ate less than you thought you should',
  'Your household ran out of food', 'You were hungry but did not eat', 'You went a whole day without eating',
];

const DOMAINS: { key: CLHDomain; label: string; items: string[] }[] = [
  { key: 'B', label: 'Mental bandwidth', items: ['Thoughts about food, or how to pay for it, interrupted something else I was doing', 'I found it hard to concentrate at work, school or home because of worry about food', 'I ran food costs through my head when I was not shopping', 'Worry about food kept me awake or was on my mind first thing in the morning'] },
  { key: 'C', label: 'Cost pressure', items: ['I had to choose between food and another essential (rent, power, transport, medicine)', 'I put items back or left them off the list because of the total', 'I was unsure I could cover food until my next pay or payment'] },
  { key: 'D', label: 'Nutrition trade-offs', items: ['I bought a less healthy option because the healthier one cost more', 'I filled up on cheap foods I would rather not rely on'] },
  { key: 'E', label: 'Time and logistics', items: ['Getting food took more time or travel than I could easily spare', 'I went to more than one shop, or waited for a markdown, to make the budget work', 'I lacked the time, energy or kitchen equipment to cook what I had'] },
  { key: 'F', label: 'Decision friction', items: ['Deciding what to buy or cook felt overwhelming', 'I second-guessed food purchases after making them', 'I put off shopping or meal decisions because they felt like too much'] },
  { key: 'G', label: 'Cultural fit and dignity', items: ['I could not get the foods that matter to my culture, faith or family', 'I felt embarrassed or judged about how I get food', 'I had little real choice over what I ate'] },
];
const FREQUENCIES = ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'];

function CLHCheckin({ fruit, onScoreUpdate }: Props) {
  const latest = storage.getHeadspace()[0] ?? null;
  const [responses, setResponses] = usePersistentState<CLHResponses>('clh_responses', () => ({
    fies: latest?.fiesAnswers?.map((answer) => answer) ?? Array(8).fill(null),
    domains: Object.fromEntries(DOMAINS.map(({ key, items }) => [key, latest?.domainAnswers?.[key]?.map(Number) ?? Array(items.length).fill(null)])) as CLHResponses['domains'],
    calibration: latest?.calibration ?? 0,
  }));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fies = responses.fies.filter((answer): answer is boolean => answer !== null);
  const domains = Object.fromEntries(Object.entries(responses.domains).map(([key, answers]) => [key, answers.filter((answer): answer is number => answer !== null)]));
  const score = calculateCLHScore(fies, domains);
  const shownScore = score ?? 0;
  const free = score === null ? null : Math.round(100 - score);
  const portions: PlatePortion[] = DOMAINS.map(({ key, label }) => {
    const answers = domains[key];
    return { key, label, free: answers.length >= 2 ? Math.round(100 - (answers.reduce((sum, v) => sum + v, 0) / answers.length / 4) * 100) : null };
  });
  const weakest = portions.reduce<PlatePortion | null>((low, p) => (p.free !== null && (low === null || p.free < (low.free ?? 101)) ? p : low), null);
  const answered = fies.length + Object.values(domains).reduce((sum, answers) => sum + answers.length, 0);
  const band = score === null ? null : getCLHBand(score);
  const bandTone = band === 'Clear' || band === 'Background' ? 'bg-[#E3F0DF] text-[#2D5E2A]' : band === 'Strained' ? 'bg-[#FBEFD3] text-[#7A5A12]' : 'bg-[#FBE0D6] text-[#9A3412]';

  function save() {
    if (fies.length !== 8) return setError('Please answer all eight FIES questions.');
    if (Object.values(domains).some((answers) => answers.length < 2)) return setError('Please answer at least two questions in every domain.');
    const entry: HeadspaceEntry = { id: Date.now().toString(), date: new Date().toISOString(), fiesAnswers: responses.fies as boolean[], domainAnswers: domains, calibration: responses.calibration, score: shownScore, costPressure: shownScore, nutritionTradeoffs: shownScore, timeEffort: shownScore, culturalFit: shownScore, decisionFriction: shownScore };
    storage.addHeadspace(entry); clearDraft('clh_responses'); onScoreUpdate(Math.round(100 - shownScore)); setError(''); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  return <div className="max-w-4xl mx-auto pb-12">
    <div className="mb-8"><p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">CLH check-in / 26 scored questions</p><h1 className="text-3xl font-display font-semibold">Cognitive Load of Hunger</h1><p className="text-sm text-muted-foreground mt-1">How much of your headspace food worry is taking up over the past 4 weeks.</p></div>
    <section
      className="grain relative overflow-hidden rounded-lg p-7 mb-3 grid md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] gap-6 text-hero-foreground transition-colors duration-500"
      style={{ background: 'radial-gradient(120% 140% at 88% 0%, var(--color-hero-hi) 0%, var(--color-hero) 42%, var(--color-hero-lo) 100%)', minHeight: 320 }}
      aria-label="Culinerity Score"
    >
      <FruitScatter fruit={fruit} />
      <div data-scatter-avoid className="flex flex-col gap-2.5 self-stretch">
        <p className="text-[11px] font-mono uppercase tracking-widest text-hero-muted">Culinerity Score</p>
        <p className="font-display text-[clamp(88px,10vw,140px)] leading-[.85] tracking-tight flex items-start mt-1 tabular-nums">
          {free ?? '--'}
          {free !== null && <span className="text-[.32em] mt-[.2em] ml-1 text-hero-muted">%</span>}
        </p>
        <p className="text-[15px] text-hero-muted">
          {free !== null ? 'of your headspace is free from food worry' : `Answer every section below to see your score. ${answered} of 26 answered.`}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {band && <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${bandTone}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{band}</span>}
          {score !== null && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-hero-foreground/10">Cognitive load {score.toFixed(1)}%</span>}
          {fies.length > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-hero-foreground/10">FIES {fies.filter(Boolean).length}/8</span>}
        </div>
        <p className="text-sm text-hero-muted mt-auto max-w-[34ch]">
          {weakest ? <><b className="text-hero-foreground font-semibold">{weakest.label}</b> is taking the most headspace right now.</> : 'Each area fills in on the plate once you answer two of its questions.'}
        </p>
      </div>
      <div className="flex items-center justify-center gap-5 flex-wrap">
        <ScorePlate portions={portions} weakest={weakest?.key ?? null} className="w-52 h-52 shrink-0" />
        <div data-scatter-avoid className="rounded-md p-3.5 min-w-[190px] backdrop-blur-sm" style={{ background: 'color-mix(in srgb, var(--color-hero-lo) 35%, transparent)' }}>
          <p className="text-[10.5px] font-mono uppercase tracking-widest text-hero-muted mb-2">Headspace free by area</p>
          <ul className="grid gap-2">
            {portions.map((p) => (
              <li key={p.key} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px]">
                <i className="w-3 h-3 rounded-[4px] ring-1 ring-hero-foreground/25" style={{ background: portionColour(portions, weakest?.key ?? null, p.key) }} />
                <span className="truncate">{p.label}</span>
                <b className={`font-mono text-xs px-1.5 rounded-[6px] tabular-nums ${p.key === weakest?.key ? 'bg-highlight text-highlight-foreground font-bold' : 'font-medium'}`}>{p.free ?? '–'}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
    <p className="text-xs text-muted-foreground mb-6">Score weights: FIES 30% · Mental bandwidth 25% · Cost 12% · Nutrition 8% · Time 9% · Decision friction 9% · Cultural fit 7%{score !== null && ` · Old scale ${getLegacyScore(shownScore)}/10`}</p>
    <section className="bg-card border border-border rounded p-6 mb-6"><p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">A / Food insecurity severity</p><h2 className="text-lg font-semibold mb-1">In the past 4 weeks, because of a lack of money or other resources, was there a time when...</h2><p className="text-xs text-muted-foreground mb-5">Answer all eight. Yes answers count toward the FIES sub-score.</p>{FIES_QUESTIONS.map((question, index) => <div key={question} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><p className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">A{index + 1}</span>{question}?</p><div className="flex gap-2">{[true, false].map((value) => <button key={String(value)} onClick={() => setResponses((current) => ({ ...current, fies: current.fies.map((answer, i) => i === index ? value : answer) }))} className={`px-4 py-1.5 rounded border text-xs ${responses.fies[index] === value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>{value ? 'Yes' : 'No'}</button>)}</div></div>)}</section>
    <div className="mb-4"><p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">B–G / Cognitive load domains</p><h2 className="text-lg font-semibold">In the past 4 weeks, how often...</h2><p className="text-xs text-muted-foreground mt-1">Never 0 · Rarely 1 · Sometimes 2 · Often 3 · Almost always 4. Each domain needs at least two answers.</p></div>
    {DOMAINS.map(({ key, label, items }) => <section key={key} className="bg-card border border-border rounded p-6 mb-6"><div className="flex justify-between mb-4"><h3 className="font-semibold"><span className="font-mono text-xs text-muted-foreground mr-2">{key}</span>{label}</h3><span className="text-xs text-muted-foreground">{domains[key].length}/{items.length}</span></div>{items.map((item, index) => <div key={item} className="mb-5 last:mb-0"><p className="text-sm mb-2">{item}</p><div className="grid grid-cols-5 gap-1">{FREQUENCIES.map((frequency, value) => <button key={frequency} onClick={() => setResponses((current) => ({ ...current, domains: { ...current.domains, [key]: current.domains[key].map((answer, i) => i === index ? value : answer) } }))} className={`min-h-9 px-1 rounded border text-[11px] ${responses.domains[key][index] === value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>{frequency}</button>)}</div></div>)}</section>)}
    <section className="border border-border rounded p-6"><div className="flex justify-between gap-4 mb-3"><div><p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">H1 / Calibration only</p><h2 className="text-base font-semibold">Over the past 4 weeks, how much of your headspace did food worry take up?</h2></div><span className="font-mono text-sm">{responses.calibration}%</span></div><input type="range" min="0" max="100" value={responses.calibration} onChange={(event) => setResponses((current) => ({ ...current, calibration: Number(event.target.value) }))} className="w-full accent-primary" /></section>
    <div className="flex items-center justify-between gap-4 mt-6"><p className="text-sm text-accent">{error}</p><button onClick={save} className="px-5 py-2.5 bg-primary text-primary-foreground text-sm rounded hover:opacity-90">{saved ? 'Check-in saved' : 'Save check-in'}</button></div>
  </div>;
}

export default function Dashboard({ profile, fruit, onScoreUpdate }: Props) {
  return <CLHCheckin profile={profile} fruit={fruit} onScoreUpdate={onScoreUpdate} />;
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
        <h1 className="text-2xl font-display font-semibold">Culinerity Score</h1>
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
            <h2 className="text-base font-semibold">Update your Culinerity Score inputs</h2>
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
