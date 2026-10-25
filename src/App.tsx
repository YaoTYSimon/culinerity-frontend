import { useState } from 'react';
import { addWeekSwap, appendScore, removeOneWeekSwap, type Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { CravingSearch } from './ui/CravingSearch';
import { BudgetDisclosure } from './ui/BudgetDisclosure';
import { Header } from './ui/Header';
import { PhotoCredits } from './ui/PhotoCredits';
import { NumberScreen } from './ui/NumberScreen';
import { Questionnaire } from './ui/Questionnaire';
import { SupportPanel } from './ui/SupportPanel';
import type { NavTarget, View } from './ui/views';
import { WeekCard } from './ui/WeekCard';
import { Welcome } from './ui/Welcome';

/** `now` gives the current ISO time; injected in tests. */
export default function App({ now = () => new Date().toISOString() }: { now?: () => string } = {}) {
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
    const at = now();
    update({ ...profile, score, scoreTakenAt: at, scoreHistory: appendScore(profile.scoreHistory, score, at) });
    setView('number');
  };
  const addToWeek = (swap: { itemId: string; name: string; saving: number }) =>
    update({ ...profile, weekSwaps: addWeekSwap(profile.weekSwaps, swap, now()) });
  const go = (to: NavTarget) => setView(to === 'home' ? homeFor(profile) : to);

  const hasScore = typeof profile.score === 'number';

  return (
    <div className="min-h-dvh bg-surface">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-bg">
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
            <SupportPanel suburb={profile.suburb} />
          )}

          {view === 'number' && hasScore && (
            <NumberScreen
              profile={profile}
              onSeeSwaps={() => setView('swaps')}
              onCheckIn={() => setView('checkin')}
              onOpenSupport={() => setView('support')}
              onChange={update}
            />
          )}

          {view === 'week' && (
            <WeekCard
              week={profile.weekSwaps}
              now={now()}
              onRemoveOne={(itemId) => update({ ...profile, weekSwaps: removeOneWeekSwap(profile.weekSwaps, itemId) })}
              onClear={() => update({ ...profile, weekSwaps: [] })}
              onSeeSwaps={() => setView('swaps')}
            />
          )}

          {view === 'swaps' && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
              <h1 className="font-display text-[30px] text-balance">Cheaper, healthier swaps for what you crave</h1>
              <p className="text-base text-pretty text-muted">
                Pick a craving and see what costs less and sits better. For anyone in Melbourne, no sign-up.
              </p>
              <CravingSearch profile={profile} onAddToWeek={addToWeek} />
              <BudgetSection profile={profile} onChange={update} />
            </div>
          )}
        </main>

        <footer className="px-4 pb-6 text-[13px] text-muted">
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
  return <BudgetDisclosure value={profile} onChange={onChange} />;
}
