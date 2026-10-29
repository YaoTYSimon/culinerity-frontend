# Pantry and "cook from what you have": design

Status: design for review, 29 October 2026. Research: `docs/superpowers/research/2026-10-29-whatif-pantry-tradeoffs.md` section B (sources in the JSON next to it). Builds on the cultural-food feature (`2026-10-27-cultural-food-design.md`). Documentation only; no product code yet.

## Goal and the answer to "is there source code for this?"

Let a person list what they have at home (optional, on their device) and see simple, cheap recipes they can cook now or with one more thing, never suggesting anything that breaks their allergies, diet rules or a use-by date.

The research found no matcher, substitution engine or open recipe set that is safe to reuse (RecipeNLG non-commercial; Recipe1M and Food.com unverifiable; Wikibooks CC BY-SA share-alike; Open Food Facts is packaged products under ODbL; NHS text is OGL but UK-only and unchecked per page). So we write it: **original recipes in the app's own words**, built on the existing AFCD-backed ingredient table, and a small matching algorithm in the platform-free core. This is the same method as the 49 "Author's own simple recipe" foods already shipped.

## Scope

In: pantry (add, quantity, dates, staples, remove/undo, clear), a recipe dataset with generator and validator, matching and ranking, a results view, a recipe page, device-only shopping list, privacy and accessibility tests.

Out (release one): importing third-party recipes; free-text recipe entry; barcode scanning; live prices; meal planning; photos of recipes; any claim that food is safe; notifications about use-by dates (the same "in-page text only" rule as occasions); sharing a pantry or shopping list; metric/imperial conversion beyond grams and millilitres-as-grams.

## Core model (`packages/core/src/pantry/`, platform-free)

```ts
type DateKind = 'use-by' | 'best-before' | 'cooked' | 'opened';
interface PantryItem {
  id: string;                 // uuid-like, unique in the list
  ingredientId?: string;      // present when matched to the ingredient table; absent for free text
  name: string;               // display text, 1-40 chars, sanitised
  grams?: number;             // optional quantity, 1..50000, integer
  dateKind?: DateKind;        // both date fields or neither
  date?: string;              // YYYY-MM-DD, Melbourne local
  addedAt: string;            // ISO date-time
}
interface PantryState {
  items: PantryItem[];        // cap 200
  staples: string[];          // ingredient ids the person says they always have; cap 40
  serves: number;             // 1..8, default 2
}
interface ShoppingEntry { id: string; ingredientId?: string; name: string; recipeId?: string; addedAt: string }
```

`Profile` gains optional `pantry?: PantryState` and `shoppingList?: ShoppingEntry[]` (cap 100). Both are sanitised by `sanitizePantry` / `sanitizeShopping` inside `sanitizeProfile`, so a profile saved by an older build, or corrupt storage, loads as "no pantry" and never throws.

### Adding items

- Search the ingredient list: `searchIngredients(query, ingredients, limit = 8)` ranks by whole-name prefix, then word prefix, then substring, over `name` plus the editorial `aliases` table ("tinned tomatoes", "canned tomatoes", "chick peas"). Case-insensitive, diacritics-folded.
- Quick starters: round pills for a short editorial list taken from existing ids (rice, egg, pasta-dry, onion, garlic, tomatoes-tinned, chickpeas-canned, lentil-red, rolled-oats, flour-wheat, potato, carrot, milk, canola-oil). Labelled "Common starters, our pick", never a statistic. A tap adds the item; tapping again removes it (undo available).
- Free text: if a typed name matches nothing, "Add \"x\" anyway" stores a free-text item (no `ingredientId`). It is listed, can be removed, carries a quiet note "We have no details for this one, so we don't use it for recipes", and never affects a match or a safety result. Text is normalised (NFKC, control and zero-width characters removed, spaces collapsed, trimmed, max 40 characters), de-duplicated case-insensitively, and always rendered as literal text.
- Duplicates by `ingredientId` merge when neither has a date; otherwise they stay separate (two tubs with different use-by dates are different things).
- Quantity is optional and in grams (the field also accepts "kg", converted). Eggs and other counted items can leave it blank. A blank quantity means "enough"; it never blocks a recipe.
- A date is optional. Kinds: use-by, best-before, cooked on, opened on. Dates are plain `YYYY-MM-DD`, validated; a use-by in the past is allowed (the item is then set aside, see Safety).
- Remove has Undo (restores position and date); "Clear my pantry" has Undo; both fire `role="status"` messages.
- Cap: 200 items. The 201st add shows "Your pantry is full (200). Remove something to add more." and changes nothing.

