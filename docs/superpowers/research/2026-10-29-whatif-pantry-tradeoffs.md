# Research note: What-if simulator, pantry tracker, trade-off counter

Accessed 2026-10-29. Machine-readable sources: `2026-10-29-whatif-pantry-tradeoffs-sources.json` (ids in `[brackets]` below). Documentation only; no product code. House rules apply: no invented numbers, every figure has a source, and what could not be found is recorded. "Read" means the text was read on the source page today. "Not verified" means it was not.

Web content was treated as data. Search-engine summaries were used only to find URLs, never as evidence.

## Corrections to the brief

- The cultural dataset (`2026-10-27-cultural-food.json`) holds 102 ingredient rows, not 87: 82 carry AFCD Release 3 nutrition, 20 do not (water, sparkling water, tea and similar). It holds 49 foods (all "home cooking", each with an "Author's own simple recipe" basis) plus 2 cravings, not 50. [cultural-food-dataset]
- The Foodbank Hunger Report 2026 is now live. The app's benchmark dataset holds the 2025 edition (33%, 3.5 million households). The 2026 edition says one in three households, 3.6 million. This needs a deliberate dataset update; this note does not change it. [foodbank-hunger-report-2026]

---

## A. What-if simulator

### A1. Australian evidence (figures with exact scope)

| Figure | Value | Scope and date | Source |
| --- | --- | --- | --- |
| National Minimum Wage | $26.44 per hour, $1004.90 per week | From 1 July 2026; applies to employees not under an award or agreement (awards may pay more) | [fairwork-minwage] |
| JobSeeker, single, no dependent children | $824.90 per fortnight basic (was $808.70); Energy Supplement $8.80; typical total $833.70 | From 20 September 2026 indexation | [dss-rates-2026-09-20] |
| JobSeeker, single, with dependent children | basic $883.30; partnered each $755.10 | Same list | [dss-rates-2026-09-20] |
| JobSeeker income limit, single no children | $1,557.17 per fortnight | Same list | [dss-rates-2026-09-20] |
| Metro Melbourne median weekly rent | $595, down $5 on the quarter | Homes Victoria Rental Report, June quarter 2026 | [dffh-rental-report-jun2026] |
| Metropolitan Rent Index | up 4.8% over the year to June 2026; 2.5% year to June 2025; 10-year average 4.3% a year | Same | [dffh-rental-report-jun2026] |
| Households food insecure | 13.2% (1.3 million); lone parents with children 34.0%; most disadvantaged SEIFA quintile 20.6% vs least 6.8% | ABS NNPAS 2023, households, released 5 Sep 2025 | [abs-food-insecurity-2023] |
| Households food insecure (Foodbank measure) | one in three (3.6 million); part-time or casual workers 42% vs 33% nationally | Foodbank Hunger Report 2026. Different measure from ABS; never combine or chart together | [foodbank-hunger-report-2026] |
| Skipping meals for lack of money | 3.6% pooled over 2001-2021, 3.4% in the latest wave; above 7% at the lowest income percentiles, under 1% at the 95th; lowest income quintile spends over 30% of equivalised income on food | HILDA, 21 waves, individuals; peer reviewed, CC BY | [paloyo-2026-hilda] |
| Meal skipping is usually episodic | 5.8% skipped in exactly one wave; 9.1% in two or more | Same | [paloyo-2026-hilda] |

How shocks show up (Foodbank 2026, food insecure vs food secure households, last 12 months; base n=5880): reduced home energy use 65% vs 39%; cut back on social events 65% vs 31%; swapped food for cheaper alternatives 56% vs 25%; reduced fresh produce 38% vs 8%; reduced protein 37% vs 10%; deferred payment on credit or buy-now-pay-later 29% vs 8%; moved to lower-cost accommodation 14% vs 3%. [foodbank-hunger-report-2026]

**Not found.** No Australian source gives a quantified link of the form "a X% fall in income (or Y% rent rise) raises the chance of food insecurity by Z". HILDA shows an income gradient but is associational. So the simulator must not predict food insecurity or give a risk percentage. It can only show arithmetic on the household's own numbers, plus the sourced context above.

