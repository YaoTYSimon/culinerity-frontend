# Melbourne food places: sources, licences and a data plan

Researched 2026-10-29. Machine-readable list: [2026-10-29-melbourne-food-places-sources.json](2026-10-29-melbourne-food-places-sources.json) (26 entries, each with the licence text as read, accessed date, coverage, fields, size, update frequency and verdict).

Scope: can Nearby grow from 15 hand-verified places to thousands (cheap eats, grocers, markets, bakeries, takeaway, supermarkets, community food, cultural grocers) without breaking the rules in the README: nothing invented, source + licence + checked date per place, price stated vs typical, hours only when stated?

## Short answer

1. **Yes for "where is the shop"; no for "is it cheap" or "is it healthy".** No open source states price or healthiness. Those must stay `unknown` or `typical` (section 5).
2. **The best base is Overture Maps Places**, which is permissive (CDLA-Permissive-2.0 plus Apache-2.0 and CC0 for some contributors) and carries none of OpenStreetMap's share-alike. It is also dirty: Overture's own docs say it has "duplicates, a high junk rate, and low property completeness". It needs filtering, de-duplication and sampling before any hungry person is sent to it.
3. **Keep OpenStreetMap out of the bundled data** unless the user accepts ODbL share-alike on the places database (section 2). The permissive route gets most of the value.
4. **Community meals and food relief cannot come from a bulk source.** Foodbank, SecondBite and OzHarvest locators are live services with no stated reuse licence. These stay hand-read from operator and council pages, as today, and stay small (tens, not thousands).
5. **Chains' own locators, Google, Apple, Yelp, Tripadvisor, Zomato: not allowed.**

Nothing here has been measured against Melbourne yet. Counts below are planning assumptions, labelled as such. Stage 1's first job is to count.

## 1. Overture Maps Places

- **Licence read:** the Places guide says the theme "is published under CDLA Permissive 2.0 and Apache 2.0, depending on the source" and "contains no OpenStreetMap data and carries none of the share-alike obligations" of ODbL. The attribution page lists Meta, Microsoft, BrightQuery, PinMeTo and others under CDLA-Permissive-2.0, Foursquare under Apache-2.0 (copyright notice and a NOTICE.txt), AllThePlaces under CC0.
- **CDLA-Permissive-2.0 text** (read at cdla.dev): data may be shared altered or unaltered "so long as the Data Recipient makes available the text of this agreement with the shared Data"; it has no attribution clause; it puts no obligations on "Results" of computation.
- **Obligations in practice:** (a) ship the CDLA-Permissive-2.0 text or URL beside the places file; (b) keep the Foursquare copyright line and Apache-2.0 notice for records whose `sources` include Foursquare (or drop those records); (c) add a credit line, "Overture Maps Foundation, overturemaps.org", with the release date. Overture suggests (c) but does not require it.
- **Per-record provenance:** each record has `sources[]` naming the dataset. Keep it in the working data and drop records from any source whose licence the user does not want to carry.
- **Fields:** names, `basic_category` (about 280 labels), `taxonomy` (about 2,300 categories), `confidence` (0 to 1, existence only), `operating_status`, addresses, websites, phones, brand. **No opening hours, no price, no diet tags.** `operating_status` "does not indicate opening hours". The older `categories` field is removed as of the September 2026 release, so use `taxonomy`.
- **Quality:** confidence "is a relative filtering tool rather than a precise probability" and does not fix duplicates or missing properties. Meta supplies about 60 million of about 88 million records, so mobile-mapped and social-page-derived entries dominate.
- **Melbourne coverage (measured 2026-11-03, release 2026-10-21.0):** 260,288 places in the Greater Melbourne box, 27,648 in the allowed food taxonomy, **18,493 kept** after the closed, address, confidence 0.7, Foursquare and 50 m duplicate filters (cafe-restaurant 13,713, takeaway 1,704, supermarket 1,533, bakery 1,238, greengrocer 305). See `2026-11-03-bulk-places-count-report.md`. Overture's `locality` is "Melbourne" for 79 percent of them, so it is not a usable suburb.
- **Extract offline without the whole planet:** the Overture CLI streams a bbox and transfers the minimum data (`overturemaps download --bbox=144.3,-38.6,145.8,-37.4 -f geoparquet --type=place -o <scratch>/places.parquet`). DuckDB can read the S3 parquet (`s3://overturemaps-us-west-2/release/<release>/theme=places/type=place/*`, region us-west-2) with `bbox.xmin`/`bbox.ymin` BETWEEN filters (point features, so min values suffice), then filter on `taxonomy` and `confidence`, and write a small file. Pin the release in the script for determinism. Run on 2026-11-03 with DuckDB reading the public bucket (the `overturemaps` CLI could not find release 2026-10-21.0 by id).
- **Verdict: usable with attribution.**

