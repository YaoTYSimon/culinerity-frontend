# Melbourne Food Places Database Implementation Plan

> **STATUS: DRAFT. Do not start until the user has answered D1 to D7 in `docs/superpowers/research/2026-10-29-melbourne-food-places-sources.md` (section 10). Tasks marked [needs D#] depend on a specific decision. This is a skeleton: file lists, interfaces and tests are stated, bodies are filled in when the plan is approved.**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Grow Nearby from 15 hand-verified places to a few thousand honestly labelled Greater Melbourne food places (supermarkets, grocers, markets, bakeries, takeaway, cafes) from a permissively licensed source, without inventing prices, hours or healthiness, and without a single network request that carries a position.

**Architecture:** A scratch, deterministic pipeline (outside the repo's runtime) turns a pinned Overture Places release into small grid shards plus a manifest. Shards are same-origin static JSON, lazily fetched for the user's cell and its neighbours. The existing hand-verified `places.generated.ts` stays the "Checked by us" tier; bulk places are a second tier, "Listed, not individually checked". Core logic stays platform-free.

**Tech Stack:** Node >= 22 scripts (`.mjs`), DuckDB or the `overturemaps` CLI for extraction (run once in a scratch directory, never in CI), TypeScript, Vitest.

**Research:** `docs/superpowers/research/2026-10-29-melbourne-food-places-sources.md` and its JSON. Existing patterns: `scripts/build-places.mjs`, `packages/core/src/places/`, `docs/superpowers/research/README.md`.

## Global Constraints

- **No invented data.** A bulk place has name, coordinates, address text and category *exactly as the source gives them*. Price is `unknown` unless the operator's page states it. Hours are absent. No "healthy" claim: only category-derived labels ("Fresh produce", "Supermarket", "Bakery", "Takeaway", "Restaurant").
- **Licences:** only Overture Places (CDLA-Permissive-2.0 / Apache-2.0 / CC0 records), City of Melbourne CC BY, Victorian liquor licences CC BY 4.0 (existence cross-check), Wikidata CC0, and facts read from operator or council pages. OpenStreetMap only with D1 = yes and only as a separate ODbL file. Chains' locators, Google, Apple, Yelp, Tripadvisor, Zomato, Foodbank/SecondBite/OzHarvest locators: never.
- **Privacy:** no third-party requests; shard URLs are same-origin and cell-based; position is never stored or sent; the README states that the host can see which coarse cell was fetched.
- **Raw datasets are never committed.** The repo gets only the generated shards and a manifest (and the CDLA text, the notice file and the quality report).
- **Determinism:** pinned release id, sorted output, stable ids (`ovt-<GERS id>`), no timestamps in shards except `release`.
- Every task ends green: `npm test`, `npx tsc --noEmit` (root and packages/core), `npm run build`. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01CVJsJBKSnSRKS1F3CWccnQ`. Explicit paths only. No push. Sonnet only.

## Stage 0: Licences settled

### Task 0.1: Record decisions D1 to D7

**Files:** Modify `docs/superpowers/research/2026-10-29-melbourne-food-places-sources.md` (append "Decisions" with date and the user's words).
- [ ] Get the user's answers; copy them verbatim. If D1 = yes, list the ODbL duties (separate file, notice, public availability).
- [ ] Nothing in Stages 1 to 4 starts before this task is committed.

### Task 0.2: Data licences text [needs D2]

**Files:** Create `src/content/dataLicences.ts` (strings only), test `src/content/dataLicences.test.ts`; modify the footer/Menu link list to add "Data licences".
**Interface:** `export const DATA_LICENCES: { id: string; label: string; text: string; url: string }[]` containing Overture credit "Overture Maps Foundation, overturemaps.org" (with release), the CDLA-Permissive-2.0 text or URL, the Foursquare Apache-2.0 notice if D2 keeps those records, and City of Melbourne CC BY.
**Tests:** every entry has an https url and non-empty text; the Overture entry mentions the release id from the manifest; Foursquare entry present iff the manifest lists any Foursquare-sourced place.

## Stage 1: Pipeline, schema and validator

### Task 1.1: Schema extension

**Files:** Modify `packages/core/src/places/types.ts`, `scripts/build-places.mjs` (validator), `packages/core/src/places/places.test.ts`.
**Interface (additions only, existing 15 places stay valid):**
```ts
type PlaceKind = existing | 'supermarket' | 'greengrocer' | 'bakery' | 'takeaway' | 'cafe-restaurant';
type PriceBand = existing | 'unknown';
interface BulkPlace {
  id: string;            // 'ovt-<gers id>'
  name: string; kind: PlaceKind; lat: number; lng: number;
  address: string; suburb: string;
  priceBand: 'unknown' | 'budget' | 'mid';   // only 'typical' basis for bulk
  priceBasis: 'typical';
  label: 'fresh-produce' | 'supermarket' | 'bakery' | 'takeaway' | 'restaurant' | 'other';
  confidence: number;    // source confidence, 0..1, display never
  website?: string;
  origin: 'overture';
  sourceDataset: string; // from Overture sources[]
}
interface BulkManifest { release: string; generatedAt: string; cellDeg: number; cells: Record<string, {n: number; bytes: number}>; sources: PlaceSourceRecord[]; }
```
**Tests (write first):** rejects bulk place with `priceBasis:'stated'`; rejects missing name, address, or coordinates outside the Greater Melbourne box; rejects `confidence` below the threshold or NaN; accepts `priceBand:'unknown'`; rejects cafes/restaurants with a band other than `unknown`; existing 15 places still validate; a bulk place with unknown `sourceDataset` licence is rejected.

### Task 1.2: Extraction script (scratch, reproducible)

**Files:** Create `scripts/extract-overture.mjs` (documents the exact DuckDB or CLI call; takes `--release`, `--out <scratch dir outside the repo>`; refuses an `--out` inside the repo); create `scripts/lib/overtureFilter.mjs` (pure filter functions, tested without network).
**Interface:** `filterPlace(raw, opts) -> BulkPlace | {drop: reason}`; allowed taxonomy list in one constant; thresholds in one constant (`MIN_CONFIDENCE`, set after Task 4.1).
**Tests:** table-driven: closed (`operating_status`), confidence 0, no address, no name, outside box, disallowed taxonomy, duplicate within 50 m with the same normalised name (keep the highest confidence, then lowest id), Foursquare record dropped when D2 = drop. Output order is stable across runs (run twice on a fixture and compare).
- [ ] Fixture: 40 hand-written Overture-shaped rows in `scripts/fixtures/overture-sample.json` (synthetic and labelled so; not real places).

### Task 1.3: Shard builder

**Files:** Create `scripts/build-places-bulk.mjs`; output `public/places/manifest.json` and `public/places/cells/<ix>_<iy>.json`; add `npm run build:places-bulk`.
**Interface:** `cellKey(lat, lng, cellDeg=0.1) -> '<ix>_<iy>'`; `neighbours(cellKey) -> string[9]`.
**Tests:** every place lands in exactly one shard; a place on a cell edge is deterministic; each shard under the size budget (60 KB gzipped); total under 2 MB gzipped; the build fails otherwise; re-running produces byte-identical output.

### Task 1.4: Validator in CI

**Files:** Modify `package.json` (`check:places` script), existing test that fails if generated files are stale (extend to the manifest hash).
**Tests:** manifest hash mismatch fails; a shard referencing a source id missing from the manifest fails.

## Stage 2: Greater Melbourne from Overture

### Task 2.1: Count and filter report (before shipping anything)

**Files:** Create `docs/superpowers/research/2026-10-29-overture-melbourne-counts.json` (counts by taxonomy and confidence band, drops by reason, no raw rows).
- [ ] Run the extraction once in the scratch directory; record the true counts. Replace the planning assumptions in the research doc with measured numbers.

### Task 2.2: Core loader and ranking

**Files:** Create `packages/core/src/places/bulk.ts` (types, `loadCellsFor(position, fetcher)`, merge with the starter set), `packages/core/src/places/bulk.test.ts`; modify `rank.ts` if needed.
**Interface:** `type CellFetcher = (key: string) => Promise<BulkPlace[]>`; platform-free (fetcher injected from `src/`).
**Tests:** failing fetch for one cell does not break the list and shows a calm message; a position far outside Melbourne loads nothing; cells are cached in memory only; ranking by distance then label fit; ties by name then id; the checked tier is always labelled separately.

### Task 2.3: Web wiring and labels

**Files:** Modify `src/ui/Nearby.tsx` (second tier, "Listed, not individually checked", "Price not known", "Check hours before you go", release date line), add `src/location/cellFetcher.ts` (same-origin `fetch`, no credentials, no referrer), tests, Playwright screenshots at 320, 390, 1280.
**Tests:** no request contains lat/lng in the URL beyond the cell key; no `localStorage` write; both tiers announced via live region; 320px no horizontal scroll.

## Stage 3: Community food and relief (hand-read)

### Task 3.1: Council and charity pages

**Files:** Modify `docs/superpowers/research/2026-10-27-nearby-places.json` (or a new `2026-10-29-community-food.json` if that file is large), `scripts/build-places.mjs` only if the schema changes.
- [ ] For each Greater Melbourne council, read the council's own page for community meals, food pantries and markets; add a place only after reading operator or council page, with the existing rules (facts only, source, licence, checked date, hours only when stated).
- [ ] Draft a permission request to Foodbank Victoria / Infoxchange, SecondBite and OzHarvest [needs D5]; until a written yes is committed, link out only.
**Tests:** existing validator; each new place has `verification:'primary'`; none copied from a locator.

## Stage 4: Verification sampling and quality report

### Task 4.1: Sampling script

**Files:** Create `scripts/sample-for-verification.mjs` (seeded PRNG, stratified by kind and region, outputs a CSV-like JSON to the scratch directory), `docs/superpowers/research/verification-protocol.md` (how to check one place: operator page, council page, or ABN-free public listing; allowed outcomes: open and correct, moved, closed, never existed, unverifiable).
**Tests:** same seed gives the same sample; sample is about 5 percent with at least 30 per large stratum (or all of a small stratum); no overlap with already-verified places.

### Task 4.2: Run the check and publish a quality report

**Files:** Create `docs/superpowers/research/2026-xx-xx-places-quality-report.md` (precision per stratum with an interval, drop reasons, the threshold chosen, the release id) and tune `MIN_CONFIDENCE` in `scripts/lib/overtureFilter.mjs`.
- [ ] Gate: precision at or above the bar chosen in D4. If not met, tighten filters and resample; do not ship below the bar.
- [ ] Add a "Report a problem" link (prefilled email/issue, nothing sent by the app) and a suppress list `scripts/suppress.json` applied in the next regeneration [needs D6].

### Task 4.3: Refresh routine

**Files:** `docs/superpowers/research/README.md` section "Refreshing the bulk places": pin a new release, rerun extract, rebuild, resample 5 percent, compare with the previous report. Staleness message in the UI when the release is older than the cut-off from D4.

## Optional Stage 5 [needs D1 = yes]: OSM as a separate ODbL file

Separate script, separate shards `public/places-osm/`, a visible ODbL notice, never merged with Overture records, published under ODbL with the generator script. Not planned in detail until D1 is answered.

## Review Focus

- Any path where a bulk place shows a stated price, hours, or a health claim that no source states.
- Licence completeness: CDLA text shipped; Foursquare notice only where required; no OSM-derived rows in the Overture shards.
- Position privacy: cell keys only, no coordinates in URLs, no storage writes.
- Closed-place handling: `operating_status`, confidence 0, the suppress list.
- Size budgets enforced by the build, not by hope.