Also not found or not read: Consumer Affairs Victoria rent-increase rules and notice periods (not searched); ACOSS/UNSW Poverty and Inequality figures beyond those already in the app's dataset; AIHW material; a Services Australia page for payment rates (its URLs returned 404; the DSS rates list was used instead; its licence is not verified); the Victorian Department of Health food-price data. Rent figures are a median across all lettings; a household's own rent is the right input.

The existing benchmark dataset uses ACOSS 2023 poverty-line and JobSeeker-shortfall figures. Any simulator copy comparing a scenario with those must carry their year. Do not mix them with the 2026 payment rates above without saying so.

### A2. Existing open-source simulators and libraries

| Project | Licence (GitHub API; LICENSE text not opened except where noted) | Reusable in a platform-free TypeScript core? |
| --- | --- | --- |
| Actual Budget (`actualbudget/actual`) | MIT | Licence permits it, but it is a full sync app built around envelope budgeting, not a scenario library. Design inspiration for local-first storage only. |
| Firefly III | AGPL-3.0 | No (PHP, copyleft). |
| Maybe | AGPL-3.0, archived | No. |
| OpenFisca core, PolicyEngine core | AGPL-3.0 | No (Python, copyleft). Useful as a model of rules written as readable, citable parameters. |
| OpenFisca Australia prototypes (`Br3nda/openfisca-australia`, `pserwylo/OpenFisca-AustraliaVictoria`) | AGPL-3.0 | No. A community prototype was pushed 2026-10-05 and another in 2019; contents not reviewed. No maintained Australian payment model was found. |

GitHub searches for TypeScript budget what-if or scenario simulators returned no project of note. Conclusion: no open-source simulator is worth reusing. The needed logic is small, deterministic and already close to the app's `packages/core/src/budget` (weekly maths, DST-safe weeks). Write it in the core as pure functions. Candidate helper libraries seen with permissive licences (`dinero.js` MIT, `simple-statistics` ISC) are unnecessary for integer-cent arithmetic.

### A3. Is an on-device rule-based engine enough, and what should it say?

Yes. A scenario is arithmetic: new weekly income, new fixed costs, new food budget, leftover, and the change from now. Nothing here needs a model. Advantages: deterministic and testable, works offline, nothing leaves the device, and every output can be traced to an input.

A transparent explanation should (this is design guidance, not sourced):

1. Echo the inputs used, in the person's own numbers ("You told us rent is $X a week").
2. Show the formula in words and the before and after for each line.
3. Label every assumption (for example, "assumes the other costs stay the same", "a lost shift is the average of the shifts you entered").
4. Label external figures with source, date and scope, and never blend them into the person's numbers.
5. State plainly what it does not know: other income, bills it was not told about, changes in support payments.
6. Offer no prediction, score, risk level or "you will be food insecure" message. Present the result as "what the numbers show", not a verdict.
7. Link to free help (financial counselling, Foodbank) rather than telling the person what to give up.

### A4. Risks of LLM-based advice for vulnerable people

Evidence found (all abstracts only; both are preprints, not peer reviewed, US investment contexts rather than budgeting):

- Seven LLMs gave stock-allocation advice that swung 10 to 16 points on average when only a risk-tolerance answer changed, and the same prompt asked twice moved only 0.6 to 4.2 points. [arxiv-2610-23060]
- Across 432 simulated advisor-client interactions, unbiased advice appeared in only 12-18% of cases. [arxiv-2608-16909]
- ASIC's REP 798 reviewed AI governance at 23 licensees and is titled "Beware the gap". Only the summary line was read. [asic-rep798]

Privacy: the OAIC says, as best practice, organisations should not enter personal information, "and particularly sensitive information", into publicly available generative AI tools. [oaic-commercial-ai] Sending income, rent and debts to a third-party API would break the app's on-device promise.

Responsible-design guidance: Australia's voluntary AI Ethics Principles include privacy protection and security, reliability and safety, transparency and explainability, contestability and accountability. [industry-ai-ethics-principles] MoneySmart distinguishes financial information (facts, no licence needed), general advice (does not consider circumstances) and personal advice (tailored); personal and most general advice providers must hold an AFS licence. [moneysmart-general-personal] Recommendation: the simulator presents calculations and sourced facts only, calls them "general information", and avoids "you should" language about products, debt or credit. A legal view on whether a tailored what-if output could be characterised as advice was not obtained; take one before launch. MoneySmart text must not be copied (its copyright page requires permission unless marked open). [moneysmart-copyright]

