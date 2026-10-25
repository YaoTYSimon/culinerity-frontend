import { useEffect, useRef, useState, type FormEvent } from 'react';
import { type FoodItem, type Profile, type RankedSwap, swapService } from '@culinerity/core';
import { useCatalogueStatus, useServices } from '../services/ServicesContext';
import { SwapResults, type WeekSwapInput } from './SwapResults';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

type Outcome =
  | { kind: 'none' }
  | { kind: 'no-match'; text: string }
  | { kind: 'error' }
  | { kind: 'swaps'; craving: FoodItem; swaps: RankedSwap[]; cravingHealth: number | null; cravingCost: number | null };

const tile =
  'flex min-h-11 flex-col items-center gap-2 rounded-2xl p-1 text-center text-sm font-semibold text-ink focus-ring motion-colors';
const pill =
  'flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-surface pl-1.5 pr-4 text-sm font-semibold text-ink focus-ring motion-colors';

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

function SkeletonRows() {
  return (
    <div aria-hidden="true" className="grid gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 motion-safe:animate-pulse">
          <span className="size-[58px] shrink-0 rounded-full bg-surface" />
          <div className="grid flex-1 gap-2">
            <span className="h-3.5 w-3/5 rounded-full bg-surface" />
            <span className="h-3 w-2/5 rounded-full bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CravingSearch({ profile, onAddToWeek }: { profile: Profile; onAddToWeek: (swap: WeekSwapInput) => void }) {
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

  // Before any search the popular cravings fill the results area as a grid of round photos; afterwards they fold into a scrolling row (hidden on phones, where the search stays at hand).
  const showGrid = outcome.kind === 'none' && !loading;
  const popularBlock = popular.length === 0 ? (
    <section aria-label="Popular cravings" className="grid gap-3">
      {catalogue.status === 'loading' && (
        <>
          <p className="sr-only">Loading cravings…</p>
          <SkeletonRows />
        </>
      )}
      {catalogue.status === 'unavailable' && (
        <div role="alert" className="grid justify-items-start gap-3 text-sm text-ink">
          <p className="text-base font-semibold">We can't reach the swap server right now.</p>
          <p className="text-pretty text-muted">Try again, or turn off the backend.</p>
          <PillButton onClick={catalogue.retry}>Retry</PillButton>
        </div>
      )}
    </section>
  ) : (
    <section aria-labelledby="popular-h" className={showGrid ? 'grid gap-3' : 'hidden gap-3 sm:grid'}>
      <h2 id="popular-h" className={showGrid ? 'text-base font-semibold' : 'text-xs text-muted'}>Popular cravings</h2>
      <div className={showGrid ? 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5' : 'hide-scrollbar flex gap-2 overflow-x-auto'}>
        {popular.map((c, i) => (
          <button key={c.id} type="button" className={showGrid ? tile : pill} onClick={() => pick(c)}>
            {showGrid ? (
              <RoundPhoto itemId={c.id} size={120} eager={i < 4} className="aspect-square h-auto! w-full! max-w-[140px]" />
            ) : (
              <RoundPhoto itemId={c.id} size={32} />
            )}
            {c.name}
          </button>
        ))}
      </div>
    </section>
  );

  // Two stacked blocks in the single centred column: the search block and the results block.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
      <form role="search" className="grid gap-2" onSubmit={submit}>
        <label htmlFor="craving-q" className="sr-only">What are you craving?</label>
        <div className="flex gap-2">
          <input
            ref={inputRef} id="craving-q" type="search" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Try burger or chips"
            className="min-h-12 w-0 min-w-0 flex-1 rounded-full bg-surface px-5 text-base text-ink placeholder:text-muted focus-ring"
          />
          <PillButton type="submit" className="min-h-12 shrink-0">Find swaps</PillButton>
        </div>
      </form>

      {!showGrid && popularBlock}
      </div>

      <div aria-live="polite" className="grid grid-cols-[minmax(0,1fr)] content-start gap-3">
        {showGrid && popularBlock}
        {loading && (
          <>
            <p className="sr-only">Finding swaps…</p>
            <SkeletonRows />
          </>
        )}
        {!loading && outcome.kind === 'error' && (
          <div role="alert" className="grid gap-1 text-sm">
            <p className="text-base font-semibold">That did not work.</p>
            <p className="text-pretty text-muted">Something went wrong finding swaps. Please try again.</p>
          </div>
        )}
        {!loading && outcome.kind === 'no-match' && (
          <div className="grid gap-3">
            <p className="text-pretty text-base font-semibold">No exact match for “{outcome.text}”.</p>
            <p className="text-sm text-muted">Try a similar kind of food:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <PillButton key={c.id} variant="surface" className="text-sm" onClick={() => pick(c)}>
                  {c.category}: {c.name}
                </PillButton>
              ))}
            </div>
          </div>
        )}
        {!loading && outcome.kind === 'swaps' && (
          <>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
              <RoundPhoto itemId={outcome.craving.id} size={48} eager className="row-span-2" />
              <h2 className="col-start-2 text-xl font-semibold text-balance">
                {outcome.swaps.length === 0
                  ? `No swaps found for ${outcome.craving.name} yet.`
                  : `${outcome.swaps.length} ${outcome.swaps.length === 1 ? 'swap' : 'swaps'} for ${outcome.craving.name}`}
              </h2>
              {outcome.cravingCost !== null && outcome.swaps.length > 0 && (
                <p className="col-start-2 text-xs text-muted">Your craving: about ${outcome.cravingCost.toFixed(2)} per serve</p>
              )}
            </div>
            {outcome.swaps.length === 0 && (
              <p className="text-sm text-pretty text-muted">
                We do not have a cheaper or healthier idea for this one yet. Try another craving.
              </p>
            )}
            {outcome.swaps.length > 0 && (
              <SwapResults swaps={outcome.swaps} cravingHealth={outcome.cravingHealth} cravingCost={outcome.cravingCost} onAddToWeek={onAddToWeek} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