## 2. OpenStreetMap (Geofabrik, Overpass)

- **What exists:** Geofabrik's Victoria extract is 231 MB, data to 2026-10-28, "License: ODbL 1.0". A rough Overpass count for bakeries, greengrocers, convenience stores and butchers in a Greater Melbourne box found about 1,718 nodes and 1,074 ways. Restaurants, cafes and supermarkets were not counted because the public Overpass server returned "at capacity" errors, and its policy says commercial use should use a self-hosted or paid server. OSM tags are richer than Overture (`cuisine`, `diet:vegetarian`, `opening_hours`, `website`) but patchy.
- **ODbL, read from the licence text:** a "Derivative Database" is "a database based upon the Database", including any "arrangement, modification". 4.4: "Any Derivative Database that You Publicly Use must be only under the terms of" ODbL. Extracting "the whole or a Substantial part of the Contents into a new database" makes a Derivative Database. Using a database to create a Produced Work does not by itself create one (4.5), and internal, non-public use of a derivative does not trigger share-alike. Produced Works still need a visible notice linking to the source and naming the licence.
- **What that means for Culinerity (not legal advice):**
  - A places file built by extracting OSM food places is a Derivative Database. Shipping it in a public app is "Publicly Use". The file would have to be offered under ODbL, which in practice means publishing it (the generated file in the repo already is, if the repo is public) and keeping it ODbL.
  - OSMF's Substantial guideline says systematic extraction such as "all eating places in an area" is Substantial, and "repeated small extractions" count as one big extraction. Under 100 one-off features is not Substantial; we are far above that.
  - **The share-alike scope is the places database, not the whole app.** The OSMF guidance on Collective Databases says a data type made entirely of non-OSM data in a regional cut stays independent. So the app code, the 15 hand-verified places and the Overture places would remain under their own terms *if* they are kept in separate files with separate provenance. Merging OSM and Overture records into one deduplicated table would make the merged table derivative.
  - A rendered "map" or a ranked list on screen is arguably a Produced Work, but the app also ships the underlying data, so Produced Work does not save a bundled extract.
  - **Geocoding** guidance (page linked from the OSMF guidelines) could not be read in full; do not rely on a "we only used OSM to place a pin" argument.
- **Is a separate, clearly licensed derived database workable?** Yes: publish `osm-places` as its own ODbL file (e.g. `places.osm.json`) with a notice screen and a "Data licences" page. It adds value (cuisine, hours, diet tags) at the cost of a licence that forbids later relicensing, and a duty to keep it open and updated.
- **Recommendation:** do not use OSM in the first release. Use Overture. Offer OSM later only if the user accepts ODbL on a separate file (decision D1).
- **Verdict: share-alike.**

## 3. Public and civic data

| Source | Licence read | Usable? |
| --- | --- | --- |
| City of Melbourne, Cafe, restaurant, bistro seats (CLUE) | Portal metadata: CC BY (4.0 link). 66,356 rows, 2002 to 2024, processed 2026-03-16. Fields: trading name, address, ANZSIC4 class, indoor/outdoor seats, lat/long. | Usable with attribution. City of Melbourne LGA only (CBD and inner suburbs). A year-old snapshot, no hours. Useful to confirm a place exists and to catch Overture duplicates, not as the main list. |
| City of Melbourne, Bar, tavern, pub patron capacity | CC BY, 5,304 rows | Usable, irrelevant to cheap healthy food. |
| City of Melbourne drinking fountains (338), public barbecues (65) | CC BY | Usable; optional later "free water" layer. |
| City of Melbourne markets, street food vendors, food premises | **No such dataset.** A scan of all 238 portal datasets found only the five above. | n/a |
| Victoria, liquor licences (Liquor Control Victoria, data.vic.gov.au) | CC BY 4.0, monthly CSVs, geocoded, restaurant and cafe licence file | Usable with attribution; licensed (mostly sit-down) venues only. An existence cross-check. |
| Victoria, food premises registers | **No open register on data.vic.gov.au** (search returned zero food datasets). Health publishes only council totals (107,063 registered premises in 2023). | Nothing to take. |
| City of Port Phillip portal | Datasets mixed CC BY 2.5 AU and CC BY-SA 4.0 (share-alike). No food dataset found. | Nothing to take. |
| Other councils (Yarra, Darebin, Merri-bek, Maribyrnong, Brimbank, Dandenong, Casey, Whitehorse, Monash, Boroondara) | Not read. No open food dataset found for Yarra or Merri-bek. Casey's list stays out (earlier ruling). | Not usable until read. |
| Wikidata | CC0 for structured data | Usable for named markets and coordinates, as now. A count query timed out, so no volume claimed. |
| Victorian Farmers Markets Association | 31 accredited markets (site says). Terms not read. | Facts-only per market from the operator or council page, as now. About 10 to 20 in Greater Melbourne (assumption). |
| Foodbank Victoria "Find food" | Powered by Infoxchange; no copyright or reuse text found. Charity Partner Terms bind partners. | Not allowed to copy. Link out or ask in writing. SecondBite and OzHarvest: not read, same treatment. |

