import { useEffect, useRef, useState, type FormEvent } from 'react';
import { type FoodItem, type Profile, type ProfiledSwap, cravingsForTraditions, swapService, traditions, shownForTraditions, traditionsWithFoods } from '@culinerity/core';
import { useCatalogueStatus, useServices } from '../services/ServicesContext';
import { hasFoodRules } from './foodCopy';
import { SwapResults, type SwapNote, type WeekSwapInput } from './SwapResults';
import { FIELD_EDGE } from './formParts';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

type Outcome =
  | { kind: 'none' }
  | { kind: 'no-match'; text: string }
  | { kind: 'error' }
  | {
      kind: 'swaps';
      craving: FoodItem;
      profiled: ProfiledSwap[];
      hidden: number;
      unmatchedAllergies: string[];
      cultural: boolean;
      cravingHealth: number | null;
      cravingCost: number | null;
    };

/** At most this many cravings from the person's traditions lead the picklist. */
const TRADITION_CRAVINGS = 6;
export const NO_FIT_LINE = 'We do not have a swap that fits all your food rules yet.';
const noTraditionFoods = (label: string) => `We do not have swaps for ${label} yet, but your food rules still apply.`;

const tile =
  'group flex min-h-11 flex-col items-center gap-2 text-center text-sm font-semibold text-ink outline-none';
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

type SwapsOutcomeData = Extract<Outcome, { kind: 'swaps' }>;

function SwapsOutcome({ outcome, rulesOn, onAddToWeek, onChangeFoodRules }: { outcome: SwapsOutcomeData; rulesOn: boolean; onAddToWeek: (swap: WeekSwapInput) => void; onChangeFoodRules?: () => void }) {
  const { craving, profiled, hidden } = outcome;
  const swaps = profiled.map((p) => p.swap);
  // Nothing fits the person's rules: say so kindly and list nothing else.
  if (swaps.length === 0 && hidden > 0) return (
      <div className="grid justify-items-start gap-1">
        <p className="text-base font-semibold text-pretty">{NO_FIT_LINE}</p>
        {onChangeFoodRules && <PillButton variant="text" className="-ml-3" onClick={onChangeFoodRules}>Change my food rules</PillButton>}
      </div>
    );
  const notes: Record<string, SwapNote> = Object.fromEntries(
    profiled.map((p) => [p.swap.candidate.alternative.id, { fit: p.fit, kitchen: p.kitchen, certifiedMeat: p.certifiedMeat }]),
  );
  return (
    <>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
        <RoundPhoto itemId={craving.id} size={48} eager className="row-span-2" />
        <h2 className="col-start-2 text-xl font-semibold text-balance">
          {swaps.length === 0
            ? `No swaps found for ${craving.name} yet.`
            : `${swaps.length} ${swaps.length === 1 ? 'swap' : 'swaps'} for ${craving.name}`}
        </h2>
        {outcome.cravingCost !== null && swaps.length > 0 && (
          <p className="col-start-2 text-xs text-muted">Your craving: about ${outcome.cravingCost.toFixed(2)} per serve</p>
        )}
      </div>
      {swaps.length === 0 && (
        <p className="text-sm text-pretty text-muted">
          We do not have a cheaper or healthier idea for this one yet. Try another craving.
        </p>
      )}
      {swaps.length > 0 && (
        <SwapResults
          swaps={swaps} notes={notes} rulesOn={rulesOn} unmatchedAllergies={outcome.unmatchedAllergies} nutritionNote={outcome.cultural}
          cravingHealth={outcome.cravingHealth} cravingCost={outcome.cravingCost} onAddToWeek={onAddToWeek}
        />
      )}
    </>
  );
}

export function CravingSearch({ profile, onAddToWeek, onChangeFoodRules }: { profile: Profile; onAddToWeek: (swap: WeekSwapInput) => void; onChangeFoodRules?: () => void }) {
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
  const food = profile.foodProfile;
  // The person's tradition cravings lead the picklist; with none it is the same ten.
  const picklist = popular.length === 0 ? popular : [...cravingsForTraditions(services.catalogue, food?.traditions ?? [], TRADITION_CRAVINGS), ...popular];
  // Starter traditions only (their label is ours); the person's own words are never echoed.
  const withFoods = popular.length === 0 || !food ? null : traditionsWithFoods(services.catalogue);
  const uncovered = withFoods
    ? traditions().filter((t) => food!.traditions.some((c) => c.toLowerCase() === t.id) && !withFoods.has(t.id))
    : [];
  const rulesOn = hasFoodRules(food);
  // One craving per category, so a miss still gives broad ideas to try.
  const categories = popular.filter((c, i) => popular.findIndex((o) => o.category === c.category) === i);

  async function run(craving: FoodItem) {
    const id = ++latest.current;
    setLoading(true);
    try {
      const { profiled, hidden, unmatchedAllergies, cravingCost, cravingHealth } = await swapService(services).getSwapsWithBaseline(craving.id, profile);
      if (latest.current !== id) return;
      const isCultural = (itemId: string) => (services.catalogue.foodInfo(itemId)?.traditions.length ?? 0) > 0;
      const cultural = isCultural(craving.id) || profiled.some((p) => isCultural(p.swap.candidate.alternative.id));
      setLoading(false);
      setOutcome({ kind: 'swaps', craving, profiled, hidden, unmatchedAllergies, cultural, cravingHealth, cravingCost });
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
      // Cultural cravings are found only by people who chose one of their traditions.
      match = services.catalogue.findCravings(q).find((c) => shownForTraditions(services.catalogue.foodInfo(c.id), food));
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

  // Popular cravings show only before a search, as a grid of round photos.
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
          <p className="text-pretty text-muted">Your cravings will load as soon as it's back.</p>
          <PillButton onClick={catalogue.retry}>Try again</PillButton>
        </div>
      )}
    </section>
  ) : (
    showGrid && (
    <section aria-labelledby="popular-h" className="grid gap-3">
      <h2 id="popular-h" className="text-base font-semibold">Popular cravings</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {picklist.map((c, i) => (
          <button key={c.id} type="button" className={tile} onClick={() => pick(c)}>
            <RoundPhoto itemId={c.id} size={120} fluid eager={i < 4} className="aspect-square w-full max-w-[140px] group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg" />
            {c.name}
          </button>
        ))}
      </div>
    </section>
    )
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
            className={`min-h-12 w-0 min-w-0 flex-1 rounded-full bg-surface px-5 text-base text-ink placeholder:text-muted focus-ring ${FIELD_EDGE}`}
          />
          <PillButton type="submit" className="min-h-12 shrink-0">Find swaps</PillButton>
        </div>
      </form>

      </div>

      <div aria-live="polite" className="grid grid-cols-[minmax(0,1fr)] content-start gap-3">
        {uncovered.map((t) => (
          <p key={t.id} className="text-sm text-pretty text-muted">{noTraditionFoods(t.label)}</p>
        ))}
        {popularBlock}
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
        {!loading && outcome.kind === 'swaps' && <SwapsOutcome outcome={outcome} rulesOn={rulesOn} onAddToWeek={onAddToWeek} onChangeFoodRules={onChangeFoodRules} />}
      </div>
    </div>
  );
}
