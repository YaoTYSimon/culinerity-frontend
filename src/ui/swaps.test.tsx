import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createCoreServices, createHttpServices, InMemoryProfileStore, type FetchLike, type FoodInfo, type FoodProfile, type PriceSource, type Profile, type RankedSwap } from '@culinerity/core';
import { createServices, type Services } from '../services/container';
import { ServicesProvider } from '../services/ServicesContext';
import { CravingSearch } from './CravingSearch';
import { SwapResults } from './SwapResults';

const onAdd = vi.fn();
function renderSearch(profile = {}) {
  return render(
    <ServicesProvider services={createServices()}>
      <CravingSearch profile={profile} onAddToWeek={onAdd} />
    </ServicesProvider>,
  );
}
const search = (text: string) => {
  fireEvent.change(screen.getByLabelText(/what are you craving/i), { target: { value: text } });
  fireEvent.submit(screen.getByRole('search'));
};

describe('CravingSearch', () => {
  it('shows swaps with a Sample data badge for "burger"', async () => {
    renderSearch({ foodBudgetWeekly: 70 });
    search('burger');
    expect((await screen.findAllByText('Sample data')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.queryByText(/\$0(\.00)?(?![.\d])/)).not.toBeInTheDocument();
  });

  it('shows only the picklist for whitespace input', () => {
    renderSearch();
    search('   ');
    expect(screen.getByRole('button', { name: /burger/i })).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
    expect(screen.queryByText(/no exact match/i)).not.toBeInTheDocument();
  });

  it('searches when a picklist item is chosen', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /takeaway burger/i }));
    expect((await screen.findAllByText('Sample data')).length).toBeGreaterThan(0);
  });

  it('shows a no-match message with category suggestions', async () => {
    renderSearch();
    search('zzzz');
    expect(await screen.findByText(/no exact match/i)).toBeInTheDocument();
    expect(screen.getByText(/fast food/i)).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

describe('SwapResults', () => {
  const alt = { id: 'a', name: 'Home toastie', category: 'home', keywords: [] };
  const craving = { id: 'c', name: 'Burger', category: 'fast food', keywords: [] };
  const base: RankedSwap = {
    candidate: { craving, alternative: alt, note: 'n' },
    price: null, cost: null, health: 70, withinBudget: null, value: null,
  };

  it('says Price unavailable, never $0, when cost is null', () => {
    render(<SwapResults swaps={[base]} cravingHealth={40} />);
    expect(screen.getByText(/price unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
    expect(screen.getByText('Healthier')).toBeInTheDocument();
    expect(screen.queryByText(/within budget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^70/)).not.toBeInTheDocument();
  });

  it('shows price, store, date, badge and budget marker', () => {
    const s: RankedSwap = {
      ...base, cost: 3.2, withinBudget: true,
      price: { itemId: 'a', store: 'Aldi', pricePerServe: 3.2, unitLabel: '1 toastie', observedAt: '2026-03-12', isSample: true },
    };
    render(<SwapResults swaps={[s]} cravingHealth={null} />);
    expect(screen.getByText(/\$3\.20/)).toBeInTheDocument();
    expect(screen.getByText(/Aldi/)).toBeInTheDocument();
    expect(screen.getByText(/12 Mar 2026/)).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getByText(/within budget/i)).toBeInTheDocument();
  });

  it('marks over budget', () => {
    render(<SwapResults swaps={[{ ...base, cost: 9, withinBudget: false }]} cravingHealth={null} />);
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function gatedServices(gates: Record<string, Promise<void>>): Services {
  const base = createServices();
  const prices: PriceSource = {
    async getPrices(id) {
      await gates[id];
      return base.prices.getPrices(id);
    },
  };
  return { ...base, prices };
}

const renderWith = (services: Services) =>
  render(
    <ServicesProvider services={services}>
      <CravingSearch profile={{}} onAddToWeek={onAdd} />
    </ServicesProvider>,
  );

describe('CravingSearch failure and races', () => {
  it('shows an alert and clears loading when getSwaps rejects', async () => {
    const base = createServices();
    const catalogue = { ...base.catalogue, swapsFor: () => { throw new Error('boom'); },
      findCravings: base.catalogue.findCravings.bind(base.catalogue), popularCravings: base.catalogue.popularCravings.bind(base.catalogue) };
    renderWith({ ...base, catalogue });
    search('burger');
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong finding swaps/i);
    expect(screen.queryByText(/finding swaps…/i)).not.toBeInTheDocument();
  });

  it('shows an alert when findCravings throws', () => {
    const base = createServices();
    const catalogue = { ...base.catalogue, findCravings: () => { throw new Error('boom'); },
      swapsFor: base.catalogue.swapsFor.bind(base.catalogue), popularCravings: base.catalogue.popularCravings.bind(base.catalogue) };
    renderWith({ ...base, catalogue });
    search('burger');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ignores a slower, older search that resolves after a newer one', async () => {
    const slow = deferred();
    renderWith(gatedServices({ burger: slow.promise }));
    search('burger');
    search('pizza');
    expect(await screen.findByText(/swaps? for Delivery pizza/i)).toBeInTheDocument();
    await act(async () => { slow.resolve(); await slow.promise; });
    expect(screen.getByText(/swaps? for Delivery pizza/i)).toBeInTheDocument();
    expect(screen.queryByText(/for Takeaway burger/i)).not.toBeInTheDocument();
  });

  it('does not warn or throw when unmounted mid-search', async () => {
    const gate = deferred();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderWith(gatedServices({ burger: gate.promise }));
    search('burger');
    unmount();
    await act(async () => { gate.resolve(); await gate.promise; });
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe('SwapResults date', () => {
  it('says date unknown for an unparseable observedAt', () => {
    const f = { id: 'c', name: 'B', category: 'x', keywords: [] };
    const s: RankedSwap = {
      candidate: { craving: f, alternative: { ...f, id: 'a', name: 'A' }, note: 'n' },
      cost: 2, health: 50, withinBudget: null, value: null,
      price: { itemId: 'a', store: 'Aldi', pricePerServe: 2, unitLabel: 'x', observedAt: 'nonsense', isSample: false },
    };
    render(<SwapResults swaps={[s]} />);
    expect(screen.getByText(/date unknown/i)).toBeInTheDocument();
  });
});

describe('SwapResults saving text', () => {
  const f = { id: 'c', name: 'B', category: 'x', keywords: [] };
  const swap = (cost: number): RankedSwap => ({
    candidate: { craving: f, alternative: { ...f, id: 'a', name: 'A' }, note: 'n' },
    cost, health: 50, withinBudget: null, value: null,
    price: { itemId: 'a', store: 'Aldi', pricePerServe: cost, unitLabel: 'x', observedAt: '2026-03-12', isSample: true },
  });

  it('shows the saving against the craving price', () => {
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={9.5} />);
    expect(screen.getByText('Saves $6.30')).toBeInTheDocument();
  });

  it('never shows a zero or negative saving', () => {
    render(<SwapResults swaps={[swap(9.5), swap(12)]} cravingCost={9.5} />);
    expect(screen.queryByText(/saves/i)).not.toBeInTheDocument();
  });

  it('says Sample data once per list, not per card', () => {
    render(<SwapResults swaps={[swap(3), swap(4)]} cravingCost={9.5} />);
    expect(screen.getAllByText('Sample data')).toHaveLength(1);
  });
});

describe('keyboard', () => {
  it('"/" focuses the craving search unless already typing', () => {
    renderSearch();
    const input = screen.getByLabelText(/what are you craving/i);
    fireEvent.keyDown(document.body, { key: '/' });
    expect(input).toHaveFocus();
    (input as HTMLInputElement).blur();
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    fireEvent.keyDown(other, { key: '/' });
    expect(other).toHaveFocus();
    other.remove();
  });

  it('"/" is ignored while composing or when already handled', () => {
    renderSearch();
    const input = screen.getByLabelText(/what are you craving/i);
    fireEvent.keyDown(document.body, { key: '/', isComposing: true });
    expect(input).not.toHaveFocus();
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', stop, true);
    fireEvent.keyDown(document.body, { key: '/' });
    window.removeEventListener('keydown', stop, true);
    expect(input).not.toHaveFocus();
  });
});

describe('SwapResults plate rows and add to my week', () => {
  const f = { id: 'c', name: 'Burger', category: 'x', keywords: [] };
  const swap = (cost: number | null, id = 'a', name = 'Home smash burger'): RankedSwap => ({
    candidate: { craving: f, alternative: { ...f, id, name }, note: 'n' },
    cost, health: 50, withinBudget: null, value: null,
    price: cost === null ? null : { itemId: id, store: 'Aldi', pricePerServe: cost, unitLabel: 'x', observedAt: '2026-03-12', isSample: true },
  });

  it('shows "Saves $4.30" as plain text, not inside a background element', () => {
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={7.5} />);
    const el = screen.getByText('Saves $4.30');
    for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
      expect(n.className).not.toMatch(/(^|\s)bg-/);
    }
    expect(screen.getByText('Aldi · per serve')).toBeInTheDocument();
  });

  it('has no Add button for an unpriced swap or a saving of zero or less', () => {
    render(<SwapResults swaps={[swap(null), swap(7.5, 'b', 'Same'), swap(9, 'c2', 'Dearer')]} cravingCost={7.5} />);
    expect(screen.queryByRole('button', { name: /to my week/i })).not.toBeInTheDocument();
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it('has no Add button without a craving price', () => {
    render(<SwapResults swaps={[swap(3)]} cravingCost={null} />);
    expect(screen.queryByRole('button', { name: /to my week/i })).not.toBeInTheDocument();
  });

  it('Add calls onAddToWeek once with exact itemId, name and saving, and confirms', () => {
    const fn = vi.fn();
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={7.5} onAddToWeek={fn} />);
    const btn = screen.getByRole('button', { name: 'Add Home smash burger to my week' });
    expect(screen.queryByText('Added to your week')).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ itemId: 'a', name: 'Home smash burger', saving: 4.3 });
    expect(screen.getByText('Added to your week')).toBeInTheDocument();
  });

  it('a second tap announces a count', () => {
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={7.5} onAddToWeek={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Add Home smash burger to my week' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.getByText('Added to your week (2)')).toBeInTheDocument();
  });

  it('the Add button is the primary (accent) variant', () => {
    render(<SwapResults swaps={[swap(3.2)]} cravingCost={7.5} />);
    expect(screen.getByRole('button', { name: /to my week/i })).toHaveAttribute('data-variant', 'primary');
  });
});

describe('popular cravings after a search', () => {
  it('are removed entirely, with no horizontal strip', async () => {
    const { container } = renderSearch();
    expect(screen.getByText('Popular cravings')).toBeInTheDocument();
    search('burger');
    await screen.findAllByRole('listitem');
    expect(screen.queryByText('Popular cravings')).not.toBeInTheDocument();
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });
});

const food = (over: Partial<FoodProfile> = {}): FoodProfile => ({ traditions: [], rules: [], allergies: [], occasions: [], dismissed: [], ...over });
const POPULAR = ['burger', 'hot-chips', 'bubble-tea', 'instant-noodles', 'pizza', 'chocolate', 'fried-chicken', 'kebab', 'pastry', 'soft-drink'];
const PORK_ID = 'smash-burger';

/** Mock services where `reflag` can change the flags of any item, standing in for dishes the sample data lacks. */
function flagged(reflag: (id: string, info: FoodInfo) => FoodInfo): Services {
  const base = createServices();
  const catalogue = Object.create(base.catalogue) as Services['catalogue'];
  catalogue.foodInfo = (id) => {
    const info = base.catalogue.foodInfo(id);
    return info ? reflag(id, info) : info;
  };
  return { ...base, catalogue };
}
const porkServices = () =>
  flagged((id, i) => (id === PORK_ID ? { ...i, flags: { ...i.flags, halal: 'no', pork: 'yes' } } : i));

const onChangeRules = vi.fn();
function renderFood(profile: Profile, services: Services = createServices()) {
  return render(
    <ServicesProvider services={services}>
      <CravingSearch profile={profile} onAddToWeek={onAdd} onChangeFoodRules={onChangeRules} />
    </ServicesProvider>,
  );
}
const pickTile = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('SwapResults food notes', () => {
  const f = { id: 'c', name: 'Burger', category: 'x', keywords: [] };
  const swap = (id: string, name: string): RankedSwap => ({
    candidate: { craving: f, alternative: { ...f, id, name }, note: 'n' },
    cost: null, health: 50, withinBudget: null, value: null, price: null,
  });
  const swaps = [swap('a', 'Alpha dish'), swap('b', 'Beta dish'), swap('c2', 'Gamma dish')];
  const notes = {
    a: { fit: 'fits' as const, kitchen: true, certifiedMeat: 'halal' as const },
    b: { fit: 'check' as const, kitchen: false, certifiedMeat: null },
    c2: { fit: 'fits' as const, kitchen: false, certifiedMeat: 'kosher' as const },
  };

  it('shows the exact labels on the right rows and nothing on rows without a note', () => {
    render(<SwapResults swaps={swaps} notes={notes} rulesOn />);
    expect(within(rowOf('Alpha dish')).getByText('Fits your kitchen')).toBeInTheDocument();
    expect(within(rowOf('Alpha dish')).getByText('Use halal-certified meat.')).toBeInTheDocument();
    expect(within(rowOf('Beta dish')).getByText('Check the ingredients')).toBeInTheDocument();
    expect(within(rowOf('Gamma dish')).getByText('Use kosher-certified meat.')).toBeInTheDocument();
    expect(within(rowOf('Gamma dish')).queryByText('Fits your kitchen')).toBeNull();
    expect(screen.getByText('Showing swaps that match your food rules. This is a guide, not a certification. Check labels.')).toBeInTheDocument();
  });

  it('shows no food text at all without notes', () => {
    render(<SwapResults swaps={swaps} />);
    expect(screen.queryByText(/fits your kitchen|check the ingredients|certified|food rules|public food tables/i)).toBeNull();
  });

  it('shows the unmatched allergy sentence and the nutrition footnote only when asked', () => {
    const { rerender } = render(<SwapResults swaps={swaps} unmatchedAllergies={['kiwi']} nutritionNote />);
    expect(screen.getByText('We could not check "kiwi". Read every label.')).toBeInTheDocument();
    expect(screen.getByText('Nutrition estimated from public food tables.')).toBeInTheDocument();
    rerender(<SwapResults swaps={swaps} />);
    expect(screen.queryByText(/could not check|public food tables/)).toBeNull();
  });
});

describe('CravingSearch with a food profile', () => {
  it('under a halal rule, the pork item never appears for any popular craving, and the rule line shows', async () => {
    const services = porkServices();
    const porkName = services.catalogue.swapsFor('burger').find((s) => s.alternative.id === PORK_ID)!.alternative.name;
    renderFood({}, services);
    pickTile(/takeaway burger/i);
    await screen.findByText(/swaps? for/i);
    expect(screen.getByText(porkName)).toBeInTheDocument();
    cleanup();

    for (const id of POPULAR) {
      renderFood({ foodProfile: food({ rules: ['halal'] }) }, services);
      const name = services.catalogue.popularCravings().find((c) => c.id === id)!.name;
      pickTile(new RegExp(`^${name}$`, 'i'));
      await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument());
      expect(screen.queryByText(porkName)).toBeNull();
      expect(screen.getByText('Showing swaps that match your food rules. This is a guide, not a certification. Check labels.')).toBeInTheDocument();
      cleanup();
    }
  });

  it('puts an unknown-halal item last with "Check the ingredients", and a halal chicken swap says "Use halal-certified meat."', async () => {
    renderFood({ foodProfile: food({ rules: ['halal'] }) }, porkServices());
    pickTile(/takeaway burger/i);
    await screen.findAllByText('Use halal-certified meat.');
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[rows.length - 1]!).getByText('Check the ingredients')).toBeInTheDocument();
    expect(within(rows[0]!).queryByText('Check the ingredients')).toBeNull();
    expect(screen.getAllByText('Use halal-certified meat.').length).toBeGreaterThan(0);
  });

  it('labels a Greek-tagged swap "Fits your kitchen" and no other tradition', async () => {
    const services = createServices();
    const nameOf = (id: string) => services.catalogue.swapsFor('burger').find((s) => s.alternative.id === id)!.alternative.name;
    renderFood({ foodProfile: food({ traditions: ['greek'] }) }, services);
    pickTile(/takeaway burger/i);
    await screen.findByText(nameOf('greek-salad'));
    expect(within(rowOf(nameOf('greek-salad'))).getByText('Fits your kitchen')).toBeInTheDocument();
    expect(within(rowOf(nameOf('minestrone'))).queryByText('Fits your kitchen')).toBeNull();
    expect(screen.getAllByText('Fits your kitchen')).toHaveLength(2);
  });

  it('shows no food labels or rule line when there is no food profile', async () => {
    renderFood({});
    pickTile(/takeaway burger/i);
    await screen.findByText(/swaps? for/i);
    expect(screen.queryByText(/fits your kitchen|check the ingredients|certified|food rules/i)).toBeNull();
  });

  it('says only the hidden-all sentence when every swap is out', async () => {
    const services = flagged((_id, i) => ({ ...i, flags: { ...i.flags, vegan: 'no' } }));
    renderFood({ foodProfile: food({ rules: ['vegan'] }) }, services);
    pickTile(/chocolate/i);
    const msg = await screen.findByText('We do not have a swap that fits all your food rules yet.');
    expect(msg).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change my food rules' }));
    expect(onChangeRules).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText(/showing swaps that match|no swaps found|public food tables|sample data|swaps? for/i)).toBeNull();
  });

  it('says it cannot check an unmatched allergy word, and every row says check', async () => {
    renderFood({ foodProfile: food({ allergies: ['kiwi fruit'] }) });
    pickTile(/takeaway burger/i);
    expect(await screen.findByText('We could not check "kiwi fruit". Read every label.')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(within(r).getByText('Check the ingredients')).toBeInTheDocument();
  });

  it('never echoes the person\'s own text on swaps apart from the unmatched allergy sentence', async () => {
    const { container } = renderFood({
      foodProfile: food({ traditions: ['xyzzy home cooking'], rules: ['halal'], allergies: ['peanut'], dismissed: ['qwerty'] }),
    });
    pickTile(/takeaway burger/i);
    await screen.findByText(/swaps? for/i);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/xyzzy|qwerty|peanut/i);
    expect(screen.queryByText(/We do not have swaps for/)).toBeNull();
  });

  it('says a chosen tradition has no catalogue food yet, by its label', () => {
    renderFood({ foodProfile: food({ traditions: ['korean', 'greek'] }) });
    expect(screen.getByText('We do not have swaps for Korean yet, but your food rules still apply.')).toBeInTheDocument();
    expect(screen.queryByText(/swaps for Greek/)).toBeNull();
  });

  it('shows the nutrition footnote when a cultural item shows, not for a plain craving', async () => {
    renderFood({});
    pickTile(/takeaway burger/i);
    expect(await screen.findByText('Nutrition estimated from public food tables.')).toBeInTheDocument();
    cleanup();
    renderFood({});
    pickTile(/chocolate/i);
    await screen.findByText(/swaps? for/i);
    expect(screen.queryByText('Nutrition estimated from public food tables.')).toBeNull();
  });
});

describe('privacy: the swaps view sends no profile text over the network', () => {
  const SECRET = 'zzquince-secret';
  const mock = createCoreServices(new InMemoryProfileStore());
  const body = async (url: string): Promise<unknown> => {
    const path = url.replace(/^\/api\//, '');
    const [head, rest = ''] = path.split('/');
    const id = decodeURIComponent(rest);
    if (head === 'cravings') return rest === 'popular' ? mock.catalogue.popularCravings() : mock.catalogue.allCravings();
    if (head === 'food-info') return mock.catalogue.allCravings().flatMap((c) => [c.id, ...mock.catalogue.swapsFor(c.id).map((s) => s.alternative.id)]).flatMap((i) => mock.catalogue.foodInfo(i) ?? []);
    if (head === 'swaps') return mock.catalogue.swapsFor(id);
    if (head === 'prices') return mock.prices.getPrices(id);
    if (head === 'nutrition') return mock.nutrition.getNutrition(id);
    return [];
  };
  const calls: Array<[string, unknown]> = [];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push([url, init]);
    return { ok: true, status: 200, json: async () => body(url) };
  };
  const leaks = (needle: string) => calls.some((c) => JSON.stringify(c).toLowerCase().includes(needle.toLowerCase()));

  it('the leak check is live', () => {
    expect(leaks('/api/prices')).toBe(false);
    calls.push([`/api/prices/${SECRET}`, undefined]);
    expect(leaks(SECRET)).toBe(true);
    calls.length = 0;
  });

  it('makes price and nutrition requests by item id only', async () => {
    const services = await createHttpServices(new InMemoryProfileStore(), fetchFn);
    calls.length = 0;
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no direct fetch'));
    renderFood({
      foodProfile: food({ traditions: [SECRET, 'greek'], rules: ['halal'], allergies: [SECRET, 'peanut'], dismissed: [SECRET] }),
      foodBudgetWeekly: 91,
    }, services);
    pickTile(/takeaway burger/i);
    await screen.findByText(/could not check/i);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([u]) => /^\/api\/(prices|nutrition)\/[a-z0-9-]+$/.test(u))).toBe(true);
    expect(leaks(SECRET)).toBe(false);
    expect(leaks('peanut')).toBe(false);
    expect(leaks('halal')).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('text that names an inherited property', () => {
  const HOSTILE = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
  it('Swaps still shows swaps, and says it cannot check those words', async () => {
    renderFood({ foodProfile: food({ traditions: HOSTILE, allergies: HOSTILE, rules: ['halal'] }) });
    pickTile(/takeaway burger/i);
    expect(await screen.findByText(/swaps? for/i)).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong|could not load/i)).toBeNull();
    for (const w of HOSTILE) expect(screen.getByText(new RegExp(w.replace('_', '\\_')), { exact: false })).toBeInTheDocument();
  });
});
