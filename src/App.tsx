import { useState } from 'react';
import { appendScore, bandHeadline, SUPPORT_BELOW, type Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { CravingSearch } from './ui/CravingSearch';
import { FinanceForm } from './ui/FinanceForm';
import { Header } from './ui/Header';
import { PhotoCredits } from './ui/PhotoCredits';
import { Plate } from './ui/Plate';
import { Questionnaire } from './ui/Questionnaire';
import { SupportPanel } from './ui/SupportPanel';
import type { NavTarget, View } from './ui/views';
import { Welcome } from './ui/Welcome';

export default function App() {
  const { profiles } = useServices();
  const [profile, setProfile] = useState<Profile>(() => profiles.load());
  const [view, setView] = useState<View>(() => (profile.welcomeSeen === true ? homeFor(profile) : 'welcome'));

  const update = (next: Profile) => {
    setProfile(next);
    profiles.save(next);
  };
  const markWelcomeSeen = () => {
    if (profile.welcomeSeen !== true) update({ ...profile, welcomeSeen: true });
  };
  const complete = (score: number) => {
    const at = new Date().toISOString();
    update({ ...profile, score, scoreTakenAt: at, scoreHistory: appendScore(profile.scoreHistory, score, at) });
    setView('number');
  };
  const go = (to: NavTarget) => setView(to === 'home' ? homeFor(profile) : to);

  const hasScore = typeof profile.score === 'number';
  const needsSupport = hasScore && (profile.score as number) < SUPPORT_BELOW;

  return (
    <div className="min-h-full bg-surface">
      <div className="relative mx-auto flex min-h-full w-full max-w-[520px] flex-col bg-bg">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:m-4 focus-visible:rounded-full focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-accent-ink focus-ring"
        >
          Skip to main content
        </a>
        <Header view={view} onNavigate={go} />

        <main id="main" className="flex-1 px-4 py-4">
          {view === 'welcome' && (
            <Welcome
              onFindNumber={() => {
                markWelcomeSeen();
                setView('checkin');
              }}
              onSkip={() => {
                markWelcomeSeen();
                setView('swaps');
              }}
            />
          )}

          {view === 'checkin' && (
            <Questionnaire onComplete={complete} onSkip={() => setView(homeFor(profile))} />
          )}

          {view === 'support' && (
            <div className="grid gap-4">
              <h1 className="font-display text-[30px] text-balance">Free food near you.</h1>
              <SupportPanel suburb={profile.suburb} />
            </div>
          )}

          {/* Stub until the number screen (Task 6). */}
          {view === 'number' && hasScore && (
            <div className="grid gap-4">
              <h1 className="font-display text-[30px] text-balance">{bandHeadline(profile.score as number)}</h1>
              <Plate score={profile.score as number} className="mx-auto" />
              {needsSupport && <SupportPanel suburb={profile.suburb} />}
              <BudgetSection profile={profile} onChange={update} />
            </div>
          )}

          {/* Stub until the shareable week card (Task 9). */}
          {view === 'week' && (
            <div className="grid gap-4">
              <h1 className="font-display text-[30px] text-balance">My week</h1>
              <p className="text-base text-muted">Swaps you add to your week will show up here.</p>
            </div>
          )}

          {view === 'swaps' && (
            <div className="grid gap-4">
              <h1 className="font-display text-[30px] text-balance">Cheaper, healthier swaps for what you crave</h1>
              <p className="text-base text-pretty text-muted">
                Pick a craving and see what costs less and sits better. For anyone in Melbourne, no sign-up.
              </p>
              <CravingSearch profile={profile} />
              <BudgetSection profile={profile} onChange={update} />
            </div>
          )}
        </main>

        <footer className="px-4 pb-6 text-xs text-muted">
          Culinerity is not medical advice. Prices and places shown are sample data. Swap ideas are drawn; craving photos are credited below.
          <PhotoCredits />
        </footer>
      </div>
    </div>
  );
}

/** Home is the number once there is a score, otherwise the swap search. */
function homeFor(profile: Profile): View {
  return typeof profile.score === 'number' ? 'number' : 'swaps';
}

function BudgetSection({ profile, onChange }: { profile: Profile; onChange: (next: Profile) => void }) {
  return (
    <section aria-labelledby="budget-h" className="grid gap-3 rounded-card bg-card p-4">
      <h2 id="budget-h" className="text-base font-semibold">Your budget</h2>
      <FinanceForm value={profile} onChange={onChange} />
    </section>
  );
}
