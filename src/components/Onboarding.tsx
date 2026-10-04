import { useState } from 'react';
import type { UserProfile } from '../types';
import { storage } from '../lib/storage';

const FIES_QUESTIONS = [
  'In the past 4 weeks, were you worried you would not have enough food to eat because of a lack of money or other resources?',
  'Were you unable to eat healthy and nutritious food because of a lack of money or other resources?',
  'Did you eat only a few kinds of foods because of a lack of money or other resources?',
  'Did you have to skip a meal because there was not enough money or other resources to get food?',
  'Did you eat less than you thought you should because of a lack of money or other resources?',
  'Did your household run out of food because of a lack of money or other resources?',
  'Were you hungry but did not eat because there was not enough money or other resources to get food?',
  'Did you go without eating for a whole day because of a lack of money or other resources?',
];

const CULTURAL_BACKGROUNDS = [
  'Australian (Anglo-Celtic)', 'Aboriginal and Torres Strait Islander',
  'South Asian', 'East Asian', 'South East Asian',
  'Middle Eastern', 'North African', 'Sub-Saharan African',
  'Southern European', 'Eastern European', 'Western European',
  'Latin American', 'Pacific Islander', 'Other',
];

const DIETARY_OPTIONS = [
  'Halal', 'Kosher', 'Vegetarian', 'Vegan',
  'Gluten-free', 'Dairy-free', 'Nut-free', 'No pork',
  'No shellfish', 'No restrictions',
];

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Welcome', subtitle: 'How this works and what we do with your data' },
  { id: 2, title: 'About your household', subtitle: 'So we can calibrate everything to your situation' },
  { id: 3, title: 'Your food budget and time', subtitle: 'Your preferences guide every recommendation' },
  { id: 4, title: 'Cultural background and diet', subtitle: 'Tailors recipe suggestions and the cultural staples index' },
  { id: 5, title: 'Food security experience', subtitle: 'Eight validated questions about the past 4 weeks' },
  { id: 6, title: 'Data and privacy', subtitle: 'What stays on your device and what you can choose to share' },
];

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    postcode: '',
    suburb: '',
    householdSize: 1,
    dependents: 0,
    culturalBackground: '',
    dietaryPreferences: [] as string[],
    weeklyBudget: 0,
    weeklyIncome: 0,
    weeklyRent: 0,
    cookingTimeAvailable: 'moderate' as 'minimal' | 'moderate' | 'flexible',
    costPriority: 2 as 1 | 2 | 3,
    timePriority: 2 as 1 | 2 | 3,
    culturalPriority: 2 as 1 | 2 | 3,
    fiesAnswers: Array(8).fill(null) as (boolean | null)[],
    privacyDataSharing: false,
  });

  const [error, setError] = useState('');

  function toggleDiet(option: string) {
    setForm((f) => ({
      ...f,
      dietaryPreferences: f.dietaryPreferences.includes(option)
        ? f.dietaryPreferences.filter((d) => d !== option)
        : [...f.dietaryPreferences, option],
    }));
  }

  function setFIES(index: number, value: boolean) {
    setForm((f) => {
      const next = [...f.fiesAnswers];
      next[index] = value;
      return { ...f, fiesAnswers: next };
    });
  }

  function validate(): boolean {
    setError('');
    if (step === 2) {
      if (!form.name.trim()) { setError('Please enter your name.'); return false; }
      if (!form.postcode.match(/^\d{4}$/)) { setError('Enter a valid 4-digit Australian postcode.'); return false; }
    }
    if (step === 3) {
      if (form.weeklyBudget <= 0) { setError('Enter your weekly food budget.'); return false; }
    }
    if (step === 4) {
      if (!form.culturalBackground) { setError('Please select a cultural background.'); return false; }
    }
    if (step === 5) {
      if (form.fiesAnswers.some((a) => a === null)) { setError('Please answer all eight questions.'); return false; }
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    if (step < STEPS.length) setStep((s) => s + 1);
    else submit();
  }

  function submit() {
    const fiesScore = form.fiesAnswers.filter(Boolean).length;
    const profile: UserProfile = {
      name: form.name.trim(),
      postcode: form.postcode,
      suburb: form.suburb.trim(),
      householdSize: form.householdSize,
      dependents: form.dependents,
      culturalBackground: form.culturalBackground,
      dietaryPreferences: form.dietaryPreferences,
      weeklyBudget: form.weeklyBudget,
      weeklyIncome: form.weeklyIncome,
      weeklyRent: form.weeklyRent,
      cookingTimeAvailable: form.cookingTimeAvailable,
      costPriority: form.costPriority,
      timePriority: form.timePriority,
      culturalPriority: form.culturalPriority,
      fiesAnswers: form.fiesAnswers as boolean[],
      fiesScore,
      onboardingComplete: true,
      privacyDataSharing: form.privacyDataSharing,
      createdAt: new Date().toISOString(),
    };
    storage.setProfile(profile);
    onComplete(profile);
  }

  const fiesScore = form.fiesAnswers.filter((a) => a === true).length;
  const answered = form.fiesAnswers.filter((a) => a !== null).length;

  return (
    <div className="min-h-screen flex items-start justify-center bg-background py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex gap-1 mb-4">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="h-0.5 flex-1 transition-colors duration-300"
                style={{ backgroundColor: s.id <= step ? 'var(--color-primary)' : 'var(--color-border)' }}
              />
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Step {step} of {STEPS.length}
          </p>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground mb-2">
            {STEPS[step - 1].title}
          </h1>
          <p className="text-muted-foreground text-sm">{STEPS[step - 1].subtitle}</p>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed">
              This app tracks the mental load of feeding yourself and your household — a metric we call <span className="font-semibold text-primary">Cognitive Load of Hunger</span>. The check-in combines the full eight-question FIES module with six cognitive load domains.
            </p>
            <p className="text-sm leading-relaxed">
              It also surfaces local food resources, batch-cook strategies, craving alternatives, and budget stress-testing — all calibrated to your actual situation.
            </p>
            <div className="border border-border rounded p-4 bg-card">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Research basis</p>
              <p className="text-sm">
                The onboarding screener uses the FAO Food Insecurity Experience Scale (FIES), a validated 8-question instrument used in national food security surveys across 150+ countries. Your score is private by default.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Household */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                className="w-full border border-border rounded px-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="First name is enough"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Postcode</label>
                <input
                  className="w-full border border-border rounded px-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. 3000"
                  maxLength={4}
                  value={form.postcode}
                  onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Suburb (optional)</label>
                <input
                  className="w-full border border-border rounded px-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. Footscray"
                  value={form.suburb}
                  onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Household size</label>
                <input
                  type="number" min={1} max={20}
                  className="w-full border border-border rounded px-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.householdSize}
                  onChange={(e) => setForm((f) => ({ ...f, householdSize: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Dependents under 18</label>
                <input
                  type="number" min={0} max={20}
                  className="w-full border border-border rounded px-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.dependents}
                  onChange={(e) => setForm((f) => ({ ...f, dependents: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Time */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Weekly food budget (AUD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number" min={0}
                  className="w-full border border-border rounded pl-7 pr-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                  value={form.weeklyBudget || ''}
                  onChange={(e) => setForm((f) => ({ ...f, weeklyBudget: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Weekly income (AUD, optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="number" min={0}
                    className="w-full border border-border rounded pl-7 pr-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0"
                    value={form.weeklyIncome || ''}
                    onChange={(e) => setForm((f) => ({ ...f, weeklyIncome: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">Weekly rent/mortgage (AUD, optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="number" min={0}
                    className="w-full border border-border rounded pl-7 pr-3 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0"
                    value={form.weeklyRent || ''}
                    onChange={(e) => setForm((f) => ({ ...f, weeklyRent: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time available for cooking</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'minimal', label: 'Minimal', sub: 'Under 30 min/day' },
                  { value: 'moderate', label: 'Moderate', sub: '30–60 min/day' },
                  { value: 'flexible', label: 'Flexible', sub: 'Over 60 min/day' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, cookingTimeAvailable: opt.value }))}
                    className={`p-3 rounded border text-left transition-colors ${form.cookingTimeAvailable === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary'}`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${form.cookingTimeAvailable === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">What matters most to you in food choices?</label>
              <p className="text-xs text-muted-foreground mb-3">Rate each from 1 (low priority) to 3 (top priority)</p>
              {([
                { key: 'costPriority', label: 'Keeping cost down' },
                { key: 'timePriority', label: 'Speed and convenience' },
                { key: 'culturalPriority', label: 'Cultural relevance' },
              ] as const).map((axis) => (
                <div key={axis.key} className="flex items-center justify-between mb-3">
                  <span className="text-sm">{axis.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((f) => ({ ...f, [axis.key]: v as 1 | 2 | 3 }))}
                        className={`w-8 h-8 rounded text-sm font-mono border transition-colors ${form[axis.key] === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Cultural */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Cultural background</label>
              <p className="text-xs text-muted-foreground mb-3">Used to calibrate the Cultural Staples Index — prices of the foods your community relies on.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CULTURAL_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setForm((f) => ({ ...f, culturalBackground: bg }))}
                    className={`px-3 py-2 rounded border text-left text-sm transition-colors ${form.culturalBackground === bg ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary'}`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Dietary requirements</label>
              <p className="text-xs text-muted-foreground mb-3">Select all that apply. This filters recipe suggestions and nearby alternatives.</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleDiet(opt)}
                    className={`px-3 py-1.5 rounded border text-sm transition-colors ${form.dietaryPreferences.includes(opt) ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card text-foreground hover:border-primary'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: FIES */}
        {step === 5 && (
          <div className="space-y-1">
            <div className="mb-5 p-3 bg-card border border-border rounded">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">FAO Food Insecurity Experience Scale (FIES)</p>
              <p className="text-xs text-muted-foreground">These questions are drawn from a validated FAO instrument used in over 150 countries. Your answers are stored only on your device unless you choose to share.</p>
            </div>
            {FIES_QUESTIONS.map((q, i) => (
              <div key={i} className={`p-4 rounded border transition-colors ${form.fiesAnswers[i] !== null ? 'border-border bg-card' : 'border-border bg-card'}`}>
                <p className="text-sm mb-3 leading-relaxed">{i + 1}. {q}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFIES(i, true)}
                    className={`flex-1 py-2 rounded border text-sm font-medium transition-colors ${form.fiesAnswers[i] === true ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setFIES(i, false)}
                    className={`flex-1 py-2 rounded border text-sm font-medium transition-colors ${form.fiesAnswers[i] === false ? 'bg-secondary text-secondary-foreground border-primary' : 'bg-background border-border hover:border-primary'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
            {answered > 0 && (
              <div className="mt-4 p-3 bg-card border border-border rounded">
                <p className="text-xs font-mono text-muted-foreground">{answered}/8 answered · Score so far: {fiesScore}/8</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Privacy */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="p-4 border border-border rounded bg-card">
                <p className="text-sm font-semibold mb-1">What stays on your device</p>
                <p className="text-sm text-muted-foreground">Everything — your profile, weekly logs, decision entries, FIES score, and headspace inputs. None of it leaves this device unless you explicitly opt in below.</p>
              </div>
              <div className="p-4 border border-border rounded bg-card">
                <p className="text-sm font-semibold mb-1">What the policy layer receives (opt-in only)</p>
                <p className="text-sm text-muted-foreground">Anonymised, suburb-level aggregates. No names, no individual entries — only statistical summaries that councils and health bodies use for service planning. You can change this at any time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border border-border rounded bg-card cursor-pointer" onClick={() => setForm((f) => ({ ...f, privacyDataSharing: !f.privacyDataSharing }))}>
              <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${form.privacyDataSharing ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                {form.privacyDataSharing && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Contribute anonymised data to community research</p>
                <p className="text-xs text-muted-foreground mt-0.5">Helps councils and NGOs understand food stress at the suburb level. Optional and reversible.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-accent border border-accent/30 bg-accent/5 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 rounded border border-border text-sm hover:border-primary transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 px-5 py-2.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {step === STEPS.length ? 'Get started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
