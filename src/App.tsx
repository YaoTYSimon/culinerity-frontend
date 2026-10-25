import { useState } from 'react';
import { scoreBand, type Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { CravingSearch } from './ui/CravingSearch';
import { FinanceForm } from './ui/FinanceForm';
import { HeroStillLife } from './ui/illustrations';
import { Landing } from './ui/Landing';
import { PhotoCredits } from './ui/PhotoCredits';
import { Questionnaire } from './ui/Questionnaire';
import { ScoreSummary } from './ui/ScoreSummary';
import { SupportPanel } from './ui/SupportPanel';

type View = 'home' | 'checkin' | 'support';

const SUPPORT_BELOW = 40;

const NAV: { view: View; label: string }[] = [
  { view: 'home', label: 'Swaps' },
  { view: 'support', label: 'Food support' },
  { view: 'checkin', label: 'Check-in' },
];

// Layout: one centred 12-column grid (md: 7 + 5 for the hero, 8 + 4 below), a single 16px gutter.
const PAGE = 'mx-auto w-full max-w-[1148px] px-4 md:px-6';

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
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:m-4 focus-visible:rounded focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <header className="border-b border-border">
        <div className={`${PAGE} flex min-h-12 flex-wrap items-center gap-x-6`}>
          <p className="flex items-center gap-2 py-2 text-base font-semibold">
            <span aria-hidden="true" className="size-3 rounded-full bg-primary" />
            Culinerity
          </p>
          {hasScore && (
            <span
              role="img"
              aria-label={`Score ${profile.score} out of 100, ${scoreBand(profile.score as number)}. 100 = secure, 0 = critical.`}
              className="order-2 ml-auto rounded-sm bg-card px-2 py-1 text-xs font-medium md:order-3"
            >
              <span aria-hidden="true">{`${profile.score} · ${scoreBand(profile.score as number)}`}</span>
            </span>
          )}
          <nav aria-label="Main" className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 md:order-2 md:mx-0 md:w-auto md:px-0">
            <ul className="flex gap-4">
              {NAV.map(({ view: v, label }) => (
                <li key={v}>
                  <button
                    type="button"
                    aria-current={view === v ? 'page' : undefined}
                    onClick={() => setView(v)}
                    className="-mb-px min-h-11 whitespace-nowrap border-b-2 border-transparent px-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 aria-[current=page]:border-primary aria-[current=page]:text-foreground md:min-h-12"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className={`${PAGE} flex-1 py-6 md:py-8`}>
        {view === 'checkin' && (
          <div className="mx-auto max-w-2xl">
            <h1 className="sr-only">Food and money check-in</h1>
            <Questionnaire onComplete={complete} onSkip={() => setView('home')} />
          </div>
        )}

        {view === 'support' && (
          <div className="mx-auto grid max-w-2xl gap-4">
            <h1 className="text-2xl font-semibold text-balance">Food support</h1>
            <SupportPanel suburb={profile.suburb} />
          </div>
        )}

        {view === 'home' && (
          <div className="grid gap-4 md:grid-cols-12 md:grid-rows-[auto_auto_1fr_auto]">
            <div className="order-1 grid content-start gap-2 md:col-span-5 md:col-start-8 md:row-start-1">
              <h1 className="font-display text-[28px] leading-9 text-balance md:text-2xl md:leading-8 lg:text-[32px] lg:leading-10">
                Cheaper, healthier swaps for what you crave
              </h1>
              <p className="text-base text-pretty text-muted-foreground">
                Pick a craving and see what costs less and sits better. For anyone in Melbourne, no sign-up.
              </p>
            </div>
            <div className="relative order-2 h-[300px] overflow-hidden rounded-card bg-card md:col-span-7 md:col-start-1 md:row-span-3 md:row-start-1 md:h-auto md:min-h-[360px]">
              <HeroStillLife className="size-full md:absolute md:inset-0" />
            </div>
            <CravingSearch profile={profile} />
            {/* Below md the banner and score sit in the page flow (banner above the cravings); from md they fill the column under the search. */}
            {!hasScore && !promptDismissed && (
              <div className="order-4 md:order-none md:col-span-5 md:col-start-8 md:row-start-3 md:self-start">
                <Landing onStart={() => setView('checkin')} onDismiss={() => setPromptDismissed(true)} />
              </div>
            )}
            {hasScore && (
              <div className="order-6 md:order-none md:col-span-5 md:col-start-8 md:row-start-3 md:self-start">
                <ScoreSummary score={profile.score as number} takenAt={profile.scoreTakenAt} />
              </div>
            )}
            <div className="contents md:col-span-5 md:col-start-8 md:row-start-4 md:grid md:content-start md:gap-4">
              {needsSupport && (
                <div className="order-6 md:order-none">
                  <SupportPanel suburb={profile.suburb} />
                </div>
              )}
              <section aria-labelledby="week-h" className="order-7 grid gap-3 rounded-card bg-card p-4 md:order-none">
                <h2 id="week-h" className="text-base font-semibold">Your week</h2>
                <FinanceForm value={profile} onChange={update} />
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className={`${PAGE} pb-6 text-xs text-muted-foreground`}>
        Culinerity is not medical advice. Prices and places shown are sample data. Swap ideas are drawn, not photographed.
        <PhotoCredits />
      </footer>
    </div>
  );
}
