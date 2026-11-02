# Bulk places count and filter report (Overture, Greater Melbourne)

- **Release:** `2026-10-21.0` (newest at docs.overturemaps.org/release-calendar, checked 2026-11-03; previous: 2026-09-23.1, 2026-09-23.0).
- **Checked date:** 2026-11-03.
- **Source:** Overture Maps Places, official public bucket `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/`, read with DuckDB 2.0.0 (the `overturemaps` CLI's `--release` lookup failed with "Release '2026-10-21.0' not found", so the bucket named in Overture's docs was read directly; same data). Box `144.3,-38.6,145.8,-37.4`.
- **Licences (attribution page https://docs.overturemaps.org/attribution/, read 2026-11-03):** the Places theme has no theme-wide licence; each contributor is listed. CDLA-Permissive-2.0: Meta, Microsoft, PinMeTo, BrightQuery, Krick, RenderSEO, DAC, Birdeye, Uberall, OpenTravel Alliance. CC0 1.0: AllThePlaces. Apache-2.0: Foursquare (dropped). Nothing differs from CDLA-Permissive-2.0 or CC0 among the datasets we keep, so no stop. `OVERTURE_ATTRIBUTION_URL` confirmed unchanged.
- Raw data stayed in `/private/tmp/claude-501/places-overture-scratch` (outside the repo). No shards were built or committed.

## Real column shape

`id`, `geometry`, `confidence`, `websites[]`, `emails`, `socials`, `phones`, `brand`, `addresses[] {freeform, locality, postcode, region, country}`, `names {primary, common, rules}`, `sources[] {property, dataset, license, record_id, update_time}`, `operating_status`, `basic_category`, `taxonomy {primary, hierarchy[], alternates[]}`, `bbox`. Three differences from the fixture-based assumptions, all fixed with tests:

1. `taxonomy.primary` is only the leaf (`pizza_restaurant`). The allow-list now matches the `hierarchy` joined with `>` (`food_and_drink>restaurant>...`).
2. `operating_status` uses `open`, `permanently_closed`, `temporarily_closed` (never `operating`). The old filter would have dropped every `open` row; `open` and absent are now kept.
3. `sources[]` has 2 to 3 entries per record, including an `Overture` entry (and `Overture-signals` once). The filter now drops a record if any source is Foursquare and requires every source dataset to be in the licence table. Added to the table: Krick, RenderSEO, DAC, Birdeye, Uberall, OpenTravel, Overture, Overture-signals (all CDLA-Permissive-2.0 per the attribution page or the record's own `license` field). Dataset names in the data are `meta`, `Foursquare`, `Microsoft`, `AllThePlaces`, `Uberall`, `Birdeye`, `PinMeTo`, `RenderSEO`, `DAC`, `OpenTravel`.

## Counts at every filter stage

All places in the box: **260,288**. Datasets: meta 176,699; Foursquare 40,558; Microsoft 36,022; AllThePlaces 5,897; Uberall 792; Birdeye 219; PinMeTo 43; RenderSEO 35; DAC 23.

| Stage | Rows left | Dropped | Why |
|---|---|---|---|
| In box | 260,288 | | |
| Allowed food taxonomy | 27,648 | 232,640 | not on the allow-list (`taxonomy`) |
| Open (not permanently or temporarily closed) | 27,644 | 4 | `closed` |
| Has a name | 27,644 | 0 | `no-name` |
| Has an address | 27,188 | 456 | `no-address` |
| Has a suburb (locality) | 26,945 | 243 | `no-suburb` |
| Confidence at least 0.7 | 22,189 | 4,756 | `low-confidence` |
| No Foursquare source | 18,551 | 3,638 | `foursquare` |
| Every source on the licence table | 18,551 | 0 | `licence` |
| De-duplicated (50 m, same name) | **18,493** | 58 | duplicates |

(Drops are counted at the first failing check in pipeline order. Whole-box counts from `drop-counts.json`: taxonomy 156,857 and low-confidence 68,264 and no-address 11,624 etc. include rows that fail earlier checks first, because the taxonomy check runs after the others.) Independent counts inside the 27,648 food rows: no address 456, no locality 282, confidence below 0.7 4,931, below 0.6 3,776, any Foursquare source 3,784, closed 4.

## Kept, per kind (18,493)

| Kind | Kept | Before confidence, Foursquare and other filters |
|---|---|---|
| cafe-restaurant | 13,713 | 20,475 |
| takeaway | 1,704 | 2,483 |
| supermarket | 1,533 | 2,295 |
| bakery | 1,238 | 1,897 |
| greengrocer | 305 | 498 |

By dataset: meta 16,567; Microsoft 1,377; AllThePlaces 383; Uberall 166. 5,524 have an https website. Kept confidence: 0.7 to 0.8 1,240; 0.8 to 0.9 2,854; 0.9 and above 14,399.

## Per suburb, top 20 (Overture `locality`)

Melbourne 14,560; Geelong 620; Melton 138; Mornington 138; Sunbury 109; Torquay 81; Cowes 71; Bacchus Marsh 62; Ocean Grove 56; Rosebud 53; Hastings 47; Rye 43; Wallan 43; Dromana 42; Healesville 42; Somerville 40; Gisborne 37; Frankston 34; Lara 34; Richmond 34. 517 distinct localities in all.

**This is not a suburb breakdown.** Overture's `locality` is the metropolitan "Melbourne" for 79 percent of records (14,560 of 18,493), so the shipped `suburb` field would say "Melbourne" for most places. The address freeform and postcode are the useful parts.

## Allow-list (`ALLOWED_TAXONOMY_PREFIXES`)

Matched on the `>`-joined hierarchy; longest prefix wins; `null` excludes a sub-tree.

| Prefix | Kind | Rows in box |
|---|---|---|
| shopping>food_and_beverage_store>grocery_store (incl. asian, indian, international, organic, korean grocers) | supermarket | 2,295 |
| shopping>food_and_beverage_store>specialty_foods_store>produce_store | greengrocer | 322 |
| shopping>market>farmers_market, public_market | greengrocer | 176 |
| food_and_drink>casual_eatery>bakery | bakery | 1,897 |
| ...casual_eatery>fast_food_restaurant, sandwich_shop, food_truck_stand; restaurant>seafood_restaurant>fish_and_chips_restaurant | takeaway | 2,483 |
| ...casual_eatery>cafe, bistro, diner; non_alcoholic_beverage_venue>coffee_shop; food_and_drink>restaurant (all cuisines) | cafe-restaurant | 20,475 |
| ...casual_eatery>cafe>internet_cafe | excluded | 25 |

Left out on purpose (rows in box, before other filters): bars, pubs, cocktail and wine bars, lounges, breweries, wineries, distilleries (about 3,000 including Foursquare); liquor stores 1,348; gastropubs 136; dessert, ice cream, candy, juice, bubble tea and tea rooms (about 1,900); delicatessens 221; food courts 15; flea and night markets 66.

### Food shops that have no BulkKind (decision for the user)

`BULK_KINDS` has five kinds and the plan asked for butchers and markets, but no butcher or convenience kind exists, and adding one means changing core `tier.ts`, the validator and labels, which is outside this task. Not shipped for that reason (rows in box, with the non-Foursquare, confidence 0.7 and above count): convenience stores 1,009 (823); butcher shops 564 (365); health food stores 281 (136); generic food_and_beverage_store 446 (218); other specialty foods 257 (207); fishmongers 64 (44); delicatessens 221 (142). A "Fresh food shop" kind for butchers, fishmongers and delis would add about 550.

## Confidence floor

Non-Foursquare food rows by band: 0.0 to 0.1 62; 0.1 to 0.2 163; 0.2 to 0.3 839; 0.3 to 0.4 802; 0.4 to 0.5 710; 0.5 to 0.6 1,200; 0.6 to 0.7 1,155; 0.7 to 0.8 1,307; 0.8 to 0.9 3,108; 0.9 and above 14,518. The distribution is bimodal with most rows at 0.9 and above. The **0.7 floor is kept**: lowering to 0.6 would add 1,155 rows from a band with more weak records, and the plan forbids going below 0.6. Whether 0.7 is accurate enough is for Task 4.2's sample check.

## Observations

- Closed rows are rare (10 in the whole box, 4 in food): `operating_status` is null for 99.4 percent, so staleness rests on the confidence floor, the release age and the sample check. Overture itself warns of junk and duplicates.
- Addresses: 11,624 of 260,288 rows (4.5 percent) have none; in food rows 456 of 27,648 (1.6 percent). Not a problem.
- The bbox is a rectangle: it includes Geelong, Mornington Peninsula, Phillip Island (Cowes) and Healesville, as intended for "Greater Melbourne" in the plan.
- Foursquare is 15.6 percent of all rows and 3,784 of 27,648 food rows (13.7 percent). All dropped (decision D2).
- Only 58 duplicates were found within 50 m and the same name; the Overture data is already merged across sources.
- Size: the kept list is 7.9 MB as one JSON file, 1.58 MB gzipped before sharding. The shard builder's budget (60 KB per shard, 2 MB total gzipped) has not been run on real data and may be tight; the Melbourne CBD cells will be the largest.