## 4. Chains and commercial directories

All **not allowed** to scrape or copy; none offers an open licence.

- **Coles** website terms (read): do not "copy, reproduce, republish, adapt" any part of the site; personal purposes only without written consent.
- **Woolworths, ALDI:** terms returned 403 or 404; **not read**, so treated as not allowed. **IGA and Foodworks:** not read; same.
- **Google Places** policy (read): "You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions"; only place IDs may be stored.
- **Yelp** (terms not read; secondary sources say 24 hour cache and scraping breaches terms), **Apple, Tripadvisor, Zomato:** not read; not allowed. Any of these would also be a third-party request, which the privacy rules forbid.
- **Chain locations anyway:** Overture's `brand` field already names Coles, Woolworths, ALDI, IGA and similar. Locations are facts and come to us under Overture's licence, not the chains' website terms.

## 5. Price and healthiness: what can be said honestly

Existing schema has `priceBand` and `priceBasis: stated | typical`. Extend it, never invent:

- **Price tier.** No open source states it. For a place with only a kind, show a *typical* band for the kind, as today: supermarkets and discount grocers `budget`, markets/greengrocers `budget` or `mid` typical, bakeries `mid`, restaurants `unknown`. Cafes and restaurants must **not** get a band, because the range of prices inside a kind is wider than the gap between kinds. Add `priceBand: 'unknown'` and display "Price not known". A stated price is accepted only when read on the operator's own page (`stated`).
- **Healthiness.** There is no open "healthy" tag and calling a place healthy would be invention. Allowed labels are about *what is sold*, derived from category: "Fresh produce" (greengrocer, fruit and vegetable store, farmers market), "Supermarket" (full range), "Bakery", "Takeaway" and "Restaurant". Diet tags (vegetarian, halal) are shown only when the source states them (OSM has them, Overture does not), so for now they stay out. Cultural grocers appear by category and brand words only when the source says so (no inferring from a name).
- **Hours.** Neither Overture nor CLUE has hours. Show none; say "Check hours before you go" and link the website if present.
- **Sorting.** Rank by distance and by `fit` (fresh first), never by a score we made up. Cheap-and-healthy filters should read "Likely cheaper (typical for this kind)".

## 6. Privacy and safety for a hungry person

- **Staleness is the main safety risk:** a closed place wastes a trip when someone has little money. Mitigations: only `operating_status` of operating (or absent), `confidence` at or above a threshold, drop `confidence` 0; show "Last checked by us: date" for hand-verified places and "Listed by Overture, release YYYY-MM, not individually checked" for bulk places; the existing 15 hand-verified places keep a visibly higher tier. Show a plain message when the dataset's release is older than 6 months.
- **Reporting errors:** the app makes no network requests, so a "Report a problem" button should open a prefilled email or issue link and send no data itself; the user decides whether to send. Record reports in a repo file and apply them in the next regeneration (a "suppress list" keyed by Overture id).
- **Quality thresholds** (starting values, tune on the sample in stage 4): confidence at or above 0.7 (to be checked against the measured distribution), has a street address, has a name, taxonomy in the allowed list, not a duplicate within 50 m with a near-identical name, inside the Greater Melbourne box already used by the validator.
- **Location privacy** is unchanged: nearest-first runs on the device with the rounded location; shard files are fetched by grid cell, which reveals a coarse cell to the host, so cells must be large enough (see 7) and the README must say so.

## 7. Data volume and performance

- Current bundle: `places.generated.ts` is 19 KB for 15 places (about 1.3 KB per place with sources and notes).
- Bulk records are leaner. Budget about 150 to 250 bytes per place raw (id, name, kind, lat, lng to 5 decimals, address line, suburb, category code, confidence band, source index). 5,000 places is about 1 MB raw and about 250 to 350 KB gzipped (assumption, to be measured).
- **Do not put it in the main bundle.** Ship a manifest plus grid shards loaded lazily: cells of about 0.1 degrees (about 8 by 11 km, 150 to 250 cells over the metro box), each a small JSON file served from the same origin. Fetch the 3 by 3 block around the user's cell; cache in memory only. This keeps the "no third-party request" rule (same origin) and limits the coarse location visible to the host.
- Alternative: suburb shards (matches the typed-suburb flow and the existing centroid file) but suburb sizes vary a lot.
- **Size budgets:** main bundle growth under 5 KB (manifest only); a shard under 60 KB gzipped; total shipped data under 2 MB gzipped; fail the build if exceeded.
- Keep the 15 verified places in the existing generated TS file, and keep bulk shards separate (also keeps the licence line between sources clean).