### Staples (pantry assumptions, chosen by the person)

- Water is assumed in every recipe and never listed as missing.
- Salt and pepper appear in recipes only as "season to taste" text, are never counted, never missing, and carry no nutrition (sodium is therefore not modelled, `sodiumModelled: false`, the same as the cultural recipes).
- Everything else (cooking oil, sugar, flour, spices) is a staple only if the person marks it: a "Things I always have" section lists ingredient pills the person turns on (`aria-pressed`). A staple counts as present with no quantity and no date. Nothing is pre-selected. Staples are device-only.

## Recipe dataset

`docs/superpowers/research/2026-10-29-pantry-recipes.json` (sourced, validated), generated into `packages/core/src/recipes/generated/recipes.generated.ts` by `scripts/build-recipes.mjs` (`npm run build:recipes`; do not hand-edit the generated file; a freshness test fails if it is stale). Accessors in `packages/core/src/recipes/source.ts`.

```ts
interface Recipe {
  id: string; name: string; blurb: string;            // own words, blurb <= 100 chars
  traditions: string[];                                // ids from the cultural traditions; [] for basics
  serves: number;                                      // base serves, 1..6
  minutes: number;                                     // total, 5..60
  ingredients: RecipeIngredient[];                     // 2..9 counted rows
  seasonings: Array<'salt' | 'pepper'>;                // text only, not counted
  steps: string[];                                     // 2..8, each <= 160 chars, own words
  safety: Array<'rice' | 'pasta' | 'leftovers'>;      // drives the fixed NSW lines
  basis: string;                                       // "Author's own simple recipe: ..." as in cultural foods
  nutrition: { perServe: Nutrition; sodiumModelled: false };  // computed by the generator
  info: FoodInfo;                                      // derived flags, worst case over ingredients
}
interface RecipeIngredient { ingredient: string; grams: number; optional?: boolean }
```

- **Ingredients exist in the ingredient table.** The pantry's ingredient list is the 102 cultural rows plus `extraIngredients` in the new JSON (same schema as a cultural row: `per100g`, `nutritionSourceId`, `nutritionCode`, attributes, `attributeSources`, `basis`). New rows (for example tinned tuna, baked beans, frozen peas, canned corn, tinned kidney beans, bread, cheddar) are read from the AFCD Release 3 workbook exactly as the cultural pipeline did. If a value cannot be read, the row is not added and the recipe is not shipped; it goes in `notFound` with the reason. Never invent a nutrition value, flag or attribute. Unknown stays `unknown` and never passes a rule.
- **Every counted ingredient has per100g** (the validator rejects a recipe using one of the 20 cultural rows without nutrition).
- **Reuse, don't copy:** the generator imports `deriveFlags` and `computeNutrition` from `scripts/build-cultural.mjs` (already exported). The cultural generated file must remain byte-identical.
- **Prices:** `ingredientPrices` in the JSON, one row per ingredient used in any recipe: `{ ingredient, perKg: <dollars>, priceBasis }`, `isSample: true` implied, "Sample estimate: typical Melbourne supermarket price, rounded to 10c, not an observed price", the same pattern as the cultural recipes. The UI always says "Sample data".
- **Release-one size and mix:** target 48, floor 40 (the validator enforces the floor): about 12 basics (eggs, rice, lentils, pasta, canned fish, canned beans, frozen vegetables, oats, potato) with `traditions: []`, and the rest across the cultural traditions with at least 10 traditions having at least 2 recipes each. At least 20 recipes have `vegetarian: yes`. Every recipe is within 9 counted ingredients, 60 minutes, and a sample cost per serve at or under $4.00.
- **Cook-through safety gate:** no raw poultry, mince or raw seafood recipe ships unless the generator task reads and records an official cook-through source (recorded in `sources`, with the exact fact paraphrased in `safety` text). If none can be read, those recipes are left out and listed in `notFound`. Dried beans that need soaking and boiling are likewise out unless a source is recorded; use canned beans and split lentils. Steps never print a temperature or time for food safety unless the figure comes from a recorded source.
- **Own wording:** names, blurbs and steps are written for the app. The validator checks length and shape only; originality is a review item (the commit notes the author wrote them and used no third-party text).
- **Substitutions:** `substitutions: [{ from, to, note, why }]`, about 15 directional pairs, author's judgement recorded as `basis: "Author's judgement"`, with the nutrition of the substitute available from its own AFCD row. **The validator rejects a pair unless the two ingredients have identical diet flags and allergens** (so a substitution can never change whether a recipe fits a person's rules). Examples: red lentil to green lentil (note: "takes longer to soften"), chicken thigh to chicken breast, spinach to silverbeet, spaghetti to pasta-dry, olive oil to canola oil.
- **Sources** in the JSON: `afcd-r3` (CC BY 4.0, attribution to Food Standards Australia New Zealand), `nsw-fa-leftovers`, `nsw-fa-copyright`, `fsanz-date-marks`. Validation: every id referenced exists, https URL, licence, `accessed` date.
- **Freshness test** regenerates in memory and compares to the committed file; a test pins counts so a silent shrink fails.

