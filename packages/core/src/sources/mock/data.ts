/**
 * Mock data for Culinerity.
 *
 * ALL PRICES, NUTRITION FIGURES AND SUPPORT-PLACE DETAILS HERE ARE INVENTED
 * SAMPLE DATA, not real observations. Prices are plausible AUD per serve for
 * Melbourne in 2026 and every price/support record carries `isSample: true`.
 * Cravings, swaps and notes are adapted from the earlier app (cravings.ts).
 * Data only: matching and lookup logic lives in the mock classes.
 */
import type { FoodItem, Nutrition, PricePoint, SupportPlace } from '../../domain/types';

type Store = PricePoint['store'];
type Macros = [energyKj: number, proteinG: number, fibreG: number, sugarG: number, sodiumMg: number];

interface ItemRecord {
  item: FoodItem;
  unitLabel: string;
  prices: Array<[Store, number]>;
  macros: Macros;
}

const OBSERVED_AT = '2026-10-01';

const food = (id: string, name: string, category: string, keywords: string[] = []): FoodItem => ({
  id,
  name,
  category,
  keywords,
});

/** Cravings and alternatives with their sample prices and nutrition. */
export const ITEM_RECORDS: ItemRecord[] = [
  // Cravings
  { item: food('burger', 'Takeaway burger', 'fast food', ['burger', 'cheeseburger', 'big mac', 'whopper', 'mcdonald']), unitLabel: '1 burger', prices: [['Coles', 7.5], ['Woolworths', 7.8], ['Market', 8.5]], macros: [2300, 25, 3, 9, 1100] },
  { item: food('hot-chips', 'Hot chips', 'fast food', ['chips', 'fries', 'hot chips', 'french fries']), unitLabel: '1 regular serve', prices: [['Coles', 4.5], ['Woolworths', 4.8], ['IGA', 5.5]], macros: [2100, 5, 5, 1, 600] },
  { item: food('bubble-tea', 'Bubble tea', 'drink', ['bubble tea', 'boba', 'milk tea', 'pearl tea']), unitLabel: '1 regular cup', prices: [['Woolworths', 6.5], ['Coles', 6.8], ['Market', 7]], macros: [1500, 3, 0, 45, 90] },
  { item: food('instant-noodles', 'Instant noodle cup', 'convenience', ['instant noodles', 'noodle', 'cup noodle', 'ramen']), unitLabel: '1 cup', prices: [['Coles', 2.5], ['Woolworths', 2.4], ['Aldi', 1.9]], macros: [1450, 8, 2, 3, 1500] },
  { item: food('pizza', 'Delivery pizza', 'fast food', ['pizza', 'pepperoni', 'supreme', 'dominos']), unitLabel: '3 slices', prices: [['Coles', 6.5], ['Woolworths', 6.8], ['Aldi', 5.5]], macros: [3000, 28, 4, 8, 1700] },
  { item: food('chocolate', 'Chocolate bar', 'sweets', ['chocolate', 'chocolate bar', 'milk chocolate', 'dark chocolate', 'choc', 'cadbury', 'candy bar']), unitLabel: '50g', prices: [['Coles', 2.2], ['Woolworths', 2.1], ['Aldi', 1.6]], macros: [1150, 3, 1, 28, 60] },
  { item: food('fried-chicken', 'Fried chicken', 'fast food', ['fried chicken', 'kfc', 'nugget', 'chicken pieces']), unitLabel: '3 pieces', prices: [['Coles', 8], ['Woolworths', 8.5], ['IGA', 9]], macros: [2700, 30, 1, 1, 1500] },
  { item: food('kebab', 'Takeaway kebab', 'takeaway', ['kebab', 'shawarma', 'doner', 'halal snack pack', 'hsp']), unitLabel: '1 kebab', prices: [['Woolworths', 11], ['Coles', 11.5], ['Market', 10]], macros: [2800, 35, 5, 8, 1600] },
  { item: food('pastry', 'Bakery pastry', 'bakery', ['pastry', 'croissant', 'danish', 'sausage roll', 'pie']), unitLabel: '1 pastry', prices: [['Coles', 3.8], ['Woolworths', 3.9], ['Market', 4.5]], macros: [1600, 5, 2, 12, 400] },
  { item: food('soft-drink', 'Soft drink bottle', 'drink', ['soft drink', 'soda', 'coke', 'cola', 'fanta', 'sprite']), unitLabel: '600ml', prices: [['Coles', 3.8], ['Woolworths', 3.7], ['IGA', 4.2]], macros: [1050, 0, 0, 63, 25] },

  // Alternatives
  { item: food('smash-burger', 'Home smash burger', 'home cooking'), unitLabel: '1 burger', prices: [['Coles', 3.8], ['Woolworths', 3.6], ['Aldi', 3.2]], macros: [2000, 28, 4, 6, 600] },
  { item: food('chicken-salad-roll', 'Chicken and salad roll', 'home cooking'), unitLabel: '1 roll', prices: [['Coles', 3.4], ['Woolworths', 3.5]], macros: [1700, 26, 5, 5, 650] },
  { item: food('oven-wedges', 'Oven-baked potato wedges', 'home cooking'), unitLabel: '1 serve', prices: [['Coles', 1.1], ['Woolworths', 1], ['Aldi', 0.9]], macros: [1000, 4, 5, 2, 150] },
  { item: food('roast-chickpeas', 'Roasted chickpeas', 'home cooking'), unitLabel: '1 serve', prices: [['Coles', 0.9], ['Woolworths', 0.9], ['Aldi', 0.7]], macros: [900, 8, 7, 3, 200] },
  { item: food('homemade-milk-tea', 'Home milk tea', 'home cooking'), unitLabel: '1 cup', prices: [['Coles', 0.7], ['Woolworths', 0.7]], macros: [400, 3, 0, 8, 50] },
  { item: food('fruit-iced-tea', 'Cold-brew fruit tea', 'home cooking'), unitLabel: '1 glass', prices: [['Coles', 0.6], ['Aldi', 0.5]], macros: [150, 0, 0, 4, 5] },
  { item: food('egg-noodle-stirfry', 'Egg noodle veg stir-fry', 'home cooking'), unitLabel: '1 serve', prices: [['Coles', 2.2], ['Woolworths', 2.3], ['Aldi', 1.8]], macros: [1700, 16, 6, 5, 700] },
  { item: food('egg-fried-rice', 'Egg fried rice', 'home cooking'), unitLabel: '1 serve', prices: [['Coles', 1.8], ['Woolworths', 1.9], ['Aldi', 1.5]], macros: [1800, 15, 3, 2, 800] },
  { item: food('turkish-bread-pizza', 'Turkish bread pizza', 'home cooking'), unitLabel: '1 pizza', prices: [['Coles', 2.4], ['Woolworths', 2.5], ['Aldi', 2]], macros: [1900, 18, 5, 6, 800] },
  { item: food('spaghetti-pomodoro', 'Spaghetti al pomodoro', 'home cooking'), unitLabel: '1 serve', prices: [['Coles', 1.7], ['Woolworths', 1.6], ['Aldi', 1.3]], macros: [1800, 14, 6, 9, 450] },
  { item: food('banana-pb-toast', 'Banana and peanut butter toast', 'home cooking'), unitLabel: '2 slices', prices: [['Coles', 1.2], ['Woolworths', 1.2], ['Aldi', 1]], macros: [1600, 11, 6, 14, 300] },
  { item: food('cocoa-yoghurt', 'Cocoa yoghurt with banana', 'home cooking'), unitLabel: '1 bowl', prices: [['Coles', 1.4], ['Woolworths', 1.5]], macros: [900, 9, 2, 16, 80] },
  { item: food('baked-drumsticks', 'Oven-baked drumsticks', 'home cooking'), unitLabel: '3 pieces', prices: [['Coles', 3.2], ['Woolworths', 3.1], ['Market', 2.8]], macros: [1800, 36, 0, 0, 400] },
  { item: food('falafel-wrap', 'Falafel wrap with tahini', 'home cooking'), unitLabel: '1 wrap', prices: [['Coles', 2.6], ['Woolworths', 2.7], ['Market', 2.2]], macros: [2000, 14, 10, 4, 600] },
  { item: food('chicken-kebab-home', 'Home chicken kebab', 'home cooking'), unitLabel: '1 kebab', prices: [['Coles', 4], ['Woolworths', 4.1], ['Market', 3.6]], macros: [2100, 32, 6, 6, 700] },
  { item: food('oat-banana-muffin', 'Oat and banana muffin', 'home cooking'), unitLabel: '1 muffin', prices: [['Coles', 0.9], ['Woolworths', 0.9], ['Aldi', 0.7]], macros: [800, 4, 3, 9, 150] },
  { item: food('fruit-toast-ricotta', 'Fruit toast with ricotta', 'home cooking'), unitLabel: '2 slices', prices: [['Coles', 1.5], ['Woolworths', 1.6]], macros: [1200, 8, 4, 12, 250] },
  { item: food('sparkling-lemon', 'Sparkling water with lemon', 'home cooking'), unitLabel: '1 glass', prices: [['Coles', 0.4], ['Aldi', 0.3]], macros: [10, 0, 0, 0, 5] },
  { item: food('unsweetened-iced-tea', 'Unsweetened iced tea', 'home cooking'), unitLabel: '1 glass', prices: [['Woolworths', 0.3], ['Coles', 0.3]], macros: [10, 0, 0, 0, 5] },
];

