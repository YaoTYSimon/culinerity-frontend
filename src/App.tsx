import { useEffect, useState } from 'react';
import type { UserProfile, NavView } from './types';
import { storage } from './lib/storage';
import { getFreeScore } from './lib/headspace';
import { applyFruit, DEFAULT_FRUIT, FRUIT_STORAGE_KEY, isFruitId, type FruitId } from './lib/fruits';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import WeeklyBalance from './views/WeeklyBalance';
import DecisionFriction from './views/DecisionFriction';
import CravingSwap from './views/CravingSwap';
import FoodAssets from './views/FoodAssets';
import BudgetSimulator from './views/BudgetSimulator';
import Pantry from './views/Pantry';
import HalfPrice from './views/HalfPrice';
import CulturalStaples from './views/CulturalStaples';
import PolicyDashboard from './views/PolicyDashboard';
import { usePersistentState } from './lib/persist';

type AppStage = 'landing' | 'onboarding' | 'app';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => storage.getProfile());
  const [stage, setStage] = usePersistentState<AppStage>('stage', 'landing');
  const [view, setView] = usePersistentState<NavView>('view', 'dashboard');
  const [headspaceScore, setHeadspaceScore] = useState<number | null>(() => {
    const latest = storage.getHeadspace()[0];
    return latest ? getFreeScore(latest) : null;
  });
  const [storedFruit, setFruit] = usePersistentState<FruitId>(FRUIT_STORAGE_KEY, DEFAULT_FRUIT);
  const fruit = isFruitId(storedFruit) ? storedFruit : DEFAULT_FRUIT;

  useEffect(() => applyFruit(fruit), [fruit]);

  function handleOnboardingComplete(p: UserProfile) {
    setProfile(p);
    setStage('app');
  }

  if (stage === 'landing' && !profile?.onboardingComplete) {
    return <Landing onGetStarted={() => setStage('onboarding')} />;
  }

  if (stage === 'onboarding' || !profile?.onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-full bg-background">
      <Sidebar
        current={view}
        onChange={setView}
        profileName={profile.name}
        score={headspaceScore}
        fruit={fruit}
        onFruitChange={setFruit}
      />

      <main className="flex-1 ml-60 min-h-full overflow-y-auto">
        <div className="px-8 py-8 max-w-4xl">
          {view === 'dashboard' && (
            <Dashboard
              profile={profile}
              fruit={fruit}
              onScoreUpdate={(score) => setHeadspaceScore(score)}
            />
          )}
          {view === 'weekly' && <WeeklyBalance profile={profile} />}
          {view === 'friction' && <DecisionFriction />}
          {view === 'craving' && <CravingSwap profile={profile} />}
          {view === 'assets' && <FoodAssets profile={profile} />}
          {view === 'simulator' && <BudgetSimulator profile={profile} />}
          {view === 'pantry' && <Pantry profile={profile} />}
          {view === 'halfprice' && <HalfPrice />}
          {view === 'staples' && <CulturalStaples profile={profile} />}
          {view === 'policy' && <PolicyDashboard profile={profile} />}
        </div>
      </main>
    </div>
  );
}
