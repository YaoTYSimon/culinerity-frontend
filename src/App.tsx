import { useState } from 'react';
import type { UserProfile, NavView } from './types';
import { storage } from './lib/storage';
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

type AppStage = 'landing' | 'onboarding' | 'app';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => storage.getProfile());
  const [stage, setStage] = useState<AppStage>(() =>
    storage.getProfile()?.onboardingComplete ? 'app' : 'landing'
  );
  const [view, setView] = useState<NavView>('dashboard');
  const [headspaceScore, setHeadspaceScore] = useState<number | null>(() => {
    const entries = storage.getHeadspace();
    return entries[0]?.score ?? null;
  });

  function handleOnboardingComplete(p: UserProfile) {
    setProfile(p);
    setStage('app');
  }

  if (stage === 'landing') {
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
      />

      <main className="flex-1 ml-52 min-h-full overflow-y-auto">
        <div className="px-8 py-8 max-w-4xl">
          {view === 'dashboard' && (
            <Dashboard
              profile={profile}
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
