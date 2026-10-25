import { useRef, useState } from 'react';
import { addWeekSwap, appendScore, removeOneWeekSwap, type Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { CravingSearch } from './ui/CravingSearch';
import { BudgetDisclosure } from './ui/BudgetDisclosure';
import { Header } from './ui/Header';
import { PhotoCredits } from './ui/PhotoCredits';
import { NumberScreen } from './ui/NumberScreen';
import { Questionnaire } from './ui/Questionnaire';
import { SupportPanel } from './ui/SupportPanel';
import { homeFor, resolveView, type NavTarget, type View } from './ui/views';
import { WeekCard } from './ui/WeekCard';
import { Welcome } from './ui/Welcome';
import { useFocusOnViewChange } from './ui/useFocusOnViewChange';

/** `now` gives the current ISO time; injected in tests. */
export default function App({ now = () => new Date().toISOString() }: { now?: () => string } = {}) {
  const { profiles } = useServices();
  const [profile, setProfile] = useState<Profile>(() => profiles.load());
  const [requested, setView] = useState<View>(() => (profile.welcomeSeen === true ? homeFor(profile) : 'welcome'));

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

  // The number screen needs a score; without one, fall back to home rather than render an empty page.
  const view = resolveView(requested, profile);
  const main = useRef<HTMLElement>(null);
  useFocusOnViewChange(view, main);

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

        <main ref={main} id="main" tabIndex={-1} className="flex-1 outline-none px-4 py-4">
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

          {view === 'number' && (
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
              <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">Cheaper, healthier swaps for what you crave</h1>
              <p className="text-base text-pretty text-muted">
                Pick a craving and see what costs less and sits better. For anyone in Melbourne, no sign-up.
              </p>
              <CravingSearch profile={profile} onAddToWeek={addToWeek} />
              <BudgetDisclosure value={profile} onChange={update} />
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