## Matching and ranking (pure functions in `packages/core/src/pantry/`)

```ts
type Tier = 'now' | 'one' | 'few';        // 0, 1, 2-3 counted core ingredients missing
interface MissingItem { ingredient: string; grams: number; reason: 'absent' | 'past-date' | 'not-enough'; costCents: number | null }
interface AppliedSub { from: string; to: string; note: string }
interface RecipeMatch {
  recipeId: string; tier: Tier; have: number; core: number;       // core = counted, non-optional ingredients
  missing: MissingItem[]; subs: AppliedSub[];
  missingCostCents: number | null;                                // null when any missing item has no price
  usesSoon: string[];                                             // pantry item ids due within 3 days
  fit: 'fits' | 'check'; kitchen: boolean; certifiedMeat: 'halal' | 'kosher' | null;
  checkDates: string[];                                           // pantry item ids needing the "look and smell" line
}
function matchRecipes(input: { recipes: Recipe[]; pantry: PantryState; food?: FoodProfile; now: Date; prices: PriceTable; substitutions: Sub[] }):
  { matches: RecipeMatch[]; hidden: number; setAside: PantryItem[] };
```

1. **Usable items.** Start from pantry items with an `ingredientId` plus the person's staples. Drop items past a use-by (they are `setAside`). Drop high-risk items past a best-before (see Safety). Items with a `cooked` date are never used as ingredients.
2. **Have, substitute or missing**, per counted non-optional ingredient, scaled to the chosen serves (`grams * serves / recipe.serves`): present with enough grams (or no grams entered) is a have; entered grams below the need is `not-enough`; otherwise a listed substitution whose `to` is usable counts as a have and is recorded in `subs`; else missing. Optional ingredients never affect the tier.
3. **Tier** from the missing count: 0 `now`, 1 `one`, 2 to 3 `few`; 4 or more is not shown.
4. **Filters.** `fitsProfile(recipe.info, food)`: `out` is dropped and counted in `hidden`; `check` is shown with "Check the ingredients". An unknown never passes (inherited from `fitsProfile`).
5. **Order** (deterministic, no magic weights): tier; `fits` before `check`; more `usesSoon`; `kitchen` (a recipe tradition is one of `food.traditions`, case-insensitive, as swaps do); higher `have/core`; lower `missingCostCents` (null last); name. Ties keep input order.
6. **Cost.** `missingCostCents` sums `grams * perKg / 1000` per missing ingredient, rounded up to the next 10c in total; null if any price is missing, never 0. A recipe's cost per serve uses all counted ingredients.
7. **`suggestAdditions(matches, limit = 3)`**: the ingredients that appear as the single missing item in the most `one`-tier recipes, for the "Adding one or two more things would help" empty state.

Time is injected (`now`), Melbourne-local day maths via `weekBounds`/`addLocalDays` helpers from `packages/core/src/budget/week.ts`; tests run in `TZ=Australia/Melbourne`.

## Food safety (honesty first)

- The app never says food is safe, fresh or certified. Copy: "A guide, not a certification. Check labels and use your judgement."
- **Use-by** (FSANZ): food past its use-by date is set aside: never used in a match, listed under "Set aside" with "Past its use-by date. It shouldn't be eaten." The item itself can be removed. A use-by today is still usable and shown "Use by today".
- **Best-before past:** the item still counts, with "Past its best-before. Check it looks and smells right." For `highRisk` ingredients (meat, fish, eggs, milk, soft cheese, cooked rice and pasta; the flag lives on the ingredient row in the JSON, defaults to false only when recorded) a past best-before is treated like a use-by. Never infer safety from a missing date.
- **Cooked leftovers** (kind `cooked`): shown with an "eat by" label from the NSW rule (3 days; rice and pasta 2 days), then "Past the guide. Best to throw it out." They are reminders only and are not recipe inputs.
- **Opened:** "Opened 5 days ago" only. No verdict: no source for opened-item limits was found.
- **Fixed lines** on any recipe with `safety` tags, paraphrased in the app's own words from the NSW Food Authority leftovers page and shown with attribution "General guidance from NSW Food Authority (a NSW agency, not Victoria's). (c) State of New South Wales through the NSW Food Authority.": refrigerate leftovers within 2 hours; eat within 3 days, cooked rice and pasta within 2 days; reheat until steaming hot; do not reheat rice or pasta more than once; throw out food left out more than 4 hours in total. No temperature beyond what the source states.
- Pregnancy and weakened immune system: no claim made. A neutral line "If you are pregnant or have a weakened immune system, check food safety advice from your doctor or midwife." is shown only after the NSW "weakened immune system" PDF is read; until then the line is omitted (a plan task item).

