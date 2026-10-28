// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, buildCultural, computeNutrition, deriveFlags, kcalToKj, melbourneToday, validateCultural, DATA_PATH, OUT_PATH } from './build-cultural.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const errorsFor = (mut: (d: any) => void, today?: string) => {
  const d = data();
  mut(d);
  return validateCultural(d, today).join('\n');
};

describe('build-cultural', () => {
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildCultural(data()));
  });
  it('accepts the committed dataset', () => {
    expect(validateCultural(data())).toEqual([]);
  });
  it('rejects a duplicate tradition id', () => {
    expect(errorsFor((d) => d.traditions.push({ ...d.traditions[0] }))).toMatch(/duplicate tradition id/i);
  });
  it('rejects a calendar occasion that is not an occasion id', () => {
    expect(errorsFor((d) => (d.calendar[0].occasion = 'navratri'))).toMatch(/navratri/);
  });
  it('rejects end before start and impossible dates', () => {
    expect(errorsFor((d) => (d.calendar[0].end = '2000-01-01'))).toMatch(/end/);
    expect(errorsFor((d) => (d.calendar[0].start = '2027-02-30'))).toMatch(/start/);
    expect(errorsFor((d) => (d.calendar[0].start = '8/2/2027'))).toMatch(/start/);
  });
  it('rejects an unknown or missing sourceId', () => {
    expect(errorsFor((d) => (d.calendar[0].sourceId = 'nope'))).toMatch(/nope/);
    expect(errorsFor((d) => delete d.calendar[0].sourceId)).toMatch(/source/);
  });
  it('rejects a non-https source url, a missing licence and a bad verification', () => {
    expect(errorsFor((d) => (d.sources[0].url = 'http://example.com'))).toMatch(/https/);
    expect(errorsFor((d) => delete d.sources[0].licence)).toMatch(/licence/);
    expect(errorsFor((d) => (d.sources[0].verification = 'guess'))).toMatch(/verification/);
  });
  it('rejects a checked date after today in Melbourne', () => {
    expect(errorsFor((d) => (d.calendar[0].checked = '2999-01-01'))).toMatch(/checked/);
    expect(errorsFor((d) => (d.calendar[0].checked = '2026-10-29'), '2026-10-28')).toMatch(/checked/);
  });
  it('rejects a row with approx missing or not boolean', () => {
    expect(errorsFor((d) => delete d.calendar[0].approx)).toMatch(/approx/);
    expect(errorsFor((d) => (d.calendar[0].approx = 'yes'))).toMatch(/approx/);
  });
  it('rejects a lunar or Diwali row with approx false', () => {
    for (const occ of ['ramadan', 'eid-al-fitr', 'eid-al-adha', 'diwali']) {
      const msg = errorsFor((d) => (d.calendar.find((r: any) => r.occasion === occ).approx = false));
      expect(msg, occ).toMatch(/approx/);
    }
  });
  it('rejects a tradition label that names people', () => {
    expect(errorsFor((d) => (d.traditions[0].label = 'Greek people'))).toMatch(/people/i);
  });
  it('rejects an Aboriginal or Torres Strait entry without consultation', () => {
    expect(errorsFor((d) => d.traditions.push({ id: 'abo', label: 'Aboriginal foods' }))).toMatch(/consultation/i);
    expect(errorsFor((d) => d.traditions.push({ id: 'tsi', label: 'Torres Strait Islander cooking' }))).toMatch(/consultation/i);
    expect(errorsFor((d) => d.traditions.push({ id: 'aboriginal-bush', label: 'Bush food' }))).toMatch(/consultation/i);
  });
  it('fails freshness when the calendar ends less than 12 months after today', () => {
    expect(errorsFor(() => {}, '2028-09-20')).toMatch(/calendar needs refreshing/);
    expect(errorsFor(() => {}, '2026-10-28')).not.toMatch(/calendar needs refreshing/);
  });
  it('rejects a computed row that differs from the algorithm', () => {
    expect(errorsFor((d) => (d.calendar.find((r: any) => r.occasion === 'easter').start = '2027-03-27'))).toMatch(/computed/i);
  });
  it('keeps Diwali 2029 and Navratri out and in notFound', () => {
    const d = data();
    expect(d.calendar.some((r: any) => r.occasion === 'diwali' && r.start.startsWith('2029'))).toBe(false);
    expect(d.notFound.join('\n')).toMatch(/Diwali 2029/);
    expect(d.notFound.join('\n')).toMatch(/Navratri/);
  });
  it('melbourneToday is a YYYY-MM-DD date', () => {
    expect(melbourneToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

const A = (over: Record<string, unknown>) => ({
  id: 'x', name: 'x', vegetarian: 'yes', vegan: 'yes', halal: 'yes', kosher: 'yes', beef: 'no', pork: 'no', alcohol: 'no',
  gluten: 'no', allergens: [] as string[], ...over,
});
const pork = A({ id: 'pork', vegetarian: 'no', vegan: 'no', halal: 'no', kosher: 'no', pork: 'yes' });
const chicken = A({ id: 'chicken', vegetarian: 'no', vegan: 'no', halal: 'certified-meat', kosher: 'certified-meat' });
const cheese = A({ id: 'cheese', vegetarian: 'unknown', vegan: 'no', halal: 'unknown', kosher: 'unknown', allergens: ['milk'] });
const yoghurt = A({ id: 'yoghurt', vegetarian: 'yes', vegan: 'no', allergens: ['milk'] });
const wine = A({ id: 'wine', vegan: 'unknown', halal: 'no', kosher: 'unknown', alcohol: 'yes', allergens: ['sulphites'] });
const soy = A({ id: 'soy', gluten: 'yes', allergens: ['soy', 'wheat'] });
const oats = A({ id: 'oats', gluten: 'unknown', allergens: ['oats'] });
const prawn = A({ id: 'prawn', vegetarian: 'no', vegan: 'no', halal: 'unknown', kosher: 'no', allergens: ['crustacean'] });
const rice = A({ id: 'rice' });
const mystery = A({ id: 'mystery', allergens: 'unknown' });

describe('deriveFlags', () => {
  it('pork makes pork yes and halal and kosher no', () => {
    const f = deriveFlags([pork, rice]);
    expect([f.pork, f.halal, f.kosher]).toEqual(['yes', 'no', 'no']);
  });
  it('pork alone decides even beside unknown ingredients', () => {
    expect(deriveFlags([pork, cheese]).halal).toBe('no');
  });
  it('chicken sets certifiedMeat, halal yes and vegetarian no', () => {
    const f = deriveFlags([chicken, rice]);
    expect([f.certifiedMeat, f.halal, f.vegetarian]).toEqual([true, 'yes', 'no']);
  });
  it('cheese makes vegetarian, halal and kosher unknown', () => {
    const f = deriveFlags([cheese, rice]);
    expect([f.vegetarian, f.halal, f.kosher]).toEqual(['unknown', 'unknown', 'unknown']);
  });
  it('wine makes alcohol yes, halal no and kosher unknown', () => {
    const f = deriveFlags([wine, rice]);
    expect([f.alcohol, f.halal, f.kosher]).toEqual(['yes', 'no', 'unknown']);
  });
  it('alcohol yes forces halal no even when the ingredient row says yes', () => {
    expect(deriveFlags([A({ id: 'beer', alcohol: 'yes', halal: 'yes' })]).halal).toBe('no');
  });
  it('soy sauce makes gluten yes; oats make it unknown', () => {
    expect(deriveFlags([soy, rice]).gluten).toBe('yes');
    expect(deriveFlags([oats, rice]).gluten).toBe('unknown');
    expect(deriveFlags([soy, oats]).gluten).toBe('yes');
  });
  it('prawn is halal unknown and kosher no', () => {
    const f = deriveFlags([prawn]);
    expect([f.halal, f.kosher]).toEqual(['unknown', 'no']);
  });
  it('chicken plus yoghurt is kosher no (meat and dairy)', () => {
    expect(deriveFlags([chicken, yoghurt]).kosher).toBe('no');
  });
  it('an ingredient with unknown allergens makes allergensKnown false', () => {
    expect(deriveFlags([rice, mystery]).allergensKnown).toBe(false);
    expect(deriveFlags([rice, soy]).allergensKnown).toBe(true);
  });
  it('a partial allergen list keeps its allergens but makes allergensKnown false', () => {
    const pb = A({ id: 'pb', allergens: ['peanut'], allergensPartial: true });
    const f = deriveFlags([pb, rice]);
    expect([f.allergens, f.allergensKnown]).toEqual([['peanut'], false]);
  });
  it('unions allergens without duplicates', () => {
    expect(deriveFlags([soy, yoghurt, cheese]).allergens.sort()).toEqual(['milk', 'soy', 'wheat']);
  });
  it('an all-plant dish with known attributes is vegan, vegetarian, no pork, no beef', () => {
    const f = deriveFlags([rice, A({ id: 'lentil' })]);
    expect([f.vegan, f.vegetarian, f.pork, f.beef, f.certifiedMeat, f.allergensKnown]).toEqual(['yes', 'yes', 'no', 'no', false, true]);
  });
  it('no ingredients means everything unknown (never passes)', () => {
    const f = deriveFlags([]);
    expect([f.halal, f.vegan, f.gluten, f.pork, f.allergensKnown]).toEqual(['unknown', 'unknown', 'unknown', 'unknown', false]);
  });
  it('resolves ids through lookup and treats a missing id as unknown', () => {
    const lookup = (id: string) => (id === 'rice' ? rice : undefined);
    const f = deriveFlags(['rice', 'ghost'], lookup);
    expect([f.vegan, f.allergensKnown]).toEqual(['unknown', false]);
  });
});

// ---- Task 2: ingredients, foods, cravings, swaps and the derived catalogue ----

const per100g = (over: Record<string, number | undefined> = {}) => ({ energyKj: 200, proteinG: 10, fibreG: 2, sugarG: 1, sodiumMg: 50, ...over });
const ing = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: id, nutritionSourceId: 'afcd-r3', nutritionCode: 'F000001', per100g: per100g(),
  vegetarian: 'yes', vegan: 'yes', halal: 'yes', kosher: 'unknown', beef: 'no', pork: 'no', alcohol: 'no', gluten: 'no',
  allergens: [], attributeSourceId: 'afcd-r3', ...over,
});

describe('computeNutrition', () => {
  const table = new Map<string, any>([
    ['a', ing('a', { per100g: per100g({ energyKj: 1000, proteinG: 20, fibreG: 3.33, sugarG: 1.11, sodiumMg: 105 }) })],
    ['b', ing('b', { per100g: per100g({ energyKj: 300, proteinG: 1, fibreG: 5, sugarG: 2, sodiumMg: 7 }) })],
  ]);
  it('sums grams/100 x per-100g, integers for kJ and sodium, one decimal for the rest', () => {
    const n = computeNutrition({ recipe: [{ ingredient: 'a', grams: 150 }, { ingredient: 'b', grams: 80 }] }, table);
    expect(n).toEqual({
      energyKj: Math.round((150 / 100) * 1000 + (80 / 100) * 300),
      proteinG: Math.round(((150 / 100) * 20 + (80 / 100) * 1) * 10) / 10,
      fibreG: Math.round(((150 / 100) * 3.33 + (80 / 100) * 5) * 10) / 10,
      sugarG: Math.round(((150 / 100) * 1.11 + (80 / 100) * 2) * 10) / 10,
      sodiumMg: Math.round((150 / 100) * 105 + (80 / 100) * 7),
    });
  });
  it('applies 4.184 only when a source gives kcal', () => {
    const t = new Map<string, any>([
      ['k', ing('k', { per100g: { energyKcal: 100, proteinG: 0, fibreG: 0, sugarG: 0, sodiumMg: 0 } })],
      ['j', ing('j', { per100g: per100g({ energyKj: 418 }) })],
    ]);
    expect(computeNutrition({ recipe: [{ ingredient: 'k', grams: 100 }] }, t).energyKj).toBe(418);
    expect(computeNutrition({ recipe: [{ ingredient: 'j', grams: 100 }] }, t).energyKj).toBe(418);
    expect(kcalToKj(100)).toBeCloseTo(418.4, 6);
  });
});

describe('catalogue validation', () => {
  const food = () => ({
    id: 'test-food', name: 'Test food', category: 'home cooking', keywords: ['test'], unitLabel: '1 serve', traditions: ['greek'], traditionSourceId: 'afcd-r3',
    recipe: [{ ingredient: 'ing-a', grams: 100 }], recipeBasis: "Author's own simple recipe for one serve.",
    prices: [{ store: 'Coles', price: 2.4 }, { store: 'Woolworths', price: 2.5 }], priceBasis: 'Typical cost of the ingredients, rounded to 10c.',
  });
  const withFood = (d: any, mut: (f: any) => void = () => {}) => {
    d.ingredients.push(ing('ing-a'));
    const f = food();
    mut(f);
    d.foods.push(f);
    d.swaps.push({ cravingId: d.existing.cravings[0], alternativeId: f.id, note: 'A plain note.' });
  };
  const errs = (mut: (d: any) => void) => errorsFor((d) => mut(d));

  it('accepts a well-formed food', () => {
    expect(errs((d) => withFood(d))).toBe('');
  });
  it('rejects a food when any recipe ingredient lacks a per-100g value', () => {
    for (const key of ['energyKj', 'proteinG', 'fibreG', 'sugarG', 'sodiumMg']) {
      const msg = errs((d) => {
        withFood(d);
        delete d.ingredients.find((i: any) => i.id === 'ing-a').per100g[key];
      });
      expect(msg, key).toMatch(/ing-a.*(missing|per100g)/i);
    }
    expect(errs((d) => { withFood(d); delete d.ingredients.find((i: any) => i.id === 'ing-a').per100g; })).toMatch(/ing-a.*per100g/i);
  });
  it('rejects a recipe ingredient with no nutrition source or code', () => {
    expect(errs((d) => { withFood(d); d.ingredients.find((i: any) => i.id === 'ing-a').nutritionSourceId = 'nope'; })).toMatch(/nutrition source/i);
    expect(errs((d) => { withFood(d); d.ingredients.find((i: any) => i.id === 'ing-a').nutritionCode = ''; })).toMatch(/nutrition code/i);
  });
  it('rejects an unknown recipe ingredient and non-positive grams', () => {
    expect(errs((d) => withFood(d, (f) => (f.recipe[0].ingredient = 'ghost')))).toMatch(/ghost/);
    expect(errs((d) => withFood(d, (f) => (f.recipe[0].grams = 0)))).toMatch(/grams/);
  });
  it('requires a known traditionSourceId whenever traditions are given', () => {
    expect(errs((d) => withFood(d, (f) => delete f.traditionSourceId))).toMatch(/traditionSourceId/);
    expect(errs((d) => withFood(d, (f) => (f.traditionSourceId = 'nope')))).toMatch(/nope/);
  });
  it('rejects a tradition id that does not exist', () => {
    expect(errs((d) => withFood(d, (f) => (f.traditions = ['atlantis'])))).toMatch(/atlantis/);
  });
  it('requires prices between 0.2 and 15, rounded to 10c, from at least Coles and Woolworths', () => {
    expect(errs((d) => withFood(d, (f) => (f.prices[0].price = 0.1)))).toMatch(/price/i);
    expect(errs((d) => withFood(d, (f) => (f.prices[0].price = 15.1)))).toMatch(/price/i);
    expect(errs((d) => withFood(d, (f) => (f.prices[0].price = 2.45)))).toMatch(/10c/);
    expect(errs((d) => withFood(d, (f) => (f.prices = [f.prices[0]])))).toMatch(/Coles and Woolworths/);
    expect(errs((d) => withFood(d, (f) => delete f.priceBasis))).toMatch(/priceBasis/);
  });
  it('requires a recipeBasis and a significance source when significance is given', () => {
    expect(errs((d) => withFood(d, (f) => delete f.recipeBasis))).toMatch(/recipeBasis/);
    expect(errs((d) => withFood(d, (f) => (f.significance = 'Eaten at a festival.')))).toMatch(/significanceSourceId/);
    expect(errs((d) => withFood(d, (f) => { f.significance = 'Eaten at a festival.'; f.significanceSourceId = 'nope'; }))).toMatch(/nope/);
  });
  it('rejects a swap that references a missing item and a duplicate food id', () => {
    expect(errs((d) => { withFood(d); d.swaps.push({ cravingId: 'ghost', alternativeId: 'test-food', note: 'x' }); })).toMatch(/ghost/);
    expect(errs((d) => { withFood(d); d.foods.push(food()); })).toMatch(/duplicate/i);
  });
  it('requires every cultural item to be in at least one swap', () => {
    expect(errs((d) => { withFood(d); d.swaps.pop(); })).toMatch(/test-food.*swap/i);
  });
  it('rejects a non-unknown attribute with no attribute source', () => {
    expect(errs((d) => { withFood(d); const i = d.ingredients.find((x: any) => x.id === 'ing-a'); delete i.attributeSourceId; })).toMatch(/ing-a.*source/i);
    expect(errs((d) => { withFood(d); d.ingredients.find((x: any) => x.id === 'ing-a').attributeSourceId = 'nope'; })).toMatch(/nope/);
  });
  it('lets an all-unknown ingredient have no attribute source', () => {
    const unk = { vegetarian: 'unknown', vegan: 'unknown', halal: 'unknown', kosher: 'unknown', beef: 'unknown', pork: 'unknown', alcohol: 'unknown', gluten: 'unknown', allergens: 'unknown' };
    expect(errs((d) => { withFood(d); Object.assign(d.ingredients.find((x: any) => x.id === 'ing-a'), unk); delete d.ingredients.find((x: any) => x.id === 'ing-a').attributeSourceId; })).toBe('');
  });
  it('rejects health claims and "authentic" in a swap note', () => {
    expect(errs((d) => { withFood(d); d.swaps[d.swaps.length - 1].note = 'An authentic dish.'; })).toMatch(/authentic/i);
  });
});

describe('generated catalogue', () => {
  const built = () => buildCatalogue(data());
  it('has a FoodInfo for every existing alternative and every cultural item', () => {
    const d = data();
    const ids = new Set(built().foodInfo.map((f: any) => f.itemId));
    for (const id of d.existing.alternatives) expect(ids.has(id), id).toBe(true);
    for (const f of [...d.foods, ...d.cravings]) expect(ids.has(f.id), f.id).toBe(true);
  });
  it('every cultural price is sample-flagged and between 0.2 and 15', () => {
    const c = built();
    expect(c.prices.length).toBeGreaterThan(0);
    for (const p of c.prices) {
      expect(p.isSample).toBe(true);
      expect(p.pricePerServe).toBeGreaterThanOrEqual(0.2);
      expect(p.pricePerServe).toBeLessThanOrEqual(15);
    }
  });
  it('every swap references existing items and every cultural item is in a swap', () => {
    const d = data();
    const known = new Set<string>([...d.existing.cravings, ...d.existing.alternatives, ...d.foods.map((f: any) => f.id), ...d.cravings.map((f: any) => f.id)]);
    for (const s of d.swaps) {
      expect(known.has(s.cravingId), s.cravingId).toBe(true);
      expect(known.has(s.alternativeId), s.alternativeId).toBe(true);
    }
    for (const f of [...d.foods, ...d.cravings]) {
      expect(d.swaps.some((s: any) => s.cravingId === f.id || s.alternativeId === f.id), f.id).toBe(true);
    }
  });
  it('computes each cultural food nutrition from its recipe', () => {
    const d = data();
    const table = new Map(d.ingredients.map((i: any) => [i.id, i]));
    const c = built();
    for (const f of [...d.foods, ...d.cravings]) {
      expect(c.nutrition.find((n: any) => n.itemId === f.id), f.id).toEqual({ itemId: f.id, ...computeNutrition(f, table) });
    }
  });
  it('gives the existing smash burger beef yes, and pork unknown while its bread is unknown', () => {
    const c = built();
    const smash = c.foodInfo.find((f: any) => f.itemId === 'smash-burger');
    expect(smash.flags.beef).toBe('yes');
    expect(smash.flags.pork).toBe('unknown');
    expect(smash.flags.certifiedMeat).toBe(true);
  });
  it('derives kosher no for chicken with yoghurt and never marks a non-listed ingredient yes', () => {
    const c = built();
    expect(c.foodInfo.find((f: any) => f.itemId === 'chicken-tomato-curry').flags.kosher).toBe('no');
  });
});
