import { useEffect, useRef, useState, type FormEvent } from 'react';
import { type FoodItem, type Profile, type RankedSwap, swapService } from '@culinerity/core';
import { photoFor } from '../assets/photos';
import { useCatalogueStatus, useServices } from '../services/ServicesContext';
import { SwapResults } from './SwapResults';
import { CravingPicture } from './CravingPicture';

type Outcome =
  | { kind: 'none' }
  | { kind: 'no-match'; text: string }
  | { kind: 'error' }
  | { kind: 'swaps'; craving: FoodItem; swaps: RankedSwap[]; cravingHealth: number | null; cravingCost: number | null };

const tile =
  'flex min-h-11 flex-col items-stretch gap-2 rounded-card bg-card p-2 text-center text-sm text-foreground hover:bg-legacy-muted focus-ring motion-colors sm:p-3';
const chip =
  'flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded bg-card pl-1.5 pr-3 text-sm text-foreground hover:bg-legacy-muted focus-ring motion-colors';

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

function SkeletonRows() {
  return (
    <div aria-hidden="true" className="grid gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid h-24 gap-3 rounded-card bg-card p-4 motion-safe:animate-pulse">
          <div className="h-4 w-1/2 rounded-sm bg-legacy-muted" />
          <div className="h-3 w-3/4 rounded-sm bg-legacy-muted" />
        </div>
      ))}
    </div>
  );
}

export function CravingSearch({ profile }: { profile: Profile }) {
  const services = useServices();
  const catalogue = useCatalogueStatus();
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' });
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { latest.current = -1; }, []);

  // Keyboard-first: "/" jumps to the search unless the person is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const popular = services.catalogue.popularCravings();
  // One craving per category, so a miss still gives broad ideas to try.
  const categories = popular.filter((c, i) => popular.findIndex((o) => o.category === c.category) === i);

  async function run(craving: FoodItem) {
    const id = ++latest.current;
    setLoading(true);
    try {
      const { swaps, cravingCost, cravingHealth } = await swapService(services).getSwapsWithBaseline(craving.id, profile);
      if (latest.current !== id) return;
      setLoading(false);
      setOutcome({ kind: 'swaps', craving, swaps, cravingHealth, cravingCost });
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

  // Before any search the popular cravings fill the results area as a grid of pictures; afterwards they fold into a scrolling row on desktop (hidden on phones, where the search stays at hand).
  const showGrid = outcome.kind === 'none' && !loading;
  const popularBlock = popular.length === 0 ? (
    <section aria-label="Popular cravings" className="grid gap-2">
      {catalogue.status === 'loading' && (
        <>
          <p className="sr-only">Loading cravings…</p>
          <SkeletonRows />
        </>
      )}
      {catalogue.status === 'unavailable' && (
        <div role="alert" className="grid justify-items-start gap-3 rounded-card bg-accent-soft p-4 text-sm text-foreground">
          <p className="text-pretty">
            We can't reach the swap server right now. Showing nothing yet — try again, or turn off the backend.
          </p>
          <button type="button" onClick={catalogue.retry} className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            Retry
          </button>
        </div>
      )}
    </section>
  ) : (
    <section aria-labelledby="popular-h" className={showGrid ? 'grid gap-2' : 'hidden gap-2 md:grid'}>
      <h2 id="popular-h" className={showGrid ? 'text-base font-semibold' : 'text-xs text-muted-foreground'}>Popular cravings</h2>
      <div className={showGrid ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5' : 'hide-scrollbar flex gap-2 overflow-x-auto'}>
        {popular.map((c, i) => (
          <button key={c.id} type="button" className={showGrid ? tile : chip} onClick={() => pick(c)}>
            <CravingPicture id={c.id} eager={showGrid && i < 4} size={showGrid ? 160 : 32} className={showGrid ? 'aspect-square h-auto w-full rounded bg-background object-cover' : 'size-8 shrink-0 rounded-sm bg-background'} />
            {c.name}
          </button>
        ))}
      </div>
    </section>
  );

  // Renders as two grid items of the home layout (see App): the search block and the results block.
  return (
    <div className="contents">
      <div className="order-3 grid content-start gap-4 md:col-span-5 md:col-start-8 md:row-start-2">
      <form role="search" className="grid gap-2" onSubmit={submit}>
        <label htmlFor="craving-q" className="sr-only">What are you craving?</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef} id="craving-q" type="search" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Try burger or chips"
              className="min-h-12 w-full min-w-0 rounded border border-input bg-field px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-ring"
            />
            <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-sm bg-card px-1.5 text-xs text-muted-foreground lg:block">/</kbd>
          </div>
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:transition-opacity motion-safe:duration-150"
          >
            Find swaps
          </button>
        </div>
      </form>

      {!showGrid && popularBlock}
      </div>

      <div aria-live="polite" className="order-5 grid content-start gap-3 md:order-none md:col-span-7 md:col-start-1 md:row-start-4">
        {showGrid && popularBlock}
        {loading && (
          <>
            <p className="sr-only">Finding swaps…</p>
            <SkeletonRows />
          </>
        )}
        {!loading && outcome.kind === 'error' && (
          <div role="alert" className="rounded-card bg-accent-soft p-4 text-sm text-foreground">
            <p className="font-medium">That did not work.</p>
            <p className="text-pretty">Something went wrong finding swaps. Please try again.</p>
          </div>
        )}
        {!loading && outcome.kind === 'no-match' && (
          <div className="rounded-card bg-card p-4">
            <p className="text-sm">No exact match for “{outcome.text}”. Try a similar kind of food:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" className={`${chip} bg-background`} onClick={() => pick(c)}>
                  {c.category}: {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!loading && outcome.kind === 'swaps' && (
          <>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
              {photoFor(outcome.craving.id) && <CravingPicture id={outcome.craving.id} eager size={48} className="row-span-2 size-12 shrink-0 rounded" />}
              <h2 className="col-start-2 text-base font-semibold text-balance">
                {outcome.swaps.length === 0
                  ? `No swaps found for ${outcome.craving.name} yet.`
                  : `${outcome.swaps.length} ${outcome.swaps.length === 1 ? 'swap' : 'swaps'} for ${outcome.craving.name}`}
              </h2>
              {outcome.cravingCost !== null && outcome.swaps.length > 0 && (
                <p className="col-start-2 text-xs text-muted-foreground">Your craving: about ${outcome.cravingCost.toFixed(2)} per serve</p>
              )}
            </div>
            {outcome.swaps.length === 0 && (
              <p className="rounded-card bg-card p-4 text-sm text-pretty text-muted-foreground">
                We do not have a cheaper or healthier idea for this one yet. Try another craving.
              </p>
            )}
            {outcome.swaps.length > 0 && (
              <SwapResults swaps={outcome.swaps} cravingHealth={outcome.cravingHealth} cravingCost={outcome.cravingCost} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
