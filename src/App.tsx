import { Suspense, useContext, useRef, useState } from 'react';
import { addWeekSwap, appendScore, calendar, dismissOccasion, occasionsOn, removeOneWeekSwap, sanitizeMeals, sanitizeTradeoffs, type CulturalMeal, type FoodProfile, type Profile } from '@culinerity/core';
import { useServices } from './services/ServicesContext';
import { RemoveNoteBanner } from './auth/RemoveNoteBanner';
import { AuthContext } from './auth/useAuth';
import { CravingSearch } from './ui/CravingSearch';
import { BudgetDisclosure } from './ui/BudgetDisclosure';
import { CreateProfile } from './ui/CreateProfile';
import { Greeting } from './ui/Greeting';
import { Header } from './ui/Header';
import { MealsView } from './ui/MealsView';
import { MyFood } from './ui/MyFood';
import { PillButton } from './ui/PillButton';
import { HebcalCredit } from './ui/HebcalCredit';
import { NutritionCredit } from './ui/NutritionCredit';
import { PhotoCredits } from './ui/PhotoCredits';
import { OccasionLine } from './ui/OccasionLine';
import { NumberScreen } from './ui/NumberScreen';
import { Questionnaire } from './ui/Questionnaire';
import { SupportPanel } from './ui/SupportPanel';
import { homeFor, resolveView, type NavTarget, type View } from './ui/views';
import { WeekCard } from './ui/WeekCard';
import { Welcome } from './ui/Welcome';
import { LoadingText } from './ui/LoadingText';
import { LazyErrorBoundary } from './ui/LazyErrorBoundary';
import { lazyWithRetry } from './ui/lazyWithRetry';
import { useFocusOnViewChange } from './ui/useFocusOnViewChange';

// Heavy views that are never the first screen load on demand as same-origin static chunks.
const BudgetView = lazyWithRetry(() => import('./ui/BudgetView').then((m) => ({ default: m.BudgetView })));
const CookView = lazyWithRetry(() => import('./ui/CookView').then((m) => ({ default: m.CookView })));
const PantryView = lazyWithRetry(() => import('./ui/PantryView').then((m) => ({ default: m.PantryView })));
const TradeoffsView = lazyWithRetry(() => import('./ui/TradeoffsView').then((m) => ({ default: m.TradeoffsView })));
const WhatIfView = lazyWithRetry(() => import('./ui/WhatIfView').then((m) => ({ default: m.WhatIfView })));
const FoodSafetyView = lazyWithRetry(() => import('./ui/FoodSafetyView').then((m) => ({ default: m.FoodSafetyView })));
const PolicyView = lazyWithRetry(() => import('./ui/PolicyView').then((m) => ({ default: m.PolicyView })));
const Nearby = lazyWithRetry(() => import('./ui/Nearby').then((m) => ({ default: m.Nearby })));
import { useNow } from './ui/useNow';

/** The profile with one optional field set, or with the key removed when there is nothing to keep. */
function withOptional<K extends 'foodProfile' | 'culturalMeals' | 'tradeoffs'>(profile: Profile, key: K, value: Profile[K] | undefined): Profile {
  const { [key]: _dropped, ...rest } = profile;
  return value === undefined ? rest : { ...rest, [key]: value };
}

/** The loaded profile with entries older than the retention period dropped, or the same object when nothing was old. */
function prune(profile: Profile, now: Date): Profile {
  return pruneTradeoffs(pruneMeals(profile, now), now);
}

function pruneMeals(profile: Profile, now: Date): Profile {
  if (!profile.culturalMeals) return profile;
  const kept = sanitizeMeals(profile.culturalMeals, now);
  if (kept.length === profile.culturalMeals.length) return profile;
  return withOptional(profile, 'culturalMeals', kept.length > 0 ? kept : undefined);
}

