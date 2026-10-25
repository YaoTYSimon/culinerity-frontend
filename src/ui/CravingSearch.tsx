import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { FoodItem, Profile } from '../domain/types';
import { healthScore } from '../domain/swaps/health';
import type { RankedSwap } from '../domain/swaps/rank';
import { swapService } from '../services/swapService';
import { useServices } from '../services/ServicesContext';
import { SwapResults } from './SwapResults';

type Outcome =
  | { kind: 'none' }
  | { kind: 'no-match'; text: string }
  | { kind: 'error' }
  | { kind: 'swaps'; craving: FoodItem; swaps: RankedSwap[]; cravingHealth: number | null };

const pill =
  'min-h-11 rounded border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function CravingSearch({ profile }: { profile: Profile }) {
  const services = useServices();
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' });
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  useEffect(() => () => { latest.current = -1; }, []);

  const popular = services.catalogue.popularCravings();
  // One craving per category, so a miss still gives broad ideas to try.
  const categories = popular.filter((c, i) => popular.findIndex((o) => o.category === c.category) === i);

  async function run(craving: FoodItem) {
    const id = ++latest.current;
    setLoading(true);
    try {
      const [swaps, nutrition] = await Promise.all([
        swapService(services).getSwaps(craving.id, profile),
        Promise.resolve().then(() => services.nutrition.getNutrition(craving.id)).catch(() => null),
      ]);
      if (latest.current !== id) return;
      setLoading(false);
      setOutcome({ kind: 'swaps', craving, swaps, cravingHealth: nutrition ? healthScore(nutrition) : null });
    } catch {
      if (latest.current !== id) return;
      setLoading(false);
      setOutcome({ kind: 'error' });
    }
  }

  function pick(craving: FoodItem) {
    setText(craving.name);
    void run(craving);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q) {
      latest.current++;
      setLoading(false);
      setOutcome({ kind: 'none' });
      return;
    }
    let match: FoodItem | undefined;
    try {
      match = services.catalogue.findCravings(q)[0];
    } catch {
      latest.current++;
      setLoading(false);
      setOutcome({ kind: 'error' });
      return;
    }
    if (!match) {
      latest.current++;
      setLoading(false);
      setOutcome({ kind: 'no-match', text: q });
      return;
    }
    void run(match);
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-4 px-4 py-6">
      <form role="search" className="grid gap-2" onSubmit={submit}>
        <label htmlFor="craving-q" className="sr-only">What are you craving?</label>
        <div className="flex gap-2">
          <input
            id="craving-q" type="search" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="e.g. burger, hot chips, bubble tea"
            className="min-h-11 w-full min-w-0 rounded border border-input bg-card px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded bg-primary px-4 text-sm text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Find swaps
          </button>
        </div>
      </form>

      <section aria-labelledby="popular-h">
        <h2 id="popular-h" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Popular cravings</h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((c) => (
            <button key={c.id} type="button" className={pill} onClick={() => pick(c)}>{c.name}</button>
          ))}
        </div>
      </section>

      <div aria-live="polite" className="grid gap-3">
        {loading && <p className="text-sm text-muted-foreground">Finding swaps…</p>}
        {!loading && outcome.kind === 'error' && (
          <p role="alert" className="rounded border border-accent p-4 text-sm">
            Something went wrong finding swaps. Please try again.
          </p>
        )}
        {!loading && outcome.kind === 'no-match' && (
          <div className="rounded border border-dashed border-border p-4">
            <p className="text-sm">No exact match for “{outcome.text}”. Try a similar kind of food:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" className={pill} onClick={() => pick(c)}>
                  {c.category}: {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!loading && outcome.kind === 'swaps' && (
          <>
            <p className="text-sm">
              {outcome.swaps.length === 0
                ? `No swaps found for ${outcome.craving.name} yet.`
                : `${outcome.swaps.length} ${outcome.swaps.length === 1 ? 'swap' : 'swaps'} for ${outcome.craving.name}`}
            </p>
            {outcome.swaps.length > 0 && <SwapResults swaps={outcome.swaps} cravingHealth={outcome.cravingHealth} />}
          </>
        )}
      </div>
    </div>
  );
}