## Views and copy (plate design system)

Two new views, `pantry` and `cook`, added to `View`, `Menu` and `App.tsx` ("My pantry", "Cook with what you have"). One `h1` each, via `FocusHeading`; focus lands on the heading. The recipe page is state inside `cook` (`openRecipeId`), not a route; Back returns to the list and restores focus to the row.

**My pantry**
- Intro: "Tell us what you have and we'll suggest what to cook. Optional." Shared-device sentence under the field: "Your pantry is saved on this device only. Anyone who can open your profile here can see it."
- Add field (`INPUT_CLASS`), suggestions list (`role="listbox"` with `aria-activedescendant`, or a plain list of PillButtons), starters pills, a "Things I always have" group, the list (grouped: "Use soon", "In your pantry", "Set aside"), quantity and date edit per row in a disclosure. Remove/Undo, "Clear my pantry".
- Shopping list section: entries with Remove/Undo and "Clear list", an "about $X (sample data)" total only when every entry is priced, and a link "Looking for something cheaper? See swaps" plus "Budget".

**Cook with what you have**
- Serves stepper (1 to 8), then sections: "You can cook this now", "Need one more thing", "Need a few more things". A row: name, "25 min · serves 2", status line ("Need one more thing: Tinned tomatoes (about $1.40, sample price)"), "Uses your spinach (use by Sat 31 Oct)", "Using green lentils instead of red", "Check the ingredients", kitchen mark "Fits your kitchen" like swaps.
- The line above the list: "Showing recipes that avoid what you told us to avoid. This is a guide, not a certification. Check labels." (shown only when the person has food settings; same wording as swaps).
- Hidden-by-rules line: "N recipes are hidden because of what you told us to avoid." No naming of which rule hid what beyond the person's own rule names.
- **Recipe page:** name, blurb, time and serves, ingredients with grams scaled to the chosen serves (each marked "in your pantry", "swap: green lentils", or "missing, about $0.80"), steps (numbered list), per-serve nutrition (energy, protein, fibre, sugars; sodium omitted because `sodiumModelled` is false, with the note "Salt isn't counted"), "About $1.30 a serve (sample data)", `NutritionCredit` (existing component), the NSW lines, "Add missing to my shopping list" (adds missing only; Undo), "Log as a meal" is deliberately absent.
- Round pills only; no cards, shadows or hairlines; semantic colours; 44px targets; no recipe photos (CC0 photos are not available per dish; the plate shape stands in).
- Kind tone: "Nothing close yet. Adding one or two more things would help: rice, onion." No streaks, scores, "waste" language, or shame about an empty pantry.

## Edge cases

| Input | Behaviour |
| --- | --- |
| No pantry | Cook view shows the empty state with a link to My pantry; nothing is suggested; no error |
| Huge pantry (200) | Matching is linear in recipes by ingredients; list shows the first 50 with "Show all 200" |
| Odd text (`<script>`, emoji, zero-width, 500 chars, only spaces, all caps) | Sanitised to a literal 40-char name; empty after sanitising is refused with a calm message |
| Use-by in the past / invalid date / far future (year 9999) | Past: set aside. Invalid: rejected with message. Dates beyond 5 years ahead rejected |
| Quantity 0, negative, `NaN`, "1e9" | Rejected; keeps previous value |
| Everything filtered by rules | Calm sentence, no blank screen |
| Only free-text items | Pantry lists them; Cook says none can be used yet and offers the ingredient search |
| Same ingredient twice with different dates | Both kept; the safer (earlier non-expired) one drives "use soon" |
| Stored pantry is a string, array, null, 10,000 items | Sanitised to empty or capped; never throws |
| Profile switch/lock | Pantry state keyed to the profile; nothing shown from the previous profile |
| Clock around midnight and DST (first Sundays of April and October) | Day maths via local-date helpers; tests pin both |

