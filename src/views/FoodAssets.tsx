import { useState } from 'react';
import type { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
}

type AssetType = 'all' | 'market' | 'fridge' | 'rescue' | 'relief' | 'restaurant';

const ASSET_CATEGORIES = [
  {
    type: 'market' as const,
    label: 'Farmers markets',
    description: 'Weekly or fortnightly fresh produce markets. Typically 20–40% cheaper than supermarkets for in-season produce.',
    sources: ['Local council open data', 'AUSVEG market locator'],
    frequency: 'Weekly or fortnightly',
  },
  {
    type: 'fridge' as const,
    label: 'Community fridges',
    description: 'Public refrigerators where anyone can take food, no questions asked. Run by community groups — identical access to paid food options.',
    sources: ['Community Fridge Australia network', 'Local council listings'],
    frequency: 'Always open',
  },
  {
    type: 'rescue' as const,
    label: 'Rescued produce boxes',
    description: 'Surplus or cosmetically imperfect produce sold at 50–80% below retail. OzHarvest, Yume Food, Imperfect Picks, and local farms.',
    sources: ['OzHarvest', 'Yume Food platform', 'Too Good To Go'],
    frequency: 'Variable — sign up for alerts',
  },
  {
    type: 'relief' as const,
    label: 'Food relief services',
    description: 'Food banks, pantries, community meals, and emergency food parcels. No means testing required at most sites — open to anyone experiencing hardship.',
    sources: ['Foodbank Australia', 'Salvation Army', 'St Vincent de Paul', 'SecondBite'],
    frequency: 'Varies by site',
  },
  {
    type: 'restaurant' as const,
    label: 'Family-run restaurants',
    description: 'Independent, family-owned eateries with no franchise margin. Often 20–40% cheaper than branded equivalents, and more culturally relevant.',
    sources: ['Local knowledge', 'Google Maps independent filter'],
    frequency: 'Regular trading hours',
  },
];

export default function FoodAssets({ profile }: Props) {
  const [filter, setFilter] = useState<AssetType>('all');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [searchRadius, setSearchRadius] = useState(5);

  function requestLocation() {
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('granted'),
      () => setLocationStatus('denied'),
      { timeout: 8000 }
    );
  }

  const displayed = filter === 'all' ? ASSET_CATEGORIES : ASSET_CATEGORIES.filter((a) => a.type === filter);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Local Food Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Markets, community fridges, rescue produce, food relief, and local restaurants — all presented the same way
        </p>
      </div>

      <div className="mb-5 p-4 bg-card border border-border rounded">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Anti-stigma design note</p>
        <p className="text-sm text-muted-foreground">
          Every category here has the same visual weight. Accessing a community fridge or food relief is a practical decision, not a marker of failure — this interface treats it that way.
        </p>
      </div>

      {/* Location */}
      <div className="bg-card border border-border rounded p-4 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Location-aware search</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locationStatus === 'granted'
                ? 'Using your current location'
                : locationStatus === 'denied'
                ? `Using postcode ${profile.postcode}`
                : `Will search near postcode ${profile.postcode}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Radius (km)</label>
              <input
                type="number" min={1} max={50}
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value) || 5)}
                className="w-16 border border-border rounded px-2 py-1 bg-background text-sm focus:outline-none"
              />
            </div>
            {locationStatus !== 'granted' && (
              <button
                onClick={requestLocation}
                className="px-3 py-1.5 border border-primary text-primary text-sm rounded hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {locationStatus === 'requesting' ? 'Requesting...' : 'Share location'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {([
          { value: 'all', label: 'All types' },
          { value: 'market', label: 'Markets' },
          { value: 'fridge', label: 'Community fridges' },
          { value: 'rescue', label: 'Rescued produce' },
          { value: 'relief', label: 'Food relief' },
          { value: 'restaurant', label: 'Family restaurants' },
        ] as { value: AssetType; label: string }[]).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded border text-sm transition-colors ${filter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Asset cards — same visual weight, no hierarchy */}
      <div className="space-y-3">
        {displayed.map((asset) => (
          <div key={asset.type} className="border border-border rounded p-5 bg-card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-base font-semibold">{asset.label}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{asset.frequency}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono border border-border rounded px-2 py-1 text-muted-foreground">
                  {profile.postcode} area
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{asset.description}</p>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Find via</p>
              <div className="flex flex-wrap gap-2">
                {asset.sources.map((s) => (
                  <span key={s} className="text-xs border border-border rounded px-2 py-1 bg-background">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 border border-dashed border-border rounded">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Data sources</p>
        <p className="text-sm text-muted-foreground">
          In production, this connects to Foodbank Australia's API, OzHarvest's location service, local council open data feeds, and the Community Fridge Australia network. Location data is used only for proximity search and is not stored.
        </p>
      </div>
    </div>
  );
}
