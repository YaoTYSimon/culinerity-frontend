# Bulk places quality report (2026-11-04)

Release: Overture 2026-10-21.0, Greater Melbourne box, 19,263 places kept (cafe-restaurant 13,813; takeaway 1,815; supermarket 1,533; bakery 1,257; butcher 356; greengrocer 305; deli 138; fishmonger 46). Final confidence floor: 0.7 (unchanged; no evidence to move it).

## Result: the quality gate (Ruling D4a) was NOT passed by any kind. No bulk shards are shipped.

The gate needs, per kind, at least 22 verified places (all open and correct) to reach a Wilson 95 percent lower bound of 85 percent, and more if any fail (one failure needs at least 34). Verification means one lawful human-readable page per place (the place's own site, or a council or regulator page) showing it trading at the stated address. That evidence could not be gathered at the needed size within the allowed limits:

- Only 428 of the 1,488 sampled places (seed 20261104) carry a website at all (fishmonger 6 of 46, butcher 16 of 90, deli 20 of 90, greengrocer 24 of 90, bakery 30 of 103, supermarket 41 of 118, takeaway 44 of 133, cafe-restaurant 247 of 818). Many of those are chain locator pages (excluded by the rules).
- A pilot of 13 non-chain own-website pages (seed 20261104, 2026-11-04) gave almost no usable evidence: most home pages show no hours, no address and no dated news.

Sampling plan (seed 20261104): 1,488 places in 24 strata, per kind: bakery 103, butcher 90, cafe-restaurant 818, deli 90, fishmonger 46 (whole kind), greengrocer 90, supermarket 118, takeaway 133. Nothing in this sample was verified to the standard, so no precision figure is claimed for any kind.

## Pilot outcomes (13 places; not a gate sample; no interval is claimed)

| Kind | Place | Outcome | Evidence seen |
| --- | --- | --- | --- |
| cafe-restaurant | Rumi (East Brunswick Village) | open-correct, weak | own site states dinner hours and the address 2 Village Ave 3057; page is undated |
| bakery | Woodfrog Bakery | unverifiable | no hours, address or dated news on the page |
| bakery | Little Bertha | unverifiable | footer 2026 only; no hours or address |
| butcher | Charles Street Butcher | unverifiable | online shop live, footer 2026; no hours or address |
| butcher | Old Style Butchers Williamstown | unverifiable | locations on a page not read |
| cafe-restaurant | I Love Dumplings | unverifiable | site redirects to another domain; redirect not followed |
| deli | Theo's Deli | unverifiable | host did not resolve (a single host failure; other fetches worked) |
| deli | The Corner Larder | unverifiable | page footer 2021, COVID-era wording, hall name differs |
| fishmonger | Keilor Seafood | unverifiable | certificate expired |
| fishmonger | Gem Pier Seafood | unverifiable | HTTP 429, not retried |
| greengrocer | Dom's Balaclava Fruit Mart | unverifiable | website now redirects to an unrelated domain (stale link in the source; not proof of closure) |
| greengrocer | Victoria Fruit Palace | unverifiable | hours and address shown but footer 2023 and contradictory dates |
| supermarket | Mr Dad Asian Supermarket | unverifiable | hours and address shown, no date or news |

Takeaway: no non-chain pilot place was read (the candidates seen were chain locators, which are not allowed). Dom's website and I Love Dumplings show the source's website field can be stale.

## Per-kind decision

| Kind | Verified (open-correct / verified) | Wilson 95 percent interval | Decision |
| --- | --- | --- | --- |
| supermarket, greengrocer, bakery, takeaway, cafe-restaurant, butcher, fishmonger, deli | 0 gate-quality verifications each (cafe-restaurant has 1 weak pilot) | not computed (n too small; vacuous 0 to 100 percent) | all left out of the shards, recorded here |

## What is missing

A way to confirm trading and location for at least 22 places per kind from allowed single pages. Options for the owner: a hand check by a person who may use maps or phone calls (outside the rules given to this run); a council or regulator register; or accepting a smaller, labelled claim. Until then Ruling R4 stands: bulk data must not be committed or shown.

## Drop reasons (extraction of 260,288 rows)

closed 10; foursquare 3,800; licence 0; low-confidence 68,298; no-address 11,624; no-name 0; outside-box 0; taxonomy 157,233; duplicates 60.

## Report a problem and suppress list

"Report a problem" is a prefilled mailto (id, name, question only) shown only when `REPORT_PROBLEM_CONTACT` is set; it ships empty and no personal address is in the repo. Reports are triaged by hand into `scripts/suppress.json` (ids), applied by `scripts/extract-overture.mjs`; an id not in the data fails the run.