## 8. Recommended source mix and expected counts

All counts are **planning assumptions, not measurements**.

| Layer | Source | Expected count | Tier shown to the user |
| --- | --- | --- | --- |
| Hand-verified | Existing 15 plus new community meals, markets, relief read from operator and council pages | 15 now, 40 to 80 after stage 3 | "Checked by us" with date |
| Supermarkets, grocers, greengrocers, bakeries, butchers, convenience, markets | Overture, filtered | 1,500 to 4,000 | "Listed, not individually checked" |
| Cafes, restaurants, takeaway | Overture, filtered, cross-checked against CLUE and liquor licences where they overlap | 3,000 to 10,000 | Same, no price |
| Inner-city existence check | City of Melbourne CLUE (CC BY) | used for matching only | none |
| Optional | OSM extract as a separate ODbL file | 5,000+ extra, richer tags | Only if D1 is yes |

## 9. Staged plan (full task list in the plan file)

See [the plan](../plans/2026-10-29-melbourne-food-places-database.md).

- **Stage 0, licences settled:** user decisions D1 to D5 below; add an in-app "Data licences" page text.
- **Stage 1, pipeline and schema:** scratch, deterministic script (pinned Overture release, sorted output, no network at validation time); schema extension (`origin`, `confidence`, `release`, `priceBand: 'unknown'`, `kind` additions); a validator that rejects the same things as today plus the new rules.
- **Stage 2, chains, markets, bakeries from Overture:** count first, filter, de-duplicate, shard.
- **Stage 3, community food and relief:** hand-read council and charity pages; ask Foodbank/Infoxchange in writing about reuse.
- **Stage 4, verification sampling and a quality report:** draw a random 5 percent (seeded, stratified by kind and area, at least 30 per stratum for the big strata), check each against the operator's own page, record open/closed/wrong-address, report precision with a confidence interval and set the threshold from it. Re-sample after every regeneration. If precision is below the bar (suggest 90 percent open and correctly located), tighten filters rather than ship.

## 10. What cannot be done, and what the user must decide

Cannot be done honestly:
- Cheap/healthy labels for individual restaurants. No open source has them; inference would be invention.
- Hours for bulk places.
- Bulk food-relief lists without the charities' permission.
- Coverage numbers for Melbourne (not measured yet).
- Confirm every place is open. The best we can do is a measured sample and honest labels.

Decisions for the user:
- **D1:** accept ODbL share-alike on a *separate* OSM-derived places file, or stay Overture-only (recommended: Overture-only first)?
- **D2:** accept Foursquare-sourced Overture records (Apache-2.0, notice duty) or drop them for simplicity?
- **D3:** show bulk, unchecked places at all next to the 15 checked ones, and under what plain wording? (Recommended: yes, in a second tier labelled "Listed, not individually checked".)
- **D4:** quality bar for shipping (suggested: 90 percent precision on the 5 percent sample) and the staleness cut-off.
- **D5:** ask Foodbank Victoria / Infoxchange / SecondBite / OzHarvest for written permission or link out only?
- **D6:** is the repo public (this makes any ODbL file effectively published) and who answers "Report a problem" emails?
- **D7:** may cafes and restaurants appear at all if they cannot show price? (Recommended: yes, with "Price not known".)

Not legal advice. The ODbL reading above follows the licence text and OSMF's non-binding guidance and should be checked by someone qualified before D1 is answered "yes".

## 11. Decisions (recorded 2026-11-03)

The user answered D1, D2, D3 and D5 by saying "yes to all" to the recommendations in section 10. D4, D6 and D7 were left to the implementer as conservative rulings; they are recorded in the plan and are open for the user to confirm.

| Id | Decision | Answer |
|----|----------|--------|
| D1 | OpenStreetMap | **No.** Overture only. The optional OSM stage is dropped. No ODbL duties arise. |
| D2 | Foursquare-derived Overture records | **Left out of the first pass.** Dropped at extraction, so no Apache-2.0 notice is shipped. |
| D3 | Show unchecked places | **Yes**, marked "Not checked by us". The 15 hand-verified places remain a separate "Checked by us" tier. |
| D4 | Quality bar and staleness cut-off | **Ruling** (see plan, "Rulings"). |
| D5 | Charity and operator data | **Public-licence data only.** No operator, Foodbank, SecondBite or OzHarvest locator is scraped; link out only. No permission request is needed. |
| D6 | Repo public / problem reports | **Ruling** (see plan). |
| D7 | Cafes and restaurants without a price | **Ruling** (see plan). |

Wording note: the earlier recommendation text "Listed, not individually checked" is replaced by the user-facing label "Not checked by us".
