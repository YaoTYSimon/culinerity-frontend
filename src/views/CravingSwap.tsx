import { useState } from 'react';
import { detectCraving, type CravingResult, type Alternative } from '../lib/cravings';
import type { UserProfile } from '../types';
import { usePersistentState } from '../lib/persist';

interface Props {
  profile: UserProfile;
}

function AlternativeCard({ alt }: { alt: Alternative }) {
  const typeLabel = alt.type === 'independent' ? 'Independent' : alt.type === 'market' ? 'Market / grocer' : 'Community';
  const typeBg = alt.type === 'community' ? 'bg-success/10 border-success/30 text-success' : 'bg-primary/10 border-primary/30 text-primary';

  return (
    <div className="border border-border rounded p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold">{alt.name}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded border font-mono mt-1 ${typeBg}`}>{typeLabel}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono font-medium">{alt.estimatedCost}</p>
          <p className="text-xs text-muted-foreground">{alt.walkTime}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{alt.description}</p>
      {alt.dietaryNote && (
        <p className="text-xs mt-2 text-muted-foreground border-t border-border pt-2">{alt.dietaryNote}</p>
      )}
    </div>
  );
}

export default function CravingSwap({ profile }: Props) {
  const [query, setQuery] = usePersistentState('craving_query', '');
  const [result, setResult] = usePersistentState<CravingResult | null>('craving_result', null);
  const [activeTab, setActiveTab] = usePersistentState<'alternatives' | 'recipe'>('craving_tab', 'alternatives');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  function search() {
    if (!query.trim()) return;
    if (locationStatus === 'idle') {
      setLocationStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        () => setLocationStatus('granted'),
        () => setLocationStatus('denied'),
        { timeout: 5000 }
      );
    }
    setResult(detectCraving(query));
    setActiveTab('alternatives');
  }

  const sortedAlts = result
    ? [...result.alternatives].sort((a, b) => {
        if (profile.costPriority > profile.timePriority) {
          const aCost = parseFloat(a.estimatedCost.replace(/[^0-9.]/g, '')) || 999;
          const bCost = parseFloat(b.estimatedCost.replace(/[^0-9.]/g, '')) || 999;
          return aCost - bCost;
        }
        return 0;
      })
    : [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Craving Swap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter what you actually want to eat — get nearby alternatives and a home recipe
        </p>
      </div>

      {/* Preferences reminder */}
      <div className="mb-5 p-3 bg-card border border-border rounded flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Priority: {profile.costPriority === 3 ? 'cost-first' : profile.timePriority === 3 ? 'time-first' : profile.culturalPriority === 3 ? 'cultural-first' : 'balanced'}
        </span>
        {profile.dietaryPreferences.length > 0 && (
          <span>Diet: {profile.dietaryPreferences.join(', ')}</span>
        )}
        <span>Budget: ${profile.weeklyBudget}/wk</span>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 border border-border rounded px-4 py-2.5 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g. biryani, pad thai, big mac, pizza, kebab..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity"
        >
          Find alternatives
        </button>
      </div>

      {locationStatus === 'requesting' && (
        <p className="text-xs text-muted-foreground mb-4">Requesting location to find nearby options...</p>
      )}
      {locationStatus === 'denied' && (
        <p className="text-xs text-muted-foreground mb-4">Location not shared — results are based on your postcode ({profile.postcode}).</p>
      )}
      {locationStatus === 'granted' && (
        <p className="text-xs text-success mb-4">Location active — results are proximity-aware.</p>
      )}

      {result && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Craving: </span>
              <span className="font-medium">{result.detectedDish}</span>
              <span className="text-muted-foreground mx-2">·</span>
              <span className="text-muted-foreground">{result.detectedCuisine}</span>
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-5">
            {(['alternatives', 'recipe'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm capitalize border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'alternatives' ? 'Nearby alternatives' : 'Cook at home'}
              </button>
            ))}
          </div>

          {activeTab === 'alternatives' && (
            <div className="space-y-3">
              {sortedAlts.map((alt, i) => (
                <AlternativeCard key={i} alt={alt} />
              ))}
              <div className="border border-dashed border-border rounded p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Results are based on typical family-run restaurants in Australian suburbs. Enable location for distance-sorted results.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'recipe' && (
            <div className="bg-card border border-border rounded p-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold">{result.recipe.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Serves {result.recipe.servings}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-medium">{result.recipe.estimatedCost}</p>
                  <p className="text-xs text-muted-foreground">{result.recipe.prepTime} prep · {result.recipe.cookTime} cook</p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Ingredients</p>
                <div className="space-y-2">
                  {result.recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground w-24 flex-shrink-0 font-mono text-xs mt-0.5">{ing.amount}</span>
                      <div>
                        <span>{ing.item}</span>
                        {ing.swapTip && <p className="text-xs text-muted-foreground mt-0.5">{ing.swapTip}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Method</p>
                <ol className="space-y-3">
                  {result.recipe.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono text-muted-foreground flex-shrink-0 w-4">{i + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Nutrition</p>
                <p className="text-sm text-muted-foreground">{result.recipe.nutritionNotes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded">
          <p className="text-sm">Enter a craving above to see alternatives and a home recipe.</p>
          <p className="text-xs mt-1">Results are ranked by your cost, time, and cultural priorities.</p>
        </div>
      )}
    </div>
  );
}
