# Research dataset

`2026-10-26-food-security-data.json` is the single source of every benchmark figure shown in Culinerity (the budget tracker and the Data and policy page). `2026-10-26-food-security-sources.md` is the research report it came from.

## Rules

- No invented numbers. Change a figure only after reading its source, and record the change (value, evidence, source) in the commit message.
- Every indicator has a `sourceId` that resolves to a source with an `https://` URL, a reference `year`, and a `verification`:
  - `primary`: read from the source itself
  - `secondary`: read from a published report that cites it
  - `press`: press report only, not checked against the study
- `dated: true` marks figures that predate known changes; `isOlderData` also flags any figure more than five years before the current year.
- `note` is plain, user-facing text (what the figure means, its caveats). Remarks on how a figure was found (blocked pages, extraction, what was not opened) go in `research`, which is kept here and never shown.
- `notFound` items carry a `group` (`budget` or `policy`) so each screen lists only its own gaps.
- `decimals` (optional, 0 to 4) is how many decimal places the source writes (ABS lone-parent families 34.0, CPI 3.0), so a figure is never shown with fewer digits than its source.
- String-valued figures use `value: null` plus `display`.
- Different measures are never combined or put on one axis.

## Refreshing

1. Edit the JSON.
2. Run `npm run build:benchmarks`. It validates the dataset (unique ids, resolvable sources, https URLs, numeric values) and rewrites `packages/core/src/benchmarks/generated/benchmarks.generated.ts`.
3. Commit both files. A test regenerates the file in memory and fails if the committed copy is out of date.

## Places

`2026-10-27-nearby-places.json` is the single source of every place on the Nearby view. It is a small starter set, not a directory: it lists only places we could check, and says so. `notFound` records places that were looked at and left out, with the reason.

- Never invent a place, address, coordinate or opening hour. Every place is read from the operator's own page (or its council's) and carries a `sourceId` that resolves to a source with an `https://` URL, licence text and the date accessed.
- `checked` is the ISO date the source was read. It must be a real date, not after today's date in Australia/Melbourne (the validator uses that calendar date, not UTC).
- `hours` is the source's own words, short. No `hours` without a source that states them; if the page is unclear or contradicts itself, leave `hours` out.
- Coordinates come from the source's own map link or geodata, or from an openly licensed source (Wikidata, CC0). Record how in the source `title`. They must lie inside Greater Melbourne (lat -38.6 to -37.4, lng 144.3 to 145.8) and within about 100 m of the place. If no coordinate can be sourced openly, leave the place out and list it in `notFound`.
- Licence: where a listing's licence is unclear or differs between publishers (for example the City of Casey "Emergency Food Relief Groups": CC BY 3 on the state portal, none on the publisher's own page, "not specified" on data.gov.au), do not bulk-import it. Enter facts only, one place at a time, from the operator's own page.
- OpenStreetMap is not used (ODbL share-alike on a derived database). Foodbank Victoria and the Victorian Farmers' Markets Association lists are not copied.
- Price band defaults: `free` for food-relief and community-meal, `budget` for social-supermarket and co-op, `mid` for market and grocer, `pricier` only for accredited farmers' markets. A market or grocer may be `budget` only where the operator's own words say affordable or discount; the source `title` records those words.
- `priceBasis`: `stated` only when the source gives the price or says it is free ("free", a price or a range). "Affordable" alone is not a stated band: use `typical` with the note "Described as affordable by the operator; no prices stated."; `typical` when the band is only the default for the kind. Markets and grocers at `mid` are always `typical`: an estimate, not a sourced fact, and the view must label it as typical. A band that departs from the default needs `stated`. A `typical` free or budget place also needs a `note` that begins "Cost not stated" or "Described as affordable by the operator; no prices stated" (the generator checks).
- `note` is plain user-facing text (eligibility, what to confirm, phone numbers the page gives). `notices` are dated remarks from the source (`text`, `until` as YYYY-MM-DD, inclusive): the view shows one only while `until` has not passed (`activeNotices`), and a refresh deletes ended ones.
- `access`: `open` unless the operator states a condition; `referral` covers any stated eligibility check, card or appointment (put the condition in `hours`).
- `fit` may be an empty list when the source does not say what is on offer. Never guess it.
- The City of Casey "Emergency Food Relief Groups" list was re-read on 2026-10-27 and stays out: the state portal says CC BY 3 ("other", no licence text), the publisher's own page states no licence and "All rights reserved". Re-check before importing.
- Refresh: edit the JSON, run `npm run build:places` (validates and rewrites `packages/core/src/places/generated/places.generated.ts`), commit both. A test fails if the committed generated file is out of date.

## Centroids

`2026-10-27-melbourne-centroids.json` is the table behind "type a suburb or postcode" on the Nearby view (no geocoding service). It holds area-weighted centroids, rounded to 3 decimals (about 100 m), of the ABS ASGS Edition 3 (2021) Suburbs and Localities (SAL) and Postal Areas (POA), GDA2020, under CC BY 4.0 (stated on the ABS digital boundary files download page, read 2026-10-27).

