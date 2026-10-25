import { useState } from 'react';
import type { Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { CravingSearch } from './ui/CravingSearch';
import { FinanceForm } from './ui/FinanceForm';
import { Landing } from './ui/Landing';
import { Questionnaire } from './ui/Questionnaire';
import { ScoreSummary } from './ui/ScoreSummary';
import { SupportPanel } from './ui/SupportPanel';

type View = 'home' | 'checkin' | 'support';

const SUPPORT_BELOW = 40;

const NAV: { view: View; label: string }[] = [
  { view: 'home', label: 'Home' },
  { view: 'support', label: 'Food support' },
  { view: 'checkin', label: 'Check-in' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-lg font-semibold text-balance">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const { profiles } = useServices();
  const [profile, setProfile] = useState<Profile>(() => profiles.load());
  const [view, setView] = useState<View>('home');
  const [promptDismissed, setPromptDismissed] = useState(false);

  const update = (next: Profile) => {
    setProfile(next);
    profiles.save(next);
  };
  const complete = (score: number) => {
    update({ ...profile, score, scoreTakenAt: new Date().toISOString() });
    setView('home');
  };

  const hasScore = typeof profile.score === 'number';
  const needsSupport = hasScore && (profile.score as number) < SUPPORT_BELOW;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:m-4 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <header className="grid gap-2 px-4 pt-4">
        <p className="font-display text-xl text-primary">Culinerity</p>
        <nav aria-label="Main">
          <ul className="grid grid-cols-3 gap-2">
            {NAV.map(({ view: v, label }) => (
              <li key={v} className="grid">
                <button
                  type="button"
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => setView(v)}
                  className="min-h-11 rounded-md border border-border bg-card px-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="grid flex-1 content-start gap-6 px-4 py-6">
        {view === 'checkin' && (
          <>
            <h1 className="sr-only">Food and money check-in</h1>
            <Questionnaire onComplete={complete} onSkip={() => setView('home')} />
          </>
        )}

        {view === 'support' && (
          <>
            <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] text-balance">Food support</h1>
            <SupportPanel suburb={profile.suburb} />
          </>
        )}

        {view === 'home' && (
          <>
            {(hasScore || promptDismissed) && (
              <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] text-balance">Cheaper, healthier swaps for what you crave</h1>
            )}
            {hasScore ? (
              <ScoreSummary score={profile.score as number} takenAt={profile.scoreTakenAt} />
            ) : (
              !promptDismissed && <Landing onStart={() => setView('checkin')} onDismiss={() => setPromptDismissed(true)} />
            )}
            <Section id="swap-h" title="What are you craving?">
              <CravingSearch profile={profile} />
            </Section>
            {needsSupport && <SupportPanel suburb={profile.suburb} />}
            <Section id="money-h" title="Your budget">
              <FinanceForm value={profile} onChange={update} />
            </Section>
          </>
        )}
      </main>

      <footer className="px-4 pb-6 text-xs text-muted-foreground">
        Culinerity is not medical advice. Prices and places shown are sample data.
      </footer>
    </div>
  );
}