## Privacy

The pantry, staples, shopping list, dates and serves live only in the profile JSON on the device. They are never sent anywhere: recipes are bundled static data, so the feature makes **no network request at all**; not in the week share text, `document.title`, the URL, `data-` attributes, `console.*`, analytics, sessionStorage, cookies or IndexedDB. Nothing is inferred from name, suburb or location. "Clear my pantry" and "Clear list" always work; profile delete removes them; "Start from my current data" carries them over. The passcode is access control, not encryption: never claim more. `src/ui/pantryPrivacy.test.tsx` follows `foodPrivacy.test.tsx` (spies installed before the flow, detectors proven live).

## Accessibility

Keyboard-only operable; `aria-pressed` on starters and staples; status messages in `role="status"`; suggestions announced (`aria-live="polite"`, count only); focus management on view and recipe-page changes; AA contrast in all four themes; no horizontal scroll 320 to 1280px with 40-character names; reduced motion respected.

## Attribution and docs

Recipe page and Cook footer show the AFCD credit (existing) and the NSW notice. `AGENTS.md` (layout, product flow, data rules, privacy), `docs/FEATURES.md` and `docs/superpowers/research/README.md` get a "Pantry recipes data rules" paragraph.

## Open questions for the owner (not blockers for the plan)

1. NSW Food Authority guidance is used as general guidance because the Victorian pages were not found; keep, or find the Victorian page first.
2. Recipe wording and the cost-per-serve estimates are the app's own; a food-safety or dietitian review before launch is recommended.
3. Whether to also adapt NHS OGL recipe text (not in release one).

## Builder-check rulings

Reviewer pass over this document as a software engineer who cannot ask the author (`builder-check-prompt.md`, run inline because no subagents). Questions in order of importance, each ruled:

1. **Where do the recipe ingredient prices come from, since existing prices are per swap item, not per ingredient?** Ruled: a new `ingredientPrices` table in the recipe JSON, per kg, sample-flagged, rounded to 10c, one row per ingredient used; the UI always says "Sample data". Missing price gives a null cost, never 0.
2. **How does a substitution avoid breaking diet or allergy filters?** Ruled: the validator rejects any pair whose diet flags and allergens differ, so `fitsProfile` on the base recipe stays correct and no runtime recombination of flags is needed.
3. **Raw poultry, mince, seafood and dried beans have food-safety implications we have no source for. Ship them?** Ruled: no, unless the generator task reads and records an official cook-through or soaking source; otherwise they are left out and listed in `notFound`. The floor of 40 recipes stays.
4. **Are staples assumed?** Ruled: only water is assumed; salt and pepper are text-only seasonings; everything else is a staple only when the person marks it. Nothing pre-selected.
5. **Quantities: how precise?** Ruled: optional grams only; blank means "enough"; entered grams below the scaled need makes the item "not enough" (counts as missing). No unit conversion beyond kg.
6. **How is the cultural tradition boost weighted against "use soon"?** Ruled: no weights. Fixed order: tier, fits before check, use-soon count, tradition, coverage, cost, name. Use-soon outranks tradition because food waste is a loss for a budget household; tradition still outranks coverage and cost within a tier.
7. **Are free-text items used in matching?** Ruled: never. They are stored and shown with a quiet note. Search aliases handle common wording instead.
8. **How do cooked leftovers and opened items work?** Ruled: leftovers get an NSW-sourced "eat by" label and are not recipe inputs; opened items show elapsed days only (no source for limits, so no verdict).
9. **Do missing items go to a shopping list, and where is it shown?** Ruled: yes, minimal: device-only entries, shown in My pantry with Remove/Undo and Clear, sample total only if every entry is priced; no sharing; links to Swaps and Budget.
10. **New dataset or extend the cultural JSON?** Ruled: new JSON and generator importing `deriveFlags`/`computeNutrition` from the cultural script; extra ingredient rows live in the new JSON; the cultural generated file must not change.
11. **Does the feature need the server?** Ruled: no. Static bundled data, no requests, so no server or HTTP source changes.
12. **Pregnancy and immune-system line?** Ruled: omitted until the NSW PDF is read; tracked as a plan step.
13. **Branch?** Ruled: implementation on a new branch `feature/pantry-recipes` cut at execution time; this docs commit sits on `feature/whatif` only because the three sibling docs were written together.

Nothing else important is left.