function pruneTradeoffs(profile: Profile, now: Date): Profile {
  if (!profile.tradeoffs) return profile;
  const kept = sanitizeTradeoffs(profile.tradeoffs, now);
  if (kept.length === profile.tradeoffs.length) return profile;
  return withOptional(profile, 'tradeoffs', kept.length > 0 ? kept : undefined);
}

/** `now` gives the current ISO time; injected in tests. */
export default function App({ now = () => new Date().toISOString() }: { now?: () => string } = {}) {
  const { profiles } = useServices();
  const auth = useContext(AuthContext);
  const clockNow = useNow(now);
  const [profile, setProfile] = useState<Profile>(() => {
    const loaded = profiles.load();
    const pruned = prune(loaded, new Date(now()));
    if (pruned !== loaded) profiles.save(pruned);
    return pruned;
  });
  // A guest making a profile from the header: shown in place of the page, so there is still one h1.
  const [creating, setCreating] = useState(false);
  // Welcome's food button opens the setup even if settings exist; any other navigation resets it.
  const [foodWizard, setFoodWizard] = useState(false);
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
  const food = profile.foodProfile;
  const activeOccasion = food ? occasionsOn(calendar(), food.occasions, food.dismissed, clockNow)[0] : undefined;
  const go = (to: NavTarget) => {
    setCreating(false);
    setFoodWizard(false);
    setView(to === 'home' ? homeFor(profile) : to);
  };

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
        <Header view={view} onNavigate={go} onCreateProfile={() => setCreating(true)} />
        {/* A delete that left data behind and signed the person out of their last profile lands here. */}
        {auth && auth.current === null && auth.removeNotice && (
          <div className="px-4 pb-2">
            <RemoveNoteBanner />
          </div>
        )}

        <main ref={main} id="main" tabIndex={-1} className="flex-1 outline-none px-4 py-4">
          <LazyErrorBoundary resetKey={view}>
          <Suspense fallback={<LoadingText />}>
          {creating && <CreateProfile onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

          {!creating && view === 'welcome' && (
            <Welcome
              onFindNumber={() => {
                markWelcomeSeen();
                setView('checkin');
              }}
              onSkip={() => {
                markWelcomeSeen();
                setView('swaps');
              }}
              onFood={() => {
                markWelcomeSeen();
                setFoodWizard(true);
                setView('food');
              }}
            />
          )}

          {!creating && view === 'food' && (
            <MyFood
              key={auth?.current?.id ?? 'guest'}
              value={profile.foodProfile}
              now={clockNow}
              startAtWizard={foodWizard}
              onSave={(foodProfile: FoodProfile | undefined) => update(withOptional(profile, 'foodProfile', foodProfile))}
              onClear={() => update(withOptional(profile, 'foodProfile', undefined))}
              meals={profile.culturalMeals}
              onSaveMeals={(meals: CulturalMeal[] | undefined) => update(withOptional(profile, 'culturalMeals', meals))}
              onOpenMeals={() => go('meals')}
              onDone={() => {
                setFoodWizard(false);
                setView('swaps');
              }}
            />
          )}

          {!creating && view === 'meals' && (
            <MealsView
              key={auth?.current?.id ?? 'guest'}
              meals={profile.culturalMeals}
              traditions={profile.foodProfile?.traditions ?? []}
              now={clockNow}
              clock={() => new Date(now())}
              onChange={(meals) => update(withOptional(profile, 'culturalMeals', meals.length > 0 ? meals : undefined))}
              onSetUpFood={() => {
                setFoodWizard(true);
                setView('food');
              }}
            />
          )}

          {!creating && view === 'pantry' && (
            <PantryView key={auth?.current?.id ?? 'guest'} profile={profile} onProfile={update} now={clockNow} onNavigate={go} />
          )}

          {!creating && view === 'cook' && (
            <CookView key={auth?.current?.id ?? 'guest'} profile={profile} onProfile={update} now={clockNow} onNavigate={go} />
          )}

          {!creating && view === 'tradeoffs' && (
            <TradeoffsView
              key={auth?.current?.id ?? 'guest'}
              entries={profile.tradeoffs}
              now={clockNow}
              clock={() => new Date(now())}
              onChange={(next) => update(withOptional(profile, 'tradeoffs', next.length > 0 ? next : undefined))}
              onOpenBudget={() => go('budget')}
              onOpenSupport={() => go('support')}
            />
          )}

          {!creating && view === 'checkin' && (
            <Questionnaire onComplete={complete} onSkip={() => setView(homeFor(profile))} />
          )}

          {!creating && view === 'budget' && (
            <BudgetView
              profile={profile}
              profileId={auth?.current?.id}
              now={clockNow}
              clock={() => new Date(now())}
              onChange={update}
              onSeeSwaps={() => setView('swaps')}
              onOpenWeek={() => setView('week')}
              onOpenWhatIf={() => setView('whatif')}
            />
          )}

          {!creating && view === 'whatif' && (
            <WhatIfView
              profile={profile}
              profileId={auth?.current?.id}
              now={clockNow}
              clock={() => new Date(now())}
              onChange={update}
              onSeeSwaps={() => setView('swaps')}
              onOpenBudget={() => setView('budget')}
              onOpenSupport={() => setView('support')}
              onOpenNearby={() => setView('nearby')}
            />
          )}

          {!creating && view === 'foodsafety' && <FoodSafetyView />}

          {!creating && view === 'policy' && <PolicyView now={clockNow} />}

          {!creating && view === 'support' && (
            <SupportPanel suburb={profile.suburb} />
          )}

          {!creating && view === 'nearby' && <Nearby score={profile.score} profileSuburb={profile.suburb} onNavigate={setView} />}

          {!creating && view === 'number' && (
            <div className="grid gap-3">
            <Greeting />
            <NumberScreen
              profile={profile}
              onSeeSwaps={() => setView('swaps')}
              onCheckIn={() => setView('checkin')}
              onOpenSupport={() => setView('support')}
              onOpenBudget={() => setView('budget')}
              onChange={update}
            />
            </div>
          )}

          {!creating && view === 'week' && (
            <WeekCard
              week={profile.weekSwaps}
              now={now()}
              onRemoveOne={(itemId) => update({ ...profile, weekSwaps: removeOneWeekSwap(profile.weekSwaps, itemId) })}
              onClear={() => update({ ...profile, weekSwaps: [] })}
              onSeeSwaps={() => setView('swaps')}
              onOpenMeals={() => setView('meals')}
            />
          )}

          {!creating && view === 'swaps' && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
              <Greeting />
              <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none">Cheaper, healthier swaps for what you crave</h1>
              <p className="text-base text-pretty text-muted">
                Pick a craving and see what costs less and sits better. For anyone in Melbourne, no sign-up.
              </p>
              <OccasionLine
                active={activeOccasion}
                onSeeSwaps={() => document.getElementById('craving-q')?.focus()}
                onBudget={() => setView('budget')}
                onDismiss={(key) => food && update(withOptional(profile, 'foodProfile', dismissOccasion(food, key, clockNow)))}
              />
              <CravingSearch profile={profile} onAddToWeek={addToWeek} onChangeFoodRules={() => setView('food')} />
              <BudgetDisclosure value={profile} onChange={update} />
            </div>
          )}
          </Suspense>
          </LazyErrorBoundary>
        </main>

        <footer className="px-4 pb-6 text-[13px] text-muted">
          Culinerity is not medical advice. Prices and places shown are sample data. Swap ideas are drawn; photos are credited below.
          <PhotoCredits />
          <NutritionCredit />
          <HebcalCredit />
          <PillButton variant="text" onClick={() => go('policy')} className="-ml-3 mt-2">
            Data and policy
          </PillButton>
        </footer>
      </div>
    </div>
  );
}