- Suburbs are Victorian SALs and postcodes are POAs 3000-3207 and 3750-3999, kept when the centroid lies in the Greater Melbourne box (lat -38.6 to -37.4, lng 144.3 to 145.8). The box is wider than the metropolitan area, so some fringe and rural localities are included.
- Postcode labels read "postcode 3011" (a postcode spans several suburbs, so no suburb name is claimed).
- The national boundary files (about 160 MB) are never committed. To refresh, download `SAL_2021_AUST_GDA2020_SHP.zip` and `POA_2021_AUST_GDA2020_SHP.zip` from the ABS page into a scratch directory outside the repo, recompute centroids, update the JSON and its `source.accessed`, then run `npm run build:centroids` and commit both files. A test fails if the generated file is out of date.

## Cultural food

`2026-10-27-cultural-food.json` is the single source of the starter food traditions, the occasions and the occasions calendar (and, from Task 2, ingredient attributes, foods, cravings and swaps). `scripts/build-cultural.mjs` validates it and writes `packages/core/src/cultural/generated/cultural.generated.ts`.

- Never invent a value. Every nutrition value, ingredient attribute, flag basis and date has a `sourceId` that resolves to a source with an `https://` URL, licence text, `accessed` date and `verification` (`primary` or `secondary`). If a value cannot be read from a source it stays `unknown` (safe: `unknown` never passes a rule) or the food is not seeded, and the reason goes in `notFound`.
- Traditions name food styles or home-cooking styles, never people (the validator rejects "people"). Aboriginal and Torres Strait Islander foods are not added without community consultation (the validator rejects them).
- Calendar rows: dates are inclusive Melbourne-local `YYYY-MM-DD`; evening starts (Passover, Rosh Hashanah, Hanukkah, Yom Kippur) are stated in `note`. Hijri rows (Aladhan, method HJCoSA, calculated) and Diwali are `approx: true`; the validator enforces it. Easter, Lent, Orthodox Easter and Orthodox Great Lent are `method: computus` and must equal `scripts/computus.mjs` (Meeus/Jones/Butcher Gregorian computus; Meeus Julian plus 13 days), which `scripts/computus.test.ts` checks against published Easter dates. Hebcal rows are re-read from the Hebcal API. Lunar New Year is cross-checked against the Hong Kong Observatory tables (`https://www.hko.gov.hk/en/gts/time/calendar/text/files/T<year>e.txt`).
- Freshness: the validator fails with "calendar needs refreshing" when the last calendar `end` is less than 12 months after today (Melbourne). Refresh by re-reading each source, adding rows, and updating `checked`.
- Licence caution (same as the City of Casey case under Places): for the USDA FoodData Central and FSANZ AFCD nutrition tables read the licence page first and record it on the source row; if a licence is unclear or not CC BY / CC0 compatible, do not bulk-import. If AFCD is not CC BY compatible use FDC only. Do not copy lists with no stated licence.
- Catalogue: `ingredients` rows carry attributes (`vegetarian`, `vegan`, `halal`, `kosher`, `beef`, `pork`, `alcohol`, `gluten`, `allergens`) and, when used in a recipe, `per100g` values copied exactly from one AFCD Release 3 row (`nutritionSourceId`, `nutritionCode`, `nutritionName`). Every non-`unknown` attribute needs a source in `attributeSources` (or `attributeSourceId`); the generator rejects one without. `allergensPartial: true` lists the allergens known to be present while others may be (packaged goods). A kcal-only source is converted with x 4.184; AFCD gives kJ.
- Foods and cravings have a `recipe` (ingredient id and grams, one serve), a `recipeBasis` (the author's own simple recipe, never claimed as traditional), `traditions` with a `traditionSourceId` (a Wikipedia article summary placing the dish in a cuisine), `prices` (sample estimates for Coles and Woolworths, 0.20 to 15.00, multiples of 10c) with a `priceBasis`, and optionally a `significance` with a `significanceSourceId` (only where the source says it). Nutrition per serve is computed as sum(grams / 100 x per-100g), integers for kJ and sodium, one decimal for protein, fibre and sugars; a recipe ingredient missing any of the five values rejects the food. Flags are derived by `deriveFlags`, never typed.
- `swaps` link an existing or new craving to an alternative with a plain `note` (no "authentic", no people, no faith health claims); every new item must be in at least one swap. The 19 hand-entered alternatives get `existingAlternatives` ingredient lists (names and flags only, nutrition unchanged).
- AFCD Release 3 (CC BY 4.0 via the FSANZ copyright page; attribution "Food Standards Australia New Zealand") is the only nutrition source. USDA FoodData Central is CC0 (API guide, Licensing) and is the fallback if an ingredient is not in the AFCD. Halal uses Wikipedia (secondary) because the Halal Certification Authority gives no ingredient rules; kosher uses Kosher Australia 'What is Kosher?' facts; gluten uses Coeliac Australia; allergens use the FSANZ Schedule 9 list.
- Refresh: edit the JSON, run `npm run build:cultural`, commit both files. A test regenerates the file in memory and fails if the committed copy is out of date.
