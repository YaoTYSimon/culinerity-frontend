// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCultural, deriveFlags, melbourneToday, validateCultural, DATA_PATH, OUT_PATH } from './build-cultural.mjs';

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
