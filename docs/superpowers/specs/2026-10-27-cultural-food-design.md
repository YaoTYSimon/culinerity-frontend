# Cultural food and "eat what fits": Design

Requested by the user on 27 October 2026: "a culturally significant food tracker which should also be an important part of the app, where people can eat what fits culturally." Written without a question round (the user is away from the keyboard); every decision is the designer's call and the user can change any. **Where the "Builder-check rulings" section at the end disagrees with an earlier section, the rulings win.** Builds on the plate design system, the swaps engine, the weekly tracker (`week`) and the nearby-options design (`2026-10-26-nearby-options-design.md`).

## Intent and why
Melbourne is one of the most culturally diverse cities in the world, and food insecurity is not only about money: a cheap swap that does not fit someone's faith, tradition or home cooking is not a swap they will eat. Today the app suggests swaps for common Australian cravings. This feature lets people say, in their own words and only if they want to, which foods and food rules matter to them, and then makes **swaps, the week tracker and nearby places fit them first**. It also lets people keep a simple record of the culturally meaningful meals they eat (family dinners, festival foods, fasting and feast days) as a quiet, positive streak of "meals that felt like home", which supports the app's cognitive-load framing without judging anyone.

## What gets built
1. **"My food" setup** (optional, from the number screen, Menu "My food", and the welcome flow as a skippable step): the person picks any of: food traditions or cuisines (a curated starter list of cuisines common in Melbourne, plus "Add your own" free text), dietary rules (halal, kosher, vegetarian, vegan, no beef, no pork, no alcohol, gluten-free, allergies as free text), and occasions (Ramadan, Lent, Diwali, Lunar New Year, Passover, Easter, Eid, Navratri and others, by the person's own choice). Nothing is inferred from name, language, suburb or anything else; nothing is pre-selected.
2. **Fit the swaps:** the swaps results honour dietary rules as hard filters (a halal rule never shows a pork swap) and traditions as a ranking boost ("Fits your kitchen" label in plain words), then the usual hunger-score ranking (cheaper at low scores, healthier at high). Where the catalogue has no fitting swap, the screen says so kindly and shows the closest options marked "check the ingredients".
3. **Cultural meals tracker** ("Meals that felt like home", a view under My week): add a meal in two taps (pick a tradition or "Other", dish name optional, who with optional: "family", "friends", "community", "alone"); the week shows a plate-style ring of days with at least one such meal, a plain sentence ("4 meals that felt like home this week"), and a calm list with Remove/Undo. No scoring, no targets, no shaming for zero.
4. **Occasion mode:** if the person chose occasions, the app shows a small, dated reminder during the occasion's real dates (computed from a bundled, sourced calendar table, e.g. Ramadan dates for the next few years from an authoritative source; lunar dates shown as "about" where they depend on sighting) with fitting swaps and budget context ("Eid meals often cost more: here is the budget view").
5. **Nearby fit (deferred, see ruling 8):** the Nearby view filters/boosts places that sell or serve fitting food (halal butcher, Asian grocer, Middle Eastern grocer, community kitchens run by cultural associations), using place tags from sourced data. This depends on the nearby-options feature and is built after it.
6. **Culturally aware catalogue:** extend the mock/seed catalogue and swap data with culturally significant foods and affordable, healthier equivalents across a starting set of cuisines (research-sourced: nutrition from FSANZ/AUSNUT or USDA FoodData Central, prices from the same mock/live price source). A researcher agent compiles it with a source per item; never invent nutrition values; flag uncertain items.

## Privacy and sensitivity (hard rules)
- Food traditions, dietary rules and occasions can reveal religion, ethnicity or health. They are **optional, stored only on the device (per profile if signed in), never sent to the server, never in the share text, never used for analytics**, and shown as the person's own words.
- Clear controls: edit or clear everything at any time ("Clear my food settings"), included in the existing profile delete.
- No inference, no defaults, no "recommended for your background". Wording says "choose what fits you".
- Respect and accuracy: no stereotyping or assumed links between a cuisine and a group of people; cuisine names and dietary-rule wording reviewed against authoritative sources (e.g. Halal Certification Authority guidance, Kosher Australia, Victorian Multicultural Commission/ABS cultural diversity classifications as references); allergies are described as "tell us what to avoid" with a note that the app does not replace labels or medical advice.
- Copy: warm, plain, no judgment; never presents a faith rule as a health claim.

## Data
- `FoodProfile { traditions: string[]; rules: DietRule[]; allergies: string[]; occasions: OccasionId[] }` on `Profile` (all optional; `sanitizeProfile` extended; free text length-limited and stripped).
- `CulturalMeal { id; at; tradition: string; dish?: string; with?: 'family' | 'friends' | 'community' | 'alone' }` on `Profile` (cap 200, same pattern as spend entries).
- Swap and catalogue items gain optional `traditions: string[]` and `ruleFlags` (`halal`, `kosher`, `vegetarian`, `vegan`, `containsBeef`, `containsPork`, `containsAlcohol`, `containsGluten`, plus `allergens`), with a `unknown` state: an item whose flags are unknown is never shown as satisfying a rule (shown as "check the ingredients").
- Pure core functions (names and exact types are in the rulings; tested, platform-free, `now` injected): `fitsRules(item, rules)`, `rankForProfile(items, foodProfile, score)`, `culturalWeek(meals, now)` (Monday week, DST-safe, reusing the budget week helpers), `occasionsOn(calendar, ids, now)`.
- Sourced calendar and catalogue datasets generated like the benchmark dataset (JSON + generator + freshness test, each row with a source and checked date).

## Constraints
Plate design system; cuisine "photos" only CC0 food photos (same sourcing rules); one h1 per view; AA contrast; 44px targets; keyboard operable; no horizontal scroll at 320 to 1280; no cards, chips, hairlines, shadows or gradients (selection uses round pill buttons with `aria-pressed`). Tests for filters (a rule never admits an item that violates or has unknown flags), ranking, week maths, sanitiser, privacy (nothing in the share text or server calls), clearing.

## Goals / non-goals / anti-goals
- **Goals:** swaps people will actually eat; a respectful, optional record of meals that matter; fits-first ranking in swaps, week and nearby.
- **Non-goals:** religious guidance or rulings, certification checks, recipe sharing, community features, calorie or macro tracking for meals, accounts on a server.
- **Anti-goals:** inferring identity, storing or transmitting sensitive data, stereotyping, treating halal/kosher etc. as claims the app has verified, shaming empty weeks.

## Calls made (designer)
1. Entirely optional, self-declared, nothing pre-selected. 2. Dietary rules are hard filters; traditions are a boost. 3. Unknown flags never count as a pass. 4. The tracker has no targets or scores. 5. Occasion dates come from a bundled sourced table, lunar ones shown as "about". 6. Starter cuisine list is curated and extensible by free text. 7. Nearby integration is built after the nearby feature. 8. Welcome flow gets a skippable step.

## Left to the builder
The starter cuisine and occasion lists (researched and sourced), component names, how the setup is laid out (one question per screen like the check-in is the default), the wording within the tone rules.

## Builder-check rulings

Run on 28 October 2026 as the builder-check reviewer (`brainstorming/builder-check-prompt.md`), with the user asleep. Every question below was ruled by the reviewer, preferring privacy, respect, accuracy and simplicity. The user may overturn any ruling; "Open for the user" at the end lists the ones that are really theirs. Facts below marked **read** were read from the cited page during this check; **not read** means the page was tried and gave no usable text, so the data task must read it before the row is used; **unsourced** means nothing was found and the thing is left out until it is.

### Questions the reviewer would have asked, in rank order

1. Which exact cuisines, rules and occasions, and on what evidence? 2. What does "halal", "kosher" or "vegetarian" mean for an item when the app cannot verify a kitchen? 3. Where does nutrition come from for composed dishes, and what are the licences? 4. How big is release one? 5. What is the exact data model, and what happens to existing profiles? 6. How does the tracker work in two taps with undo? 7. Where does it live in the UI, and how is privacy proved? 8. Does Nearby ship now? All are ruled below.

### Ruling 1: starter traditions (food traditions, named by food, never by people)

Evidence base (**read**, ABS 2021 Census QuickStats, Greater Melbourne, https://www.abs.gov.au/census/find-census-data/quickstats/2021/2GMEL, top responses only): ancestry English 25.6%, Australian 23.4%, Chinese 8.3%, Irish 8.3%, Scottish 7.1%; country of birth India 4.9%, China 3.4%, England 2.7%, Vietnam 1.8%, New Zealand 1.7%; language at home other than English Mandarin 4.3%, Vietnamese 2.3%, Greek 2.1%, Punjabi 2.0%, Arabic 1.8%; religion No religion 36.9%, Catholic 20.8%, Anglican 5.5%, Islam 5.3% (Hinduism and Judaism not in the top five; the national page, https://www.abs.gov.au/statistics/people/people-and-communities/cultural-diversity-census/2021, **read**, gives Islam 3.2% and Hinduism 2.7% nationally). Only the top five of each list were available. Ranks beyond five (Italian, Cantonese, Hindi, Sinhalese, Filipino, Macedonian, Korean, Turkish and others) are **not read**: the data task must read the ABS Community Profile (GCCSA 2GMEL) and record each rank, or label the starter entry "chosen for variety, not ranked".

Rulings:
- The list is a **convenience, not a claim** that these are the biggest or only groups. The screen says "Pick any that fit you, or add your own." The list is alphabetical, never ordered by size, and shows no counts.
- Names are of **food regions or home-cooking styles**, never "X people". Ids are stable slugs.
- Starter list (21): `afghan` Afghan; `australian` Australian home cooking; `british-irish` British and Irish; `chinese` Chinese (all regions); `east-african` East African (Ethiopian, Eritrean, Somali, Sudanese); `filipino` Filipino; `greek` Greek; `indian-north` Indian, North (including Punjabi); `indian-south` Indian, South; `indonesian-malaysian` Indonesian and Malaysian; `italian` Italian; `japanese` Japanese; `jewish` Jewish home cooking; `korean` Korean; `levantine` Lebanese and Levantine; `pacific-maori` Pacific and Māori; `persian` Persian; `sri-lankan` Sri Lankan; `thai` Thai; `turkish` Turkish; `vietnamese` Vietnamese. Every one is selectable even with no catalogue yet (rules still filter).
- **Aboriginal and Torres Strait Islander foods are not added to the starter list.** Naming bush foods and cultural protocols without the community's say is the kind of stereotyping this feature must avoid. Anyone can type their own. Adding it properly needs consultation (open for the user).
- Free text: up to 40 characters, "Add your own", at most 12 traditions in total. If the typed text equals (case-insensitively) a starter label or id, it is stored as that id.
- Matching to catalogue items is by id only. Own text never matches anything and is shown back verbatim.

### Ruling 2: dietary rules, flags, and the hard rule

Three-state flags per catalogue item, `'yes' | 'no' | 'unknown'`, with **`unknown` never passes**. Flags are not hand-typed: they are **derived by the dataset generator from ingredient attributes** (below), so a flag is only as strong as its ingredient evidence.

Item flags (replace the names in "Data"): `halal`, `kosher`, `vegetarian`, `vegan`, `beef`, `pork`, `alcohol`, `gluten` (each "contains" for the last four), `allergens: AllergenId[]` plus `allergensKnown: boolean`, and `certifiedMeat: boolean` (the dish uses meat or poultry whose acceptability depends on how it was slaughtered).

Rule requirement table (a rule is **met** only when the item's flag equals the value shown; `no` for the opposite value excludes; `unknown` shows as "Check the ingredients"):

| Rule id | Plain wording on the screen | Met when | Excludes when |
|---|---|---|---|
| `halal` | Halal | `halal = yes` | `halal = no` |
| `kosher` | Kosher | `kosher = yes` | `kosher = no` |
| `vegetarian` | Vegetarian | `vegetarian = yes` | `vegetarian = no` |
| `vegan` | Vegan | `vegan = yes` | `vegan = no` |
| `noBeef` | No beef | `beef = no` | `beef = yes` |
| `noPork` | No pork | `pork = no` | `pork = yes` |
| `noAlcohol` | No alcohol | `alcohol = no` | `alcohol = yes` |
| `glutenFree` | Gluten-free | `gluten = no` | `gluten = yes` |

Result per item is `fits | check | out`: `out` if any rule excludes; else `check` if any rule's flag is `unknown`; else `fits`. `out` items are hidden (not shown, and not offered with "show anyway"); `check` items sort after all `fits` items and carry "Check the ingredients".

Ingredient attribute rules the generator applies (an item flag is `yes`/`no` only if every ingredient's attribute allows it; any `unknown` makes the item `unknown`, except a single `no`/`yes` that decides it alone, e.g. one pork ingredient makes `pork = yes` regardless of the rest):
- `vegetarian`: `no` if meat, poultry, fish, shellfish, gelatine, lard or animal stock; `yes` if all ingredients are plant, egg, milk, yoghurt or honey; **cheese, stock cubes and processed sauces are `unknown`** (animal rennet, animal fat, fish sauce) unless the recipe names a labelled product.
- `vegan`: `no` if any animal product incl. egg, milk, honey; refined sugar, wine and processed sauces `unknown` unless a cited source decides.
- `halal`: `no` if pork, alcohol (wine, beer, spirits, mirin, sake), blood or lard. Meat and poultry set `certifiedMeat = true` and `halal = yes` only because the screen then always adds "Use halal-certified meat." Fish with fins and scales `yes`; **shellfish `unknown`** (schools of thought differ). Cheese, gelatine, stock, vanilla extract and processed sauces `unknown`.
- `kosher`: `no` if pork, shellfish, or meat and dairy in the same dish. Meat sets `certifiedMeat = true` with "Use kosher-certified meat." Fish with fins and scales `yes`. Wine and grape products, cheese, gelatine, stock `unknown`. Packaged ingredients always read "look for the kosher mark".
- `beef`/`pork`: `yes` if named; `unknown` for gelatine, stock, "meat", lard, sausage without a stated meat; else `no`.
- `alcohol`: `yes` if any alcohol is an ingredient even when cooked (we do not claim cooking removes it); `unknown` for vanilla extract and soy-style fermented sauces only if a source calls them out; else `no`.
- `gluten`: `yes` for wheat, barley, rye, soy sauce and anything containing them; **oats `unknown`** (cross-contact and avenin; Australian coeliac guidance is cautious); else `no`. A home-cooked recipe is never called "certified gluten-free": the row says "Choose ingredients labelled gluten-free" (FSANZ allows the claim only with no detectable gluten; secondary sources only, **section number not confirmed**: cite the Code text when the task reads it).
- `allergens`: from FSANZ's mandatory declaration list (**read**, https://www.foodstandards.gov.au/business/labelling/allergen-labelling, Standard 1.2.3 and Schedule 9): wheat, fish, crustacean, mollusc, egg, milk, lupin, peanut, soy, sesame; tree nuts each separately (almond, Brazil nut, cashew, hazelnut, macadamia, pecan, pistachio, pine nut, walnut); barley, oats and rye only if they contain gluten; sulphites at 10 mg/kg or more. `allergensKnown` is true only if every ingredient has an allergen entry; otherwise the item is `check` for any allergy rule.

Allergies are free text, but matched: a normaliser maps typed words ("peanuts", "nut allergy", "dairy", "shellfish", "gluten") onto the list above (`AllergenId`), so the allergy rule is "item `allergens` excludes it and `allergensKnown`". A word that maps to nothing is kept, shown back, and **cannot be checked**: the swaps screen then says "We could not check 'X'. Read every label." and every item shows "Check the ingredients". Allergy wording: "Tell us what to avoid. This does not replace reading labels or medical advice." No "allergy-safe" claim anywhere. "May contain" cross-contact is not modelled.

Definitions of halal and kosher are **not decided by the app**; it applies only the conservative ingredient rules above, never says an item "is halal/kosher" and never certifies. The sources to cite per attribute: the Halal Certification Authority (https://www.halalcertification.com.au/, **read: homepage only names "halal standards", gives no definition**), the Australian Government Authorised Halal Program, Kosher Australia ("What is Kosher?", https://www.kosher.org.au/, **not read: homepage is navigation**), Coeliac Australia and FSANZ for gluten, FSANZ Schedule 9 for allergens (read). The data task must read and cite a definition source per attribute row before the generator accepts a non-`unknown` value; until read, it stays `unknown` (safe).

### Ruling 3: occasions, calendar and reminders

Occasion ids (13): `ramadan`, `eid-al-fitr`, `eid-al-adha`, `lunar-new-year`, `diwali`, `lent`, `easter`, `orthodox-great-lent`, `orthodox-easter`, `passover`, `rosh-hashanah`, `hanukkah`, `christmas` (fixed, 25 December). `yom-kippur` is in the dataset but not selectable in v1: a fast day with no food swap to offer. **Navratri, Vesak, Mid-Autumn, Songkran are deferred**: no source was read this run. Anyone can type "my own occasion"; it is stored as text with **no reminder** (the app cannot compute it).

Calendar table for 1 Nov 2026 to 31 Oct 2029. Method per row is stated; the generator copies these into `calendar[]` with `source`, `method`, `checked: 2026-10-28`, and `approx`.

| Occasion | 2026-27 | 2027-28 | 2028-29 | Source and method |
|---|---|---|---|---|
| Ramadan (first fast to day before Eid) | 8 Feb to 8 Mar 2027 | 28 Jan to 25 Feb 2028 | 16 Jan to 13 Feb 2029 | Umm al-Qura calculated Hijri conversion (Aladhan API, method HJCoSA, **read**, https://api.aladhan.com/v1/hToG/01-09-1448 and 1449, 1450); 8 Feb 2027 and 28 Jan 2028 also match the expected dates on Wego and Awareness Days (secondary, **read**). **approx**: actual start depends on moon sighting; the Australian National Imams Council announces locally and may be a day later: **ANIC not read, no ANIC page found**. |
| Eid al-Fitr | 9 Mar 2027 | 26 Feb 2028 | 14 Feb 2029 | same method (1 Shawwal 1448, 1449, 1450); **approx** (plus or minus 1 day) |
| Eid al-Adha | 16 May 2027 | 5 May 2028 | 24 Apr 2029 | same method (10 Dhu al-Hijjah 1448, 1449, 1450); **approx** |
| Lunar New Year (first day) | 6 Feb 2027 | 26 Jan 2028 | 13 Feb 2029 | Wikipedia "Chinese New Year" table (**read**, secondary). Astronomical, not sighting: not approx. **Cross-check with Hong Kong Observatory yearly tables before shipping (HKO pages gave 404 at the paths tried)**. |
| Diwali (main day, Lakshmi Puja) | 8 Nov 2026 (about 6 to 10 Nov) | 29 Oct 2027 | 17 Oct 2028 | Wikipedia "Diwali" (**read**, secondary). The festival runs about five days and panchang practice varies by region: **approx**. 2029 (Nov) **unsourced**: left out until read. |
| Lent (Ash Wednesday to Holy Saturday) | 10 Feb to 27 Mar 2027 | 1 Mar to 15 Apr 2028 | 14 Feb to 31 Mar 2029 | Computed from Western Easter (below), 46 days before. |
| Easter (Good Friday to Easter Monday window; Easter Sunday is the main day) | 28 Mar 2027 (Good Fri 26) | 16 Apr 2028 (Good Fri 14) | 1 Apr 2029 (Good Fri 30 Mar) | Gregorian computus (anonymous/Gauss algorithm); 2027 Easter 28 Mar and Orthodox 2 May **match Wikipedia "Date of Easter" (read)**. Not approx. |
| Orthodox Great Lent (Clean Monday to Holy Saturday) | 15 Mar to 1 May 2027 | 28 Feb to 15 Apr 2028 | 19 Feb to 7 Apr 2029 | Computed from Orthodox Easter, Clean Monday = Easter minus 48 days; Greek Orthodox Archdiocese of Australia page **not read**: confirm the start day before ship. |
| Orthodox Easter | 2 May 2027 | 16 Apr 2028 | 8 Apr 2029 | Meeus Julian algorithm plus 13 days; 2027 matches Wikipedia. Not approx. |
| Passover (Pesach; begins at sundown the evening before) | 22 to 29 Apr 2027 (from evening 21 Apr) | 11 to 18 Apr 2028 (from evening 10 Apr) | 31 Mar to 7 Apr 2029 (from evening 30 Mar) | Hebcal API (**read**, https://www.hebcal.com, computed from the Hebrew calendar, deterministic). Not approx; the evening start is stated. |
| Rosh Hashanah | 2 to 3 Oct 2027 (from evening 1 Oct) | 21 to 22 Sep 2028 (from evening 20 Sep) | 10 to 11 Sep 2029 (from evening 9 Sep) | Hebcal. |
| Hanukkah | 4 Dec to 12 Dec 2026 (first candle evening 4 Dec) | 24 Dec 2027 to 1 Jan 2028 | 12 to 20 Dec 2028 | Hebcal. |
| Christmas | 25 Dec 2026 | 25 Dec 2027 | 25 Dec 2028 | Fixed date. |

(Yom Kippur is in the dataset only: 11 Oct 2027, 30 Sep 2028, 19 Sep 2029, from Hebcal.)

Rules: a lunar row shows "about" and a sighting caveat ("Dates depend on the moon being sighted and can differ by a day. Your community will confirm."). The date source is **never shown as religious authority**, only "calculated dates". A freshness test fails when the last calendar `end` is within 12 months of today, forcing a refresh; Melbourne local dates are used (no timezone shifting; evening starts are text).

Reminders, without nagging:
- Only for occasions the person ticked. **At most one reminder at a time** (the nearest), **one quiet line** at the top of the Swaps view and one section on My food. Never on the number screen, check-in, budget or week views. **No push notifications, no permission prompts, no badges, no email, no counters.**
- Appears from 7 days before the start through the end of the occasion (end plus 1 day when `approx`). A "Not now" text button hides it for that occasion-year (`dismissed: ['ramadan-2027']`, kept in the food profile, cap 20, pruned when the year has passed). It does not return once dismissed.
- Copy: "Ramadan starts about Mon 8 Feb. Dates depend on the moon sighting." Link "See swaps that fit". A second link "Look at your budget" only for gathering occasions (`eid-al-fitr`, `eid-al-adha`, `lunar-new-year`, `diwali`, `easter`, `orthodox-easter`, `passover`, `rosh-hashanah`, `hanukkah`, `christmas`), worded "Gatherings can cost more. Here is your budget." **Not** the earlier "Eid meals often cost more" (it assumes a household; stereotyping). No health claims about fasting. The reminder never filters swaps by itself.

### Ruling 4: the catalogue

- **Scope, release one:** the 21 traditions are selectable; the catalogue seeds **10 traditions x 5 foods = 50 culturally significant foods** (chosen for the Melbourne evidence above: `chinese`, `indian-north`, `indian-south`, `vietnamese`, `greek`, `italian`, `levantine`, `turkish`, `sri-lankan`, `filipino`), each paired with at least one existing craving or a **new craving** (about 10, e.g. "Takeaway butter chicken", "Takeaway souvlaki", "Pho from a shop", "Dim sum for lunch") and one or two affordable healthier home-cooked equivalents. Traditions with no catalogue yet say "We do not have swaps for [name] yet, but your food rules still apply." The existing 20 alternatives also get ingredient lists so flags exist for them.
- "Culturally significant" is stated plainly in a `significance` line per food written from a cited source ("Eaten at Lunar New Year, per [source]") or left blank. No "authentic", no claims about a group.
- **Nutrition (never invented):** per serve, `Nutrition` already has `energyKj, proteinG, fibreG, sugarG, sodiumMg`. A food has `nutritionBasis: 'dish-record' | 'computed'`. `dish-record` copies a published dish record (with code and version). `computed` is the generator summing `grams / 100 x per100g` over the recipe ingredients, where each ingredient's per-100g values are read from a source row (`sourceId`, food `code`, `version`, `retrieved`). kcal to kJ uses x 4.184. A food missing any of the five values for any ingredient is **not seeded** (listed in `notFound`). The UI says "Nutrition estimated from public food tables".
- **Sources and licences:** USDA FoodData Central is public domain / CC0 (data licence statement on https://fdc.nal.usda.gov, **not read in this check**, record the page). FSANZ Australian Food Composition Database (AFCD, formerly AUSNUT) is published by FSANZ under a Creative Commons licence; **the exact version (CC BY 3.0 AU or 4.0) is not confirmed**: the data task reads the FSANZ page and records the licence and attribution text on the source row; if it is not CC BY or CC0 compatible, use FDC only. Prefer AFCD for Australian foods, FDC for others. Attribution appears in the existing credits area.
- **Prices:** the same pattern as the mock price source: AUD per serve, `isSample: true`, labelled "Sample data", never presented as observed. A new cultural food's price is entered in `ITEM_RECORDS`-style data by the data task from a short documented basis ("typical cost of the ingredients, rounded to 10c"); a test checks every cultural price is between $0.20 and $15.00 and sample-flagged. Real price sourcing remains the repo-wide deferred item.
- **Method:** one research JSON (`docs/superpowers/research/2026-10-27-cultural-food.json`: `sources`, `traditions`, `rules`, `ingredients`, `foods`, `cravings`, `swaps`, `occasions`, `calendar`, `notFound`) + `scripts/build-cultural.mjs` validating and writing `packages/core/src/cultural/generated/cultural.generated.ts` + a freshness test, exactly like benchmarks and places. Every nutrition value, flag attribute and date has a `sourceId` with https URL, licence, `accessed` date and `verification` (`primary` / `secondary`). Items with an uncertain value are listed in `notFound` with the reason, not guessed. The mock catalogue, `SEED_DATA` and the server seed all consume the generated file so the HTTP mode serves the same flags.
- Photos: none required for foods; use existing drawn-illustration fallback. Any new photo must be CC0 or CC BY on Wikimedia Commons and be added to `credits.ts`.

### Ruling 5: Profile model, sanitiser, migration, deletion

```ts
export type DietRule = 'halal'|'kosher'|'vegetarian'|'vegan'|'noBeef'|'noPork'|'noAlcohol'|'glutenFree';
export type OccasionId = /* the 13 ids in ruling 3 */;
export interface FoodProfile { traditions: string[]; rules: DietRule[]; allergies: string[]; occasions: OccasionId[]; dismissed: string[] }
export interface CulturalMeal { id: string; at: string; tradition: string; dish?: string; with?: 'family'|'friends'|'community'|'alone' }
// Profile gains: foodProfile?: FoodProfile; culturalMeals?: CulturalMeal[]
```
- `tradition` is a starter id, `'other'`, or the person's own text (40 chars).
- `sanitizeFoodProfile(v: unknown): FoodProfile | undefined`: arrays only; rules and occasions filtered to known ids and deduped; traditions and allergies trimmed, NFC-normalised, control and zero-width characters stripped, whitespace collapsed, max 40 characters each, max 12 each, deduped case-insensitively; `dismissed` matches `^[a-z-]+-\d{4}$`, max 20; **returns `undefined` when all lists are empty** so an empty profile stores nothing. Free text is rendered through React (never `dangerouslySetInnerHTML`).
- `sanitizeMeals` follows `sanitizeSpendEntries`: valid id and ISO date-time, tradition and dish length-checked, `with` enum-checked, first id wins, **cap 200 and retain only the last 8 weeks**.
- **Migration: none needed.** Both fields are optional and absent on every existing profile, and `sanitizeProfile` already ignores unknown keys. Downgrade note: an older build would drop the two fields when it next saved; accepted.
- Storage: both fields live in the profile JSON, so they sit in `culinerity.profile.v1` (guest) or `culinerity.profile.v1.<id>` (profile), per profile, and **the existing profile delete removes them**. "Start from my current data" copies the guest profile, so it carries the food settings into the new profile: the My food screen says "These stay with this profile on this device." A test covers the move.
- Clear controls on My food: **"Clear my food settings"** removes `foodProfile`; **"Clear my meals"** removes `culturalMeals`; each shows "Cleared. Undo" for the rest of the visit (undo state in React only). No confirmation dialog (undo is the safety net, matching the budget pattern).
- Shared-device note: the passcode is access control, not encryption (AGENTS.md); My food says "Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device."

### Ruling 6: tracker UX ("Meals that felt like home")

- View `meals`, reached from a text button on My week and from My food and the Menu. h1 "Meals that felt like home".
- **Two-tap add:** tap 1 "Add a meal" shows the person's traditions as round pills plus "Other" (plus the day: "Today", with a small "Change day" for earlier days this week or last); tap 2 on a tradition **saves immediately**. A status line then reads "Added: Greek, today. Add details | Undo". "Add details" reveals optional dish name and "who with" pills (family, friends, community, alone); skipping is fine. If the person has no traditions, the pills are "Other" and a link "Set up My food".
- **Week ring:** seven round dots in a ring, Monday to Sunday (`culturalWeek`), filled when the day has at least one meal, today outlined; built in the plate language (flat fills, no hairlines), reusing `PlateRim` only if its API fits, else a small `WeekRing` SVG. `role="img"` with label "Monday to Sunday: meals on Monday, Wednesday and Saturday". Empty state never says "0": "Nothing here yet this week. Add a meal when you like." Count sentence: "1 meal that felt like home this week" / "4 meals ...".
- List: this week's meals newest first, each row: dish or tradition, day, "with family"; **Remove** then "Removed. Undo". Last week is shown under "Last week" collapsed in a `Disclosure`. No streaks, targets, totals over time, badges or comparisons.
- Pure core (`packages/core/src/food/meals.ts`): `addMeal(list, meal, now: Date)`, `removeMeal`, `restoreMeal`, `culturalWeek(meals, now: Date)`, same date window as `addSpend` (now or earlier, this or previous Monday week), using `weekBounds`, `addLocalDays`, `dayIndexMonday` from `budget/week.ts` (Monday week, DST-safe); `isIsoDateTime` in `budget/entries.ts` is exported for reuse (a refactor, not a copy).
- Meals are **never** in the share text, week card share, or Budget.

### Ruling 7: flow, layout, accessibility, wording, privacy tests

- **Welcome:** no extra step is inserted. Welcome gets a third, quiet text button "Tell us about your food (optional)" below "Skip to cheaper swaps"; it marks `welcomeSeen`, opens My food, and returns to Swaps on finish or skip. People who ignore it see nothing different. (Replaces "a skippable step" in call 8.)
- **Menu:** after Nearby: "My food" then "Meals that felt like home"; My week keeps its place. `View` gains `'food'` and `'meals'`.
- **My food:** a wizard like the check-in, one question per screen with progress, Back, Skip: (1) "Which food traditions fit you?" starter pills (`aria-pressed`) + "Add your own"; (2) "Any food rules?" the eight rules, each with one line of plain wording; (3) "Anything to avoid, like an allergy?" free-text tags with the labels note; (4) "Any occasions you would like a heads-up for?"; (5) review "You chose" with Save and "Change" per section. Once set, the view opens on a **summary** with the same sections, each "Change", then "Clear my food settings". Every screen says "Optional. Stays on this device. You can clear it any time." The h1 of each step takes focus (FocusHeading). Pills 44px, `aria-pressed`, grouped in `role="group"` with a labelled heading; free-text inputs use `FIELD_EDGE`/`INPUT_CLASS`; saved states are announced in a `role="status"` region; no horizontal scroll at 320 to 1280.
- **Swaps:** hide `out`; sort `fits` then `check`; tradition boost is a **+8 point nudge** on the 0 to 100 value in `rankForProfile` (never outweighs a 15-point cost/health gap); label "Fits your kitchen" shown when the item's `traditions` include one of the person's ids; "Check the ingredients" on `check` items; "Use halal-certified meat" / "Use kosher-certified meat" when `certifiedMeat`; one quiet line above the list when any rule is on: "Showing swaps that avoid what you told us to avoid. This is a guide, not a certification. Check labels." If everything is hidden: "We do not have a swap that fits all your food rules yet. You can change them in My food." (and list nothing else; no shaming).
- **Wording rules:** self-declared ("you chose", "you told us"), never inferred; never "your people", "authentic", "traditional for X people"; no health claims for faith rules; plain Australian English; no "failed".
- **Privacy test plan** (all automated, in `src/ui/foodPrivacy.test.tsx` and core tests): (a) `shareText` and the week share output never contain any food string for a profile with every field set; (b) with `VITE_USE_BACKEND`-style HTTP services and `fetch` spied, a full flow (set up food, search, rank, add meal) makes no request whose URL, headers or body contains any chosen string, any rule id or any meal text; (c) only the profile storage key changes (compare `Object.keys(localStorage)` before and after; nothing in `sessionStorage`, cookies or IndexedDB); (d) no `console.*` in the food files (grep test like Nearby); (e) clear removes the keys from the stored JSON, profile delete removes the key, and "Start from my current data" carries the fields; (f) food text never appears in `document.title`, URL, or `data-` attributes; (g) the server tests assert its routes accept no profile-shaped body (existing behaviour, one assertion).

### Ruling 8: Nearby tags

**Deferred to a later release, not built now.** Reason: the `Place` type has `kind`, `fit` (fresh, packaged, meals) and a free `note`, nothing about halal, kosher, cuisine or ingredients, and no place in the dataset has a source that states it. A tag is verifiable only when the operator's or certifier's own page says it ("Halal-certified butcher", a kosher mark, "Vietnamese grocer") and the page is recorded with a licence and checked date. Until then Nearby cannot honestly filter or boost, and an unverified tag would be a certification claim. The plan keeps a gated Task 7 with the interface (`Place.foodTags?: FoodTag[]`, per-tag `sourceId`, boost only, never a filter, never "halal" without the certifier's page) that is **not executed in this release**.

### Other decisions made

- **Search must reach the new cravings.** `findCravings` today searches only the 10 popular cravings, and `HttpCatalogue` preloads only those. `FoodCatalogue` gains `allCravings()` (search runs over it; popular cravings stay the 10 on the home screen) and `foodInfo(itemId)` (traditions, flags, significance); the HTTP catalogue loads both, and the server serves them from the same generated data. Without this, new cultural cravings could not be found.

- Ranking: `rankForProfile` wraps `rankSwaps`, which gains one additive output field `value` (the 0 to 100 blend it already computes) so the nudge can re-sort; it drops `out`, applies the +8 nudge, then orders `fits` before `check`, each by value; unpriced still last. Tradition ids only affect order, never inclusion.
- No server change to the API shape except that the catalogue endpoints serve the new flags and cultural items; no profile data reaches the server (see 7b).
- Docs: `AGENTS.md` Privacy rules and Product flow gain the food paragraphs; `docs/FEATURES.md` and the research README gain a Cultural food section.

### Open for the user

1. Aboriginal and Torres Strait Islander foods: add via community-led consultation, or leave to free text only (ruled: free text only for now).
2. Whether to ship halal/kosher at all before a halal/kosher authority has reviewed the ingredient rules (ruled: ship with the conservative `unknown` defaults and the certified-meat line, but a human from those communities should review the rules; nothing can be marked verified without it).
3. Replacing sample prices with real observed prices (repo-wide, still deferred).
4. Whether to expand beyond 10 traditions with catalogue foods in release one.

## Build notes

- **Default experience (final review ruling):** Swaps are identical to the pre-branch output for a person who has not chosen any food tradition. Cultural catalogue items (those with `traditions` non-empty, new in this branch) appear only when the foodProfile has at least one tradition and the item is tagged with one of the chosen traditions; rules and allergies then apply on top. Original items (no traditions) stay for everyone. This holds for swaps (`swapService`), for craving search (`CravingSearch`, via `shownForTraditions` in `food/coverage.ts`) and for the nutrition footnote (shown only when a cultural item is on screen). `swapService.golden.json` is recorded from the code at 88d044a for the ten popular cravings and is asserted exactly for no foodProfile, an empty one, and rules or allergies with no tradition that exclude nothing; with rules that do exclude items, only original items may remain.
- **Honest rules line:** "Showing swaps that avoid what you told us to avoid. This is a guide, not a certification. Check labels." Halal `yes` exists for 22 of 70 foods (plain unprocessed produce, pulses, grains and eggs, from a secondary definition page); kosher `yes` is on none; a halal-authority or community review is open.

