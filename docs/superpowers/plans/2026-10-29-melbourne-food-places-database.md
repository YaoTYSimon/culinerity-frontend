# Melbourne Food Places Database Implementation Plan

> **STATUS UPDATE (2026-11-21): bulk tier SHIPPED on user ruling (D8 lifted, gate not passed, labelled unchecked); see "Ruling D8 LIFTED".**

> **STATUS: APPROVED-WITH-RULINGS (2026-11-03).** D1, D2, D3 and D5 are answered by the user (recorded in section 11 of the research doc). D4, D6 and D7 are **rulings made by the planner** and are flagged for the user to confirm; see "Rulings" below. Stage 0 and Tasks 1.1 and 1.4 (the part that needs no data) are done. Tasks 1.2 onward need downloads or a DuckDB/Overture run and have not started.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Sonnet only.

**Goal:** Grow Nearby from 15 hand-verified places to a few thousand honestly labelled Greater Melbourne food places (supermarkets, grocers, bakeries, takeaway, cafes) from Overture Maps (permissive licence), without inventing prices, hours or healthiness, and without a single network request that carries a position.

**Architecture:** A scratch, deterministic pipeline (outside the repo's runtime) turns a pinned Overture Places release into small grid shards plus a manifest. Shards are same-origin static JSON, lazily fetched for the user's cell and its neighbours. The existing hand-verified `places.generated.ts` stays the "Checked by us" tier (type `Place`, unchanged). Bulk places are a second tier, "Not checked by us" (type `BulkPlace`, in `packages/core/src/places/tier.ts`). Core logic stays platform-free.

**Tech Stack:** Node >= 22 scripts (`.mjs`), DuckDB or the `overturemaps` CLI (at `~/Library/Python/3.9/bin/overturemaps`) for extraction, run once in a scratch directory and never in CI; TypeScript; Vitest.

**Research:** `docs/superpowers/research/2026-10-29-melbourne-food-places-sources.md` (+ `.json`; decisions in section 11). Existing patterns: `scripts/build-places.mjs`, `packages/core/src/places/`, `docs/superpowers/research/README.md`.

## Decisions (user answers, verbatim summary)

- **D1 OpenStreetMap: NO.** Overture only. Optional OSM stage dropped.
- **D2 Foursquare-derived records: LEFT OUT** of the first pass (dropped in extraction; validator rejects them).
- **D3 Unchecked places: SHOW**, clearly marked "Not checked by us". The existing 15 stay a separate "Checked by us" tier.
- **D5 permission:** public-licence data only; scrape no operator, Foodbank, SecondBite or OzHarvest locator; link out only. No permission request.

## Rulings (planner's calls; the user should confirm)

Format: what, why, cost if wrong.

- **Ruling D4a, quality bar:** ship a stratum only if, on the 5 percent sample, at least 90 percent of places are "open and correctly located" **and** the lower end of the 95 percent Wilson interval is at least 85 percent. Each kind (supermarket, greengrocer, bakery, takeaway, cafe-restaurant) is judged on its own; a failing kind is left out, not averaged away. Why: a closed or misplaced shop costs a trip to someone with little money, so a point estimate alone is not enough and one good kind must not hide a bad one. Cost if wrong: too strict leaves out a kind or two (fewer places, safe); too loose sends people to closed shops. Raising the bar later is cheap, lowering it should need the user.
- **Ruling D4b, staleness:** starting confidence floor 0.7 (tuned in Task 4.2, never lowered below 0.6). Bulk places show a calm "may be out of date" line once the release is older than 6 months; the whole bulk tier is hidden once the release is older than 12 months (the checked tier still shows). Why: the research flags staleness as the main safety risk, and Overture releases are roughly monthly so 6 months is generous. Cost if wrong: hiding at 12 months removes the list if nobody refreshes; the refresh routine (Task 4.3) is the mitigation.
- **Ruling D6, repo and reports:** treat the repo as public (the safe assumption; nothing here needs it private, and Overture data is already permissive). "Report a problem" is a link the person taps: a prefilled `mailto:` or a prefilled GitHub-issue URL, never a request sent by the app. The body carries only the place id, name and the kind of problem (closed, moved, wrong, other); never position, never anything about the person. The address is a single constant `REPORT_PROBLEM_CONTACT` that the user must set; until set, the link is not shown. Do not put the user's personal email in the repo. Reports are triaged by hand into `scripts/suppress.json` (place ids), applied at the next regeneration. Why: no server, no storage, no data about a person. Cost if wrong: if the repo is private an issue link is useless, so mailto is the default; an unmonitored mailbox would be worse than no link, which is why the link stays hidden until the user sets it.
- **Ruling D7, cafes and restaurants without a price:** they may appear, labelled "Price not known", and they are **never** returned by the Free or Low cost filters. In fact no bulk place of any kind is returned by those filters (all bulk prices are unknown). Why: a place can be useful to find without a price claim; the filters must only match what a source states. Cost if wrong: some people will see restaurants they cannot afford; the label and the filter rule limit that, and the kind can be switched off by one constant if the user disagrees.
- **Ruling, schema deviation:** the draft extended `PlaceKind` and `PriceBand`. That would break every `Record<PlaceKind, ...>` and mislabel bulk places as having a price band. Instead `Place` is untouched and `BulkPlace` is a separate type with `price: 'unknown'` and no hours field. The `label` field is dropped; the label is derived from the kind (`bulkKindLabel`), so it cannot drift. Cost if wrong: the UI handles two types (planned in Task 2.3).
- **Ruling, City of Melbourne CLUE:** not used in the first pass (Overture is the only list). If Task 2.1 uses it for duplicate matching, add its CC BY credit to `buildDataLicences` in the same commit.

### Controller rulings of 2026-11-03 (flagged for the user to confirm)

Format: Ruling: what, why, cost if wrong.

- **Ruling R1, no locality as suburb:** Overture `locality` is "Melbourne" for 79 percent of kept rows, so it is not shipped or shown. A bulk place shows its street address and, when the source has one, a four-digit postcode (`BulkPlace.postcode`, optional); `suburb` is removed from `BulkPlace`, the shard and the validator (which rejects a `suburb` or `locality` field), and the `no-suburb` drop reason is gone. Typed suburb or postcode matching still goes only through the existing ABS POA centroid table; the bulk postcode is display only. Why: a locality that is wrong for most rows would mislead. Cost if wrong: people see no suburb name on bulk rows; rows with no postcode show the address alone.
- **Ruling R2, fresh-food kinds:** `BULK_KINDS` gains `butcher`, `fishmonger` and `deli` (taxonomy: butcher_shop; fishmonger and seafood_market; casual_eatery>delicatessen). Convenience stores, bars, pubs and bottle shops stay out. The Fresh filter matches greengrocer, butcher and fishmonger only (not supermarket or deli). Why: fresh food is the point of Nearby and these were the largest gap. Cost if wrong: about 540 more rows to sample-check; one allow-list line each removes them.
- **Ruling R3, label:** the supermarket label is "Supermarket or grocer" everywhere, because the allow-list maps all grocery stores to it. Cost if wrong: a longer label.
- **Ruling R4, closed places:** `operating_status` is null for about 99 percent of rows, so it cannot find closed places. The confidence floor stays 0.7 and the Task 4.2 sample check is the only real test of closure. Until Task 4.2 passes, bulk data must not be committed or shown. Cost if wrong: the sample may show the floor is too low and a kind must be dropped.
- **Ruling D8 LIFTED by the user (2026-11-21):** "You can label them as unchecked for now. Just keep creating the database." The D4a quality gate was NOT passed and the quality report (`docs/superpowers/research/2026-11-04-places-quality-report.md`) stays as the honest record of that. The user accepted shipping the bulk tier labelled "Not checked by us" instead. The UI line and the licence text say so plainly (a sample check did not confirm the places are open and correctly placed). Shipped: Overture release 2026-11-18.0 (newest official; the 2026-10-21.0 scratch data was gone), 19,959 places, 1,359 shards committed (then reduced the same day to 19,404 places in 1,339 shards by the quality rules in FEATURES.md) under `public/places/` (Task 4.3 says to commit shards, manifest and report). R4's "must not be committed or shown" is superseded by this ruling. The refresh routine is in the research README.
- **Ruling F2 (2026-11-21, supersedes the ordering part of F1; the user said to keep going without waiting, so this was decided by the agent and is reversible):** food relief is the most important kind for people facing food insecurity, and under F1 a pantry 700 m away was 147th of 351 rows (3011) and one in 3121 was 73rd of 845. In the unchecked tier, food relief rows are listed first as their own group, nearest first, under the sub-heading "Food relief (listings not checked)" (heading level 3, row names level 4), capped at 5 with "Show more food relief" only when the neighbourhood has more; then "Shops, cafes and takeaways" in the same distance order as before, without the relief rows repeated. No group and no heading render when there is no relief row nearby. The "Checked by us" list stays first of all, and "Not checked by us" with its unchecked line stays. Labels and the note are unchanged. To reverse: stop calling `splitReliefFirst` in `src/ui/NearbyBulk.tsx` and render `ranked` as one list (`rankBulk` itself is unchanged). The two Foodbank Victoria rows with warehouse-like addresses (441-459 Kororoit Creek Rd; 4/2 Somerville Rd) are left in and listed in the README as to be verified by a person; no rule guesses at them.
- **Ruling F1 (2026-11-21, food relief kind; ordering superseded by F2):** the user asked for food relief in the unchecked tier. Official taxonomy (read from release 2026-11-18.0 itself): one precise category, `community_and_government>social_or_community_service>food_bank` (28 rows across Australia's south-east query, 24 in the Greater Melbourne box); `soup_restaurant` is a restaurant, `homeless_shelter`, `community_center`, `charity_organization`, `social_and_human_service` and the parent are broad and NOT used. Kind `food-relief`, label "Food relief (listing not checked)", note "Check opening hours and who it is for before you go", no price line, distance ordering unchanged. Cross-check: a food relief row within 100 m of a checked place with a similar name is dropped (1: Earth Village Eats). Shipped 14 rows (Geelong Food Relief Centre, Gordon Street Little Pantry, Northpoint Centre Ltd, Foodbank Victoria x2, Planetshakers Empower, Diamond Valley Foodshare, Pascoe Vale Food Collective, Richmond Churches Food Centre, The Big Umbrella, Local 2 Community, Merri Food Hub, Gisborne Foodbank, Champion Foodbank And Community Hub). Name-only precision: 9/14 clear (64%), 12/14 (86%) counting plausible; borderline against the 70% rule, shipped because every row is labelled not checked, and the weak rows are listed for the user to suppress (`scripts/suppress.json`). None of the ten previously empty suburbs gained a row.
- **Decision D8, tier off until further notice (user, 2026-11-04):** the Task 4.2 sample check did not pass for any kind (see `docs/superpowers/research/2026-11-04-places-quality-report.md`), and the user said to keep the "Not checked by us" tier off until further notice. Do not commit or serve `public/places/` shards, and do not start Task 4.3 shipping, until the user lifts this. Task 3.1 (hand-read community food and relief places) is the next work on places.
- **Ruling R5, cell size (made while fitting the budget):** `CELL_DEG` is 0.015 (about 1.3 to 1.7 km), not 0.1. At 0.1 the CBD shard was 203 KB gzip; 0.02 missed by 165 bytes; 0.015 fits. Measured on release 2026-10-21.0 (19,263 places): 1,351 shards, largest 53,618 bytes gzip (limit 61,440), total 1,460,534 bytes gzip (limit 2,097,152); worst 3x3 request about 137 KB gzip. No per-cell cap was needed and no budget was weakened. Cost if wrong: the nearest 3x3 block guarantees only about 1.3 km of coverage, so outer suburbs may see few or no places; a wider ring or a larger cell with a per-cell cap would be the alternatives, and Task 2.3 should show an empty state. Shards are filed by the 5-decimal position they ship.
- **Shards are not committed yet:** shards are committed only after the Task 4.2 quality gate (see Task 4.3), so they stay in scratch.

## Global Constraints

- **No invented data.** A bulk place has name, coordinates, address text, postcode and category *exactly as the source gives them*. Price is `unknown`. Hours are absent (no field exists). No "healthy" or "cheap" claim: only category labels ("Supermarket or grocer", "Fresh produce", "Bakery", "Takeaway", "Cafe or restaurant", "Butcher", "Fishmonger", "Deli").
- **Licences:** only Overture Places records under CDLA-Permissive-2.0 or CC0-1.0 (the validator's allow-list), City of Melbourne CC BY only if Task 2.1 uses it, and facts read by hand from operator or council pages. Never: OpenStreetMap (D1), Foursquare-derived Overture records (D2), chain or charity locators, Foodbank/SecondBite/OzHarvest locators (D5), Google, Apple, Yelp, Tripadvisor, Zomato.
- **Privacy:** no third-party requests; shard URLs are same-origin and cell-based; position is never stored or sent; the README states that the host can see which coarse cell was fetched.
- **Raw datasets are never committed.** The repo gets only the generated shards, the manifest, the quality report and the filter-count report.
- **Determinism:** pinned release id, sorted output, stable ids (`ovt-<GERS id>`), no timestamps in shards.
- **Machine is loaded:** run targeted vitest while working, one full `npm test` at the end of a stage, then `npm run typecheck`. Do not run `npm run format`.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Explicit paths only. No push. Sonnet only.

## Stage 0: Licences settled (DONE)

### Task 0.1: Record decisions D1 to D7 (DONE)

Research doc section 11 records the user's answers and the rulings.

### Task 0.2: Data licences text (DONE)

`src/content/dataLicences.ts` exports `DataLicence`, `buildDataLicences(release | null)` and `DATA_LICENCES` (release not yet named). Entries: Overture credit ("Overture Maps Foundation, overturemaps.org" plus release) and the CDLA-Permissive-2.0 link. No Foursquare, OSM or ODbL entry (tested). CC0 records need no text.
- [ ] **Left for Task 2.3:** call `buildDataLicences(manifest.release)` from the page that shows credits and add a "Data licences" link to the Menu footer list. Not wired yet: no bulk data ships yet, and crediting data that is not in the app would be wrong.

## Stage 1: Pipeline, schema and validator

### Task 1.1: Schema extension (DONE)

`packages/core/src/places/tier.ts` (exported from core): `PlaceTier`, `BulkPlace`, `BULK_KINDS`, `BULK_LICENCES`, tier labels "Checked by us" / "Not checked by us", `BULK_PRICE_TEXT` "Price not known", `BULK_HOURS_TEXT` "Check hours before you go", `bulkKindLabel`, `bulkSourceLine(release)`. Tests in `tier.test.ts`. See the schema ruling above.

### Task 1.4a: Bulk validator (DONE, the part that needs no data)

`scripts/lib/validateBulk.mjs` (+ `.d.mts`): `validateBulkPlace`, `validateBulkPlaces`, `MIN_CONFIDENCE` 0.7. Rejects a stated price, any hours, missing name/address/suburb/release, coordinates outside the box, confidence below the floor or NaN, bad kind or id, Foursquare datasets, licences off the allow-list, non-https websites, duplicate ids and mixed releases. Tests in `validateBulk.test.ts` (also pins the lists equal to the core constants).

### Task 1.2: Extraction script (DONE: filter and script written and fixture-tested; the script is NOT yet run, that is Task 2.1)

**Files:** create `scripts/lib/overtureFilter.mjs` (pure), `scripts/lib/overtureFilter.test.ts`, `scripts/fixtures/overture-sample.json`, `scripts/extract-overture.mjs`.
**Interface:**
```js
export const ALLOWED_TAXONOMY_PREFIXES = []; // Task 2.1 fills this from the measured taxonomy list
export function kindForTaxonomy(taxonomy)       // -> BulkKind | null
export function normaliseName(name)             // lower-case, strip punctuation, collapse spaces
export function filterPlace(raw, { release, minConfidence }) // -> { place } | { drop: reason }
export function dedupe(places)                  // within 50 m and same normalised name: keep highest confidence, then lowest id
export function sortPlaces(places)              // by id
```
Drop reasons (a fixed list, counted in the report): `closed` (operating_status present and not operating), `no-name`, `no-address`, `no-suburb`, `low-confidence`, `outside-box`, `taxonomy`, `foursquare`, `licence` (contributing dataset not in the licence table). One constant table maps Overture `sources[0].dataset` to a licence: `meta`, `Microsoft`, `PinMeTo`, `BrightQuery` -> CDLA-Permissive-2.0; `AllThePlaces` -> CC0-1.0; `foursquare` -> dropped; anything unlisted -> `licence` drop. Confirm the table against the Overture attribution page when run and record the page date in the file.
**Steps (TDD):**
- [ ] Write `overture-sample.json`: 40 hand-written, clearly synthetic Overture-shaped rows ("(synthetic)" in the name) covering every drop reason, duplicates and an edge-of-box row.
- [ ] Table-driven test: one case per drop reason; dedupe keeps the highest confidence then lowest id; output is sorted; running the pipeline twice on the fixture gives byte-identical JSON; every kept place passes `validateBulkPlace`.
- [ ] Implement until green.
- [ ] `extract-overture.mjs`: `--release <id>` and `--out <dir>` required; exits with an error if `--out` is inside the repo (`path.relative`); prints the exact DuckDB or CLI command it ran (shape in research doc section 4, bbox 144.3,-38.6,145.8,-37.4); applies `filterPlace`, `dedupe`, `sortPlaces`; writes `bulk-places.json` and `drop-counts.json` to `--out`. **Do not run it until the user confirms duckdb is installed and approves the download.**
- [ ] Commit `feat: filter and de-duplicate Overture places (fixture-tested)`.

### Task 1.3: Shard builder (DONE, fixture-tested; real data not built yet)

**Files:** create `scripts/lib/cells.mjs` (+ test), `scripts/build-places-bulk.mjs` (+ `.d.mts`, test); outputs `public/places/manifest.json` and `public/places/cells/<ix>_<iy>.json`; add `"build:places-bulk"` to `package.json`.
**Interface:**
```js
export const CELL_DEG = 0.015; // Ruling R5 (was 0.1)
export function cellKey(lat, lng, cellDeg = CELL_DEG) // '<ix>_<iy>': ix = floor(round6((lng - 144.3) / cellDeg)), iy = floor(round6((lat + 38.6) / cellDeg))
export function neighbours(key)                        // the 9 keys, row-major, including the key itself, clipped to the box
// manifest: { release, cellDeg, box, count, cells: { [key]: { n, bytes } }, sources: [{ dataset, licence, url }], hash }
```
Shard file: `{ release, places: [ { id, name, kind, lat, lng, address, postcode?, website?, sourceDataset, licence } ] }`, sorted by id, coordinates to 5 decimals, sorted keys, trailing newline. `confidence` is not shipped (never shown); `source` and `price` are re-added by the loader.
**Tests:** every place lands in exactly one shard; a place exactly on a cell edge is placed deterministically (table test); `neighbours` returns 9 keys for an interior cell and fewer at the box edge; each shard is under 60 KB gzipped and the total under 2 MB gzipped (build exits non-zero otherwise; test with a synthetic oversized input); two runs are byte-identical; `hash` is SHA-256 of the shard bytes in key order.
- [ ] Commit `feat: build same-origin place shards and a manifest`.

### Task 1.4b: CI freshness check for the manifest (DONE; covered by npm test and npm run check:places-bulk)

**Files:** modify `package.json` (`check:places-bulk`); create `scripts/check-places-bulk.mjs` (+ test); a vitest test runs it so `npm test` covers it.
**Tests (temp-directory fixtures):** manifest hash mismatch fails; a shard whose count differs from the manifest fails; a shard place whose `sourceDataset` is not in `manifest.sources` fails; a shard file not listed in the manifest fails; every shard place passes `validateBulkPlace`. When `public/places/manifest.json` is absent the check passes and says "no bulk places yet".

## Stage 2: Greater Melbourne from Overture [needs the download]

### Task 2.1: Run once, measure, report (needs duckdb installed and the user's go-ahead)

**Files:** create `docs/superpowers/research/<date>-overture-melbourne-counts.json` (counts by taxonomy and confidence band, drops by reason, release id; no raw rows); modify `scripts/lib/overtureFilter.mjs` (`ALLOWED_TAXONOMY_PREFIXES`); update the "Melbourne coverage" bullet in the research doc with measured numbers.
- [ ] Choose the newest release listed at the Overture releases page; record id and date. Use `taxonomy` (`categories` is removed).
- [ ] Run `scripts/extract-overture.mjs --release <id> --out <scratch dir outside the repo>`.
- [ ] Read the taxonomy values actually present and fill `ALLOWED_TAXONOMY_PREFIXES` by hand: supermarkets, grocers and greengrocers, bakeries, takeaway, cafes, restaurants. Exclude bars, pubs, bottle shops and fuel stations.
- [ ] Look at the confidence histogram; confirm or adjust the 0.7 floor (never below 0.6).
- [ ] Commit `docs: measured Overture counts for Greater Melbourne`, then `feat: allow the measured food taxonomy`.

### Task 2.2: Core loader and ranking (DONE; real shards built in scratch and within budget)

**Files:** create `packages/core/src/places/bulk.ts` and `bulk.test.ts`.
**Interface (platform-free):**
```ts
export type CellShard = { release: string; places: Array<Omit<BulkPlace, 'price' | 'source' | 'release' | 'confidence'>> };
export type CellFetcher = (key: string) => Promise<CellShard>;
export function cellKey(lat: number, lng: number): string;          // same maths as scripts/lib/cells.mjs
export function neighbourKeys(key: string): string[];
export function loadBulkFor(pos: { lat: number; lng: number }, fetcher: CellFetcher): Promise<{ places: BulkPlace[]; failedCells: string[]; release: string | null }>;
export function rankBulk(places: BulkPlace[], pos: { lat: number; lng: number }): Array<{ place: BulkPlace; distanceM: number }>; // distance, then name, then id
export function bulkStaleness(release: string, today: string): 'fresh' | 'old' | 'hidden'; // 6 and 12 months (Ruling D4a/b)
```
**Built as:** `bulk.ts` also exports `BULK_BOX`, `BULK_CELL_DEG`, `cellPath(key)` (the only URL form, `/places/cells/<key>.json`), `bulkMatchesFilter` and `ShardPlace`; `rankBulk(places, pos, filter = 'all')`. The cell maths is pinned to the script in `scripts/lib/cells.test.ts`. `BulkPlace.confidence` is optional (shards do not carry it). The loader sends the fetcher a cell key only, so the request reveals a coarse cell (about 1.5 km) and nothing else; `nearbyPrivacy.test.tsx` checks it. Ranking is by distance alone (then name, then id); the page lists the checked tier first and bulk under its own heading. A shard of a different release, or a malformed one, counts as a failed cell.
**Tests:** one failing cell does not break the others and appears in `failedCells`; a position outside the box loads nothing and never calls the fetcher; no storage access; ties break by name then id; `bulkStaleness` at exactly 6 and 12 months; no bulk place passes any Free or Low cost filter (use the existing price filter in `rank.ts`; add a test with `price: 'unknown'`); `cellKey` equals the script's for a table of 10 points (import the `.mjs` in the test).
- [ ] Commit `feat: load and rank bulk places by cell`.

### Task 2.3: Web wiring, labels and credits (DONE 2026-11-04)

**Built as:** `src/location/cellFetcher.ts` (`createBulkSource`: manifest once, cells by key, absent manifest or a 404 or HTML means the tier is silently absent, cells not in the manifest are empty and not requested), `BulkContext.tsx`, `src/ui/useBulkPlaces.ts`, `bulkView.ts`, `NearbyBulk.tsx`, `NearbyBulkRow.tsx`, `NearbyMapsLink.tsx` (shared), `src/content/reportProblem.ts`, `bulkCanMatch` in core. `Nearby` takes an optional `today` (the release-date test hook). Place headings become h3 only when both tier headings show. Empty-state copy "No places in this list close to here." was not in the plan and is the implementer's wording. The Menu footer "Data licences" link was not added (credits show with the list). Verified with Playwright at 320, 390, 1280 in tobacco and cream; shards were copied in for that only and removed.

**Files:** modify `src/ui/Nearby.tsx`; add `src/ui/NearbyBulkRow.tsx` (+ test), `src/location/cellFetcher.ts` (+ test); modify `src/ui/Menu.tsx` footer links; a small "Data licences" disclosure using `buildDataLicences(release)`. Verify with Playwright screenshots at 320, 390 and 1280.
**Copy (exact):** headings "Checked by us" and "Not checked by us" (checked tier first); per bulk row: `bulkKindLabel`, address, `BULK_PRICE_TEXT`, `BULK_HOURS_TEXT`; below the list `bulkSourceLine(release)`; `old`: "This list may be out of date."; `hidden`: the tier is not shown and one line says "The wider list is being refreshed."; failed cell: "Some places could not load. Try again later."; "Report a problem" only when `REPORT_PROBLEM_CONTACT` is set (Ruling D6).
**Tests:** every fetch URL matches `^/places/cells/\d+_\d+\.json$`, uses `credentials: 'omit'` and `referrerPolicy: 'no-referrer'`, and carries no lat/lng; no `localStorage` or `sessionStorage` write; both headings present, checked tier first; a bulk row never shows a price band, hours, or the words cheap, healthy, budget; sections announced through the existing live region; 320 px has no horizontal scroll; the Free/Low cost filters exclude bulk rows.
- [ ] Commit `feat: show the not-checked tier on Nearby with its credits`.
- [ ] One full `npm test`, then `npm run typecheck`, then `npm run build`.

## Stage 3: Community food and relief (hand-read, no locators)

### Task 3.1: Council pages

**Files:** modify `docs/superpowers/research/2026-10-27-nearby-places.json` (or add a new research JSON if it grows); `scripts/build-places.mjs` only if the schema changes.
- [ ] For each Greater Melbourne council, read the council's own page for community meals, food pantries and markets. Add a place only from the operator's or council's own page under the research README "Places" rules: facts only, source, licence, checked date, hours only when stated, coordinates from the page's map link or Wikidata (CC0).
- [ ] D5: do not read or copy Foodbank, SecondBite or OzHarvest locators. The app keeps only its link out to Foodbank's Find Food page.
- [ ] Lists with an unclear licence (for example City of Casey) stay out; log them in `notFound`.
**Tests:** the existing validator; each new place has `verification: 'primary'`; `npm run build:places` run twice leaves no diff.

## Stage 4: Verification sampling and quality report [needs Stage 2 data]

### Task 4.1: Sampling script and protocol

**Files:** create `scripts/lib/sample.mjs` (+ test), `scripts/sample-for-verification.mjs`, `docs/superpowers/research/verification-protocol.md`.
**Interface:** `sampleStrata(places, { seed, fraction = 0.05, minPerStratum = 30 })` -> `{ stratum, places }[]`. Strata are kind x region (distance from the CBD at -37.8136, 144.9631: under 8 km, 8 to 20 km, over 20 km). A stratum with fewer than 30 places is taken whole. Seeded PRNG (mulberry32).
**Tests:** same seed, same sample; a different seed differs; a stratum of at least 600 places gets about 5 percent and never fewer than 30; small strata are taken whole; no sampled place is within 50 m of a place in `placeData.places` with the same normalised name.
**Protocol file:** check a place using only the operator's page, the council's page or another openly available listing. Outcomes: `open-correct`, `moved`, `closed`, `never-existed`, `unverifiable` (excluded from the numerator and reported separately). Record the date and page used.

### Task 4.2: Run the check and publish the report

**Files:** create `docs/superpowers/research/<date>-places-quality-report.md`; set the confidence floor in one shared constant used by `validateBulk.mjs` and `overtureFilter.mjs`.
- [ ] Gate (Ruling D4a): per kind, at least 90 percent open and correctly located, and the Wilson 95 percent lower bound at least 85 percent. Otherwise tighten filters and resample with a new seed; if it still fails, leave that kind out of the shards and say so in the report.
- [ ] Report: release id, sample size and outcomes per stratum, precision with interval, drop reasons, final confidence floor, exclusions and why.
- [ ] Add the "Report a problem" link (Ruling D6) and `scripts/suppress.json` (place ids applied during extraction; the build fails on an id not in the data).

### Task 4.3: Refresh routine

**Files:** `docs/superpowers/research/README.md` new section "Refreshing the bulk places"; one line each under Scripts and Layout in `AGENTS.md`.
- [ ] Steps: pin a new release; rerun extraction in a scratch directory; rebuild shards; resample 5 percent with a new seed; compare with the previous report; commit shards, manifest and report. Staleness behaviour is `bulkStaleness` (6 and 12 months).

## Known limitations and privacy notes (final review, 2026-11-04)

- **Typed suburb and the host:** a typed suburb maps to a fixed centroid and so to a fixed 3x3 block of cells. The host can therefore infer the area to about 1.5 km, exactly as for a device position. Nothing finer is sent, and no typed suburb or coordinate is in any URL.
- **Report a problem:** the mailto body carries the place id and name; the person types the problem type (closed, moved, wrong, other) after the prompt. It is not prefilled because that would need a second link per type; it holds no data about the person.
- **Dedupe (finding 8, FIXED 2026-11-21):** replaced by `dedupeDetailed` (grid by cell, normalised names with suffix variants, same-address matching, kind-aware winner: more specific kind, then confidence, then id; rule text in FEATURES.md). Old text, kept for the record: `dedupe` in `scripts/lib/overtureFilter.mjs` compares every kept row with every earlier kept row (O(n squared)) and recomputes `normaliseName` per comparison; about 19,000 rows take minutes, once per release, in a scratch run, so it is accepted. It also ignores `kind`: a bakery and a cafe with the same normalised name within 50 m collapse into the one with higher confidence. Cost: some real places missing from a lossy but deterministic list. A fix would precompute names and bucket by cell, and key on name plus kind.
- **Staleness boundaries:** fresh until exactly 6 months after the release date, old until exactly 12 months, hidden once older than 12 months (the day after).

## Review Focus

- Any path where a bulk place shows a price, hours, or a health or cheap claim no source states.
- Licence completeness: CDLA link shipped and release named; no Foursquare or OSM-derived rows; the dataset-to-licence table matches the Overture attribution page.
- Position privacy: cell keys only, no coordinates in URLs, no storage writes.
- Closed-place handling: `operating_status`, the confidence floor, the suppress list.
- Size budgets enforced by the build, not by hope.
- The two-type UI: the checked tier is always first and always separately labelled.