---

## B. Pantry tracker and "cook from what you have"

### B1. Datasets and code: licence verdicts

| Source | Licence evidence | Bundle in app? | Adapt? | Verdict |
| --- | --- | --- | --- | --- |
| AFCD Release 3 (FSANZ) | CC BY 4.0 Australia, attribution "Food Standards Australia New Zealand" (per the app's own record, read 2026-10-28) | Yes | Yes | Already used. Nutrition base. |
| RecipeNLG | Terms on the dataset card: "only for non-commercial research and educational purposes" | No | No | Excluded. [recipenlg-terms] |
| Recipe1M / Recipe1M+ | Code is MIT; the data terms page returned 403 and was NOT read | No | No | Unclear, treat as unusable. [recipe1m-code] |
| Food.com (Kaggle) | Page not readable; licence NOT verified; recipes are user-submitted | No | No | Unclear, unusable. [foodcom-kaggle] |
| Open Food Facts | ODbL for the database, DbCL for contents, CC BY-SA for images | Not a recipe source | Share-alike on derived databases | Packaged-product data only; skip. [openfoodfacts-terms] |
| Wikibooks Cookbook | CC BY-SA 4.0 and GFDL | Only with the same licence | Share-alike | Would force the recipe dataset to be CC BY-SA. Avoid. [wikibooks-copyrights] |
| NHS healthy recipes (England) | OGL for text "except where specified"; images, logos and third-party material excluded; commercial use allowed | Text, with attribution and an OGL notice | Yes | Possible but UK units and ingredients; individual recipe pages were not checked for exclusions. [nhs-terms] |
| Australian Government Eat for Health / Healthy Eating | Copyright page returned 404; homepage showed no licence | No | No | NOT verified. |
| Better Health Channel (Vic) | Copyright page returned 404; homepage showed no licence | No | No | NOT verified. |
| USDA MyPlate Kitchen | Site returned 403 and was not read | No | No | NOT verified (US federal works are generally uncopyrighted, but this was not confirmed on the site). |
| Good Food, Healthy Food Guide | Commercial publishers (as the brief states); not checked | No | No | Not open. |

Open-source code (licences from the GitHub API):

- `recipe-scrapers` (MIT): scrapes third-party recipe pages; the code licence does not license the recipes. Do not use.
- `ingredient-parser` (MIT, Python): parses ingredient sentences; only relevant for free-text recipe import, and not usable in the TypeScript core.
- `FoodOn` (CC BY 4.0): food ontology; more than 100 ingredients need.
- `MK-MealScout` (MIT, 1 star, code not reviewed): an ingredient-first finder with match scoring; inspiration only.
- `nytimes/ingredient-phrase-tagger`: licence not asserted and the repo is archived. Do not use.

No mature, maintained, permissively licensed ingredient-set matcher or substitution engine was found. The needed algorithm is a few lines: for each recipe, count ingredients the household has, treat staples as always present, rank by fewest missing, and exclude unsafe items. Write it in the core with tests. No substitution dataset was found with a licence; ship a short author-written substitution table (for example, red lentil for green) and cite AFCD nutrition for the swap.

### B2. Food safety guardrails

What was read:

- FSANZ: use-by is for foods to be eaten before a date "for health or safety reasons" and they "should not be eaten after the use-by date". Best-before foods "can still be eaten for a while after" the date; quality may drop. [fsanz-date-marks]
- NSW Food Authority: refrigerate leftovers within 2 hours; below 5 C; eat within 3 days; cooked rice and pasta within 2 days; freeze up to 3 months; defrost in the fridge and use within 24 hours; throw out anything out of the fridge more than 4 hours (cumulative); reheat to steaming hot (at least 60 C); never reheat rice or pasta more than once. [nsw-fa-leftovers]

Gaps: the Victorian Department of Health consumer pages tried (three URLs) returned 404, so the leftover rules are from NSW, a different state authority. A New Zealand source cited a higher reheating temperature (75 C), but that page was not read and the figures differ, so the app should not print a number beyond what a source it names says. The Foodbank "Storing Leftovers Safely" PDF could not be read (image-only). Storage times for specific raw items (meat, fish, eggs) were not researched.

Design rules that follow (reasoning, not sourced figures):

- Never infer safety from the date: ask the person for use-by dates on items that carry one. A past use-by item is excluded from every suggestion, with a plain reason. Best-before items past the date get "check it looks and smells right" wording, never an auto-suggestion for high-risk foods.
- Cooked leftovers get a "cooked on" date and drop out of suggestions after the NSW day limits (3 days; rice and pasta 2 days).
- Show the 2-hour/4-hour rule near any "cooked and left out" entry.
- Do not claim to certify safety. Copy should say "a guide", matching the app's existing swaps wording.
- Allergen and diet filters reuse the existing `rules` and `allergens` modules (an unknown attribute never passes).
- Weakened immune system and pregnancy: NSW links a "what to eat with a weakened immune system" PDF that was not read. Add a "check with your doctor or midwife" pointer only after reading it.

### B3. Staples and cultural variety

No source was found for "the pantry staples of low-budget Melbourne households". Do not claim one. Options: (a) ship a short, editorial "pantry staples" list taken from ingredients already in the cultural dataset and mark it as an editorial choice, not a statistic; (b) let the person mark their own staples (best, and consistent with the on-device approach). Supporting evidence for including tinned and frozen items: 56% of food insecure households swapped food for cheaper alternatives such as frozen or tinned, 25% of food secure households. [foodbank-hunger-report-2026]

The app already has 49 sourced home-cooking foods across 21 traditions, built on the 102 ingredient rows. [cultural-food-dataset] Coverage check: ingredient ids such as `lentil-red`, `rice`, `egg`, `tomatoes-tinned`, `chickpeas-canned`, `pasta-dry`, `rolled-oats`, `flour-wheat` are present; some staples used in Melbourne kitchens (for example, a wider range of spices, fish sauce, tinned fish) may not be, and 20 rows have no AFCD nutrition. Gap analysis by tradition was not done.

### B4. Recommended licensing path

Write original simple recipes in the app's own words, built on the AFCD-backed ingredient rows, as the cultural dataset already does ("Author's own simple recipe"). Reasons: no licence risk, nutrition is computable from CC BY data, ingredient ids match the pantry directly, and the app controls the food-safety metadata (which items are high-risk, storage limits). Do not import RecipeNLG, Recipe1M, Food.com, or Wikibooks (non-commercial, unclear, or share-alike). NHS recipe text under OGL is the only imported option with clear terms; use it, if at all, as adapted text with an attribution notice, after reading each page's terms, and treat it as optional. Recipe ideas (not text) are not copyrightable in general, but a legal opinion was not obtained.

---

## C. Trade-off counter

### C1. Evidence base for coping strategies

- Foodbank 2026 lists coping behaviours by food security status (see A1), including: cut back on social events (65% of food insecure households vs 31%), cut back on personal care and grooming (66% vs 32%), reduced home energy use (65% vs 39%), reduced fresh produce (38% vs 8%), reduced protein (37% vs 10%), deferred payment on credit or BNPL (29% vs 8%). The report also says severe food insecurity households "regularly skip meals" and 97% worried food would run out. Quotes in the report show parents prioritising children. These are survey items, not a validated scale. [foodbank-hunger-report-2026]
- HILDA: skipping meals because of money is a measured item (3.6% pooled). [paloyo-2026-hilda]
- A 2026 scoping review of 25 mostly US studies found five themes of coping in households with children: food acquisition, food management, financial coping, support from family or friends, and strategies by children. [romanovich-brown-2026]
- "Heat or eat" originates from US work on energy assistance and child health (Frank et al., 2006). Only the bibliographic record was read. [frank-2006-heat-or-eat]
- ABS NNPAS 2023 added a more extensive food security module; the item wording was not located in the pages read. [abs-food-insecurity-2023]

Not found or not read: the Coping Strategies Index (Maxwell and colleagues) original papers and manual, its reduced form, and any CSI Australian validation (the Europe PMC search did not surface them); Deakin, Monash and VicHealth coping-behaviour studies specific to Victoria (not located); the ABS items on coping. The Scite literature tool was unavailable (no paid plan).

### C2. Validated item lists and licences

- FIES (FAO): already used in the app's check-in (eight yes/no items, "worded in plain language"). The FAO pages were JavaScript stubs and no licence text was read. Confirm the FAO terms for reuse and adaptation before relying on the existing wording.
- US Household Food Security Survey Module (USDA ERS): published for researchers "to adapt" it. No licence or copyright statement appeared on the page. [ers-survey-tools] Several of its items ask about adults cutting meal size or skipping meals, and about children, but items were deliberately not copied here.
- CSI: licence unknown, not read.
- Foodbank's coping list: copyright Foodbank; not open. Do not reproduce its wording or percentages beyond short factual citation.

Recommendation: do not reproduce validated item wording. The counter should use the household's own, plainly worded categories (below), and cite the literature only to say what such sacrifices are known to look like.

### C3. Ethical and safe-messaging guidance

Evidence for care: 48% of food insecure households cite embarrassment as a reason for not accessing help, and only half know where help is available. [foodbank-hunger-report-2026] No dedicated guideline on asking people about food sacrifices (child safety, disclosure, trauma-informed) was found in this session; the points below are design reasoning drawn from that statistic and the AI Ethics Principles (human-centred values, privacy, contestability), not a cited standard. A review by a food-relief or financial-counselling practitioner is recommended.

Design implications:

- Everything stays on the device; say so in the screen. No sharing, no export by default.
- Neutral, factual wording ("We went without a treat"), no moral words ("failed", "deprived", "only").
- Always optional, always undoable, deletable in one step.
- No streaks, targets, badges or rankings. No comparison with other households or with benchmark percentages.
- Do not use red or alarm styling for entries.
- If a person logs skipping meals or children going without: show a calm card, not an alert. Include the Foodbank find-food link [foodbank-find-food] and the National Debt Helpline 1800 007 007 (weekdays) [national-debt-helpline]. For distress add Lifeline 13 11 14 (24/7; 000 if life is in danger) [lifeline] and, for children or young people, Kids Helpline 1800 55 1800 [kids-helpline]. 1800RESPECT 1800 737 732 [1800respect] only if the entry type is tied to safety or violence; do not show it for ordinary trade-offs.
- Do not say or imply child neglect, or mention child protection reporting, in this feature. Mandatory reporting obligations were not researched; get advice before adding any related wording.

Verified today on official pages: Lifeline, Kids Helpline, National Debt Helpline, 1800RESPECT numbers (as above), and the Foodbank Find Food page. NOT verified: the Orange Door (its URLs tried returned 404), Parentline Victoria (404), Safe Steps (403), a Victorian Government emergency relief page. The app's existing support places dataset covers local services; reuse it for Victorian specifics rather than hard-coding unverified numbers.

### C4. Framing a "trade-offs per week" count

- Honest framing: "Things we went without this week: 3". A record of what scarcity cost, never a goal. Say so on screen: "This is just a record. There is no right number."
- Never colour-code, band or trend as good or bad. A rise or fall carries no judgement; offer a plain "this week vs last week" list at most, only for the person's own entries.
- No weighting: a skipped meal and a skipped haircut are different; do not add them into a score. Count by category, or show a simple list.
- Do not feed it into the FIES-based 0-100 number or the band headlines. Different measures are never combined (house rule).
- Count has no equivalence to a published threshold: no validated measure of the "cost of food security" or a trade-off count was found. The closest are CSI (coping severity, not read) and HFSSM items (insecurity, not cost). State that this counter is not a validated measure.
- Honest use of the sourced context: Foodbank percentages show these sacrifices are common among households under strain, which can be shown once as reassurance with its source and year, never as a comparison to the person.

---

## What needs a decision

1. Update the benchmark dataset to the Foodbank Hunger Report 2026 and the 2026 payment and rent figures above (separate task).
2. Take legal advice on whether the what-if output counts as general advice.
3. Whether leftover rules from NSW Food Authority are acceptable, or to find the Victorian page.
4. Confirm FAO FIES licence terms for the existing check-in.
5. Obtain practitioner review of the sacrifice-logging wording and of helplines (Orange Door, Parentline, Safe Steps unverified).
6. Whether to adapt NHS OGL recipe text or stay with original recipes only.