/** Cheaper/healthier alternatives per craving, with the note shown to the user. */
export const SWAP_RECORDS: Array<{ cravingId: string; alternativeId: string; note: string }> = [
  { cravingId: 'burger', alternativeId: 'smash-burger', note: 'Smash a mince ball in a hot pan: more protein, less sodium than a chain burger. Turkish bread rolls are a cheap bun.' },
  { cravingId: 'burger', alternativeId: 'chicken-salad-roll', note: 'Same hand-held format with lettuce and tomato adding folate and vitamin C at negligible cost.' },
  { cravingId: 'hot-chips', alternativeId: 'oven-wedges', note: 'Toss potato wedges in a little oil and bake hot: crunchy for around $1 a serve.' },
  { cravingId: 'hot-chips', alternativeId: 'roast-chickpeas', note: 'Crunchy, salty and high in fibre and plant protein; tinned chickpeas are very cheap per gram of protein.' },
  { cravingId: 'bubble-tea', alternativeId: 'homemade-milk-tea', note: 'Brew strong tea, add milk and a little sugar: the same comfort for under a dollar.' },
  { cravingId: 'bubble-tea', alternativeId: 'fruit-iced-tea', note: 'Cold-brew tea with fruit slices in the fridge overnight, with far less sugar.' },
  { cravingId: 'instant-noodles', alternativeId: 'egg-noodle-stirfry', note: 'Egg noodles with frozen veg and soy: ready in 10 minutes with much less sodium and more fibre.' },
  { cravingId: 'instant-noodles', alternativeId: 'egg-fried-rice', note: 'Uses leftover rice, with an egg for protein and any veg you have on hand.' },
  { cravingId: 'pizza', alternativeId: 'turkish-bread-pizza', note: 'Turkish bread, passata and cheese under the grill: pizza night in 10 minutes.' },
  { cravingId: 'pizza', alternativeId: 'spaghetti-pomodoro', note: 'A bag of pasta and a tin of tomatoes makes several serves; cooked tomatoes are rich in lycopene.' },
  { cravingId: 'chocolate', alternativeId: 'banana-pb-toast', note: 'Sweet and filling with fibre and protein; a ripe banana does the sweetening.' },
  { cravingId: 'chocolate', alternativeId: 'cocoa-yoghurt', note: 'Stir cocoa into plain yoghurt with banana for the chocolate hit plus calcium.' },
  { cravingId: 'fried-chicken', alternativeId: 'baked-drumsticks', note: 'Drumsticks are cheap and stay juicy; bake with paprika and garlic for crisp skin without a deep fryer.' },
  { cravingId: 'fried-chicken', alternativeId: 'falafel-wrap', note: 'Chickpeas are an excellent plant protein and high in iron at a fraction of the price.' },
  { cravingId: 'kebab', alternativeId: 'falafel-wrap', note: 'Falafel with tahini sauce in pita: cheap, high in fibre, and very low cost per gram of protein.' },
  { cravingId: 'kebab', alternativeId: 'chicken-kebab-home', note: 'Marinate chicken in yoghurt, garlic and lemon, then pan-cook with salad and garlic sauce in flatbread.' },
  { cravingId: 'pastry', alternativeId: 'oat-banana-muffin', note: 'Batch-bake once for the week; oats and banana give fibre with little added sugar.' },
  { cravingId: 'pastry', alternativeId: 'fruit-toast-ricotta', note: 'Fruit toast with ricotta feels like a bakery treat with more protein and calcium.' },
  { cravingId: 'soft-drink', alternativeId: 'sparkling-lemon', note: 'Sparkling water with lemon keeps the fizz without roughly 16 teaspoons of sugar.' },
  { cravingId: 'soft-drink', alternativeId: 'unsweetened-iced-tea', note: 'Brew a jug of tea and chill it: refreshing for a few cents a glass.' },
];

/** The cravings shown on the home screen, in display order. */
export const POPULAR_CRAVING_IDS: string[] = [
  'burger', 'hot-chips', 'bubble-tea', 'instant-noodles', 'pizza',
  'chocolate', 'fried-chicken', 'kebab', 'pastry', 'soft-drink',
];

export const SUPPORT_PLACES: SupportPlace[] = [
  { id: 'monash-caulfield-pantry', name: 'Monash Caulfield Food Pantry', kind: 'pantry', suburb: 'Caulfield', notes: 'Limited stock and opening hours; registration required. Check with the student association before visiting.', isSample: true },
  { id: 'carnegie-community-fridge', name: 'Carnegie Community Fridge', kind: 'community-fridge', suburb: 'Carnegie', notes: 'Take what you need, leave what you can. Stock varies day to day.', isSample: true },
  { id: 'footscray-community-meal', name: 'Footscray Community Meal', kind: 'meal', suburb: 'Footscray', notes: 'Free weekly shared meal, open to everyone. No registration.', isSample: true },
  { id: 'clayton-pantry', name: 'Clayton Community Pantry', kind: 'pantry', suburb: 'Clayton', notes: 'Pantry staples and fresh produce when available. Ask staff about opening times.', isSample: true },
];

/** Flattened price records derived from ITEM_RECORDS. */
export const PRICES: PricePoint[] = ITEM_RECORDS.flatMap((r) =>
  r.prices.map(([store, pricePerServe]) => ({
    itemId: r.item.id,
    store,
    pricePerServe,
    unitLabel: r.unitLabel,
    observedAt: OBSERVED_AT,
    isSample: true,
  })),
);

/** Flattened nutrition records derived from ITEM_RECORDS. */
export const NUTRITION: Nutrition[] = ITEM_RECORDS.map(({ item, macros: [energyKj, proteinG, fibreG, sugarG, sodiumMg] }) => ({
  itemId: item.id,
  energyKj,
  proteinG,
  fibreG,
  sugarG,
  sodiumMg,
}));
