# Craving expansion research (checked 2026-11-23)

Read-only research. No app code touched. All recipe method text is deliberately NOT recorded; ingredient lists are facts. No prices recorded anywhere here.

Already in the app (deduped against): burger, hot chips, bubble tea, instant noodles, pizza, chocolate, fried chicken, kebab, pastry, soft drink (`packages/core/src/sources/mock/data.ts`), plus the cultural catalogue (butter chicken jar sauce, jiaozi, pho, banh mi, souvlaki, fried rice, frozen lasagne, hummus, etc.).

## 1. Ranking evidence (cited only)

| Ref | Source | What it supports | Caveat |
|---|---|---|---|
| R1 | Time Out Australia, 7 Mar 2025, citing Pack and Send. https://www.timeout.com/australia/news/australias-ten-favourite-snacks-ranked-from-most-to-least-popular-030725 | Snacks by monthly search volume: Chiko Roll, Tim Tam, Cheezels, Cherry Ripe, Lamingtons, Passiona, Violet Crumble, meat pies, Anzac biscuits, Burger Rings | Search volume, not purchases |
| R2 | Time Out Australia, 26 Nov 2025, citing Uber Eats 2025 Cravings Report. https://www.timeout.com/australia/news/has-australias-unofficial-national-dish-been-crowned-heres-what-our-uber-eats-habits-say-112625 | Hot chips top order (VIC among states); 10-piece nuggets with burgers top combo; lattes top coffee in VIC; acai bowls doubled; matcha +217% over 2 years | Article gives no order counts; one delivery app |
| R3 | Statista page (2021 survey), via search summary. https://statista.com/statistics/1373610/australia-most-popular-takeaway-foods | Pizza top takeaway (27%) | Summary only, paywall not opened |
| R4 | InDaily 10 Aug 2020 (Adelaide survey). https://www.indailysa.com.au/news/archive/2020/08/10/eating-our-way-to-an-economic-recovery | Takeaway most bought: pizza 52%, burgers 36%, fish and chips 36%, chicken 30%, Chinese 27% | South Australia only, not read in full |
| R5 | Roy Morgan snack findings (2020). https://www.roymorgan.com/findings/8272-packaged-snack-foods-february-2020-202002030503 | Savoury snacks 66%, chocolates 48.1%, yoghurt 44.8% of adults weekly | Category level; via search summary |
| R6 | B&T, Menulog data. https://www.bandt.com.au/study-maccas-chinese-top-aussies-favourite-take-aways/ | Chinese a top takeaway; Menulog item ranking Margherita, Pad Thai, Butter Chicken (per search summary) | Summary only, not opened |

No Choice or ABS food-craving ranking was found. A "rank" below is only the position within the cited list; everything else is "unranked".

## 2. 30 candidate cravings and swaps

Recipe IDs refer to section 3. "gap" = no openly licensed or government recipe verified yet.

| # | Craving | Evidence | Swap A | Swap B |
|---|---|---|---|---|
| 1 | Fish and chips | R4 (36%) | Baked fish (Q1) | Oven sweet potato chips (Q2) |
| 2 | Chicken nuggets | R2 | Chicken and veg nuggets (Q3) | Chickpea, corn and zucchini fritters (Q4) |
| 3 | Meat pie | R1 (8th) | Vegetable shepherd's pie (Q5) | gap (lentil pie with pastry lid) |
| 4 | Sausage roll | unranked | Healthy sausage roll (Q6) | Lentil and sweet potato patties (Q7) |
| 5 | Chinese-style takeaway | R4, R6 | Ginger veg and chicken stir fry (Q8) | San choy bow (Q9) |
| 6 | Pad Thai | R6 | Pad Thai from scratch (W1) | Tofu, noodle and vegetable stir fry (Q10) |
| 7 | Nachos | unranked | Sweet potato nachos (Q11) | Simple nachos (W2) |
| 8 | Tacos / burritos | unranked | Chicken and avocado soft tacos (Q12) | Taco roll (Q13) |
| 9 | Sushi | unranked | Vegetarian sushi (Q14) | Sushi (Wikibooks, W3, ingredients not recorded) |
| 10 | Chicken parmigiana | unranked | Chicken parmesan (W4) | gap |
| 11 | Lamington | R1 (5th) | Lamington (W5, no quantities) | gap |
| 12 | Tim Tams / chocolate biscuits | R1 (2nd) | Carrot, date and oat biscuit (Q15) | Banana bread (Q16) |
| 13 | Anzac biscuits | R1 (9th) | Anzac Biscuits I (W6) | Carrot, date and oat biscuit (Q15) |
| 14 | Cheezels / savoury packet snacks | R1 (3rd), R5 | Avocado salsa and pita chips (Q17) | Spiced mixed nuts (Q18) |
| 15 | Ice cream | unranked | Tropical frozen yoghurt bites (Q19) | gap (Wikibooks Ice Cream page has no full recipe) |
| 16 | Iced latte / coffee | R2 (VIC) | gap (home iced coffee) | gap (stovetop coffee, milk) |
| 17 | Acai bowl | R2 | Smoothie bowl (Q20) | gap |
| 18 | Matcha latte | R2 | gap | gap |
| 19 | Milkshake | unranked | Banana and blueberry smoothie (Q21) | Strawberry smoothie (Q22) |
| 20 | Donuts | unranked | Banana and blueberry pikelets (Q23) | gap |
| 21 | Waffles / pancakes | unranked | Banana and blueberry pikelets (Q23) | French toast (Wikibooks, not read) |
| 22 | Bacon and egg roll | unranked | Mini omelettes (Q24) | Spinach and egg roll ups (Q25) |
| 23 | Garlic bread / cheesy snack | unranked | Pizza scrolls (Q26) | Mini bean quesadillas (Q27) |
| 24 | Chicken wings | unranked | Miso roast chicken (Q28) | Spanish chicken and veg skewers (Q29) |
| 25 | Laksa / noodle soup | unranked | Coconut lentil soup (Q30) | gap |
| 26 | Takeaway curry | R6 (butter chicken, but cultural catalogue has it) | Pumpkin, chickpea and coconut curry (Q31) | gap |
| 27 | Creamy pasta / carbonara | unranked | Creamy vegetable pasta (Q32) | Chicken pesto pasta (Q33) |
| 28 | Hot dog / sausage sizzle | unranked | Wikibooks Hot Dog (no quantities; weak) | gap |
| 29 | Popcorn / movie snacks | unranked | gap | gap |
| 30 | Cake and slices | unranked | Banana bread (Q16) | gap |

Counts: 30 cravings, 60 swap slots, 16 slots marked gap, 44 slots with a named source recipe (some repeat; 4 of those are weak: Sushi W3 and French toast not read, Lamington and Hot Dog lack quantities). Distinct recipes with ingredients recorded: 33 Queensland and 5 Wikibooks.

## 3. Recipes (ingredients as facts; our own method wording to be written at ingest)

Licence summaries.
- **Q** = Health and Wellbeing Queensland, hw.qld.gov.au. Footer: "© Health and Wellbeing Queensland 2026", linking to qld.gov.au/legal/copyright, which says "Unless otherwise noted, all copyright material... is licensed" CC BY 4.0 (excludes logos, third-party IP). The site's own copyright page was not retrieved (404 on /copyright/), so confirm before ingest. Attribute and link. Recorded as facts only.
- **W** = Wikibooks Cookbook. "Text is available under the Creative Commons Attribution-ShareAlike License." We copy no text, only ingredients, and link with credit.
- Rejected: Better Health Channel (State of Victoria; written permission needed to adapt; linking and original wording allowed). HEAS (heas.health.vic.gov.au): "limited copies" only for study and review; publishing or adapting not permitted, so link only, no ingestion.

All checked 2026-11-23. Base URL for Q: https://hw.qld.gov.au/healthy-recipes/ ; for W: https://en.wikibooks.org/wiki/

| ID | Title and URL slug | Serves | Ingredients |
|---|---|---|---|
| Q1 | Baked Fish `baked-fish/` | 6 | 1 kg fish fillets; 1.5 tsp oregano; 1 tsp ground coriander; 1 tsp sweet paprika; 4 garlic cloves; 2 red capsicums; 2 shallots; basil bunch; juice 1 lemon; 4 tbsp olive oil |
| Q2 | Sweet Potato Chips `sweet-potato-chips/` | 4 | 2 large sweet potatoes; 2 tbsp olive oil; 1 tbsp cumin; 1 tbsp curry powder; 1 tbsp paprika; 1 tbsp Italian herbs; 2 tbsp low-fat Greek yoghurt; 2 tbsp olive oil to drizzle |
| Q3 | Chicken and Veg Nuggets `chicken-and-veg-nuggets/` | 5 | 125 g frozen spinach; 1 zucchini; 1 carrot; 400 g chicken mince; 2 spring onions; 1/4 cup parsley; 2 garlic cloves; 2 tsp olive oil. Dip: 1/2 cup low-fat Greek yoghurt; 1 garlic clove; 1/4 cup parsley; 1/2 tsp pepper |
| Q4 | Chickpea, Corn and Zucchini Fritters `chickpea-corn-and-zucchini-fritters/` | 7 | 400 g can chickpeas; 1 cup SR flour; 1/2 cup SR wholemeal flour; 310 g can corn; 1 zucchini; 1 tbsp chives; 2 eggs; 1 cup fortified almond milk; 2 tbsp olive oil |
| Q5 | Vegetable Shepherds Pie `vegetable-shepherds-pie/` | 8 | 1.5 kg sweet potato; 1 tbsp olive oil; 1 red onion; 1 leek; 1 celery; 2 carrots; 1 cup red/brown lentils; 1 cup water; 1.5 cups veg stock; 425 g can tomatoes; 2 tbsp tomato paste; 1 tsp soy; 1/2 cup peas; 1/2 cup corn; 1/2 cup parsley; 1/4 tsp pepper; 1/2 cup parmesan; 1 tsp sesame seeds |
| Q6 | Healthy Sausage Roll `healthy-sausage-roll/` | 10 | 1 carrot; 1/4 butternut pumpkin (~400 g); 1 small zucchini; 1 onion; 3 garlic cloves; 1/2 cup walnuts; 500 g lean beef mince; pepper; 2 tbsp Italian herbs; 5 sheets reduced-fat puff pastry; milk; sesame seeds |
| Q7 | Lentil and Sweet Potato Patties `lentil-and-sweet-potato-patties/` | 6 | 2 sweet potatoes; 1/2 tsp cumin; 1/2 tsp smoked paprika; 1/2 tsp pepper; 400 g can brown lentils; 60 g spinach; 1/4 cup wholemeal plain flour; 2 tsp olive oil; 1 lemon |
| Q8 | Ginger Vegetable and Chicken Stir fry `ginger-veggie-stir-fry-recipe/` | 4 | 400 g chicken thigh; 300 g brown rice; 1 carrot; 1 bunch bok choy; 1 onion; 1 small broccoli; 1 tsp chilli flakes; 1 tsp sesame oil; 3 tbsp ginger; 2 garlic cloves; 1 tsp olive oil; 4 tbsp salt-reduced soy; 4 tsp white vinegar; coriander |
| Q9 | San Choy Bow `san-choy-bow/` | 5 | 15-20 lettuce leaves; 1 tbsp sesame oil; 2 carrots; 1 onion; 1 red capsicum; 2 tsp ginger; 4 garlic cloves; 1 long chilli; 500 g extra-lean pork mince; 200 g water chestnuts; 2 spring onions; 2 tbsp reduced-salt soy; 1/2 lime juiced; 2 tbsp coriander; 1 lime wedged |
| Q10 | Tofu, Noodle and Vegetable Stir Fry `tofu-noodle-and-vegetable-stir-fry/` | 4 | 400 g firm tofu; 3 tsp cornflour; pepper; 1 tbsp sesame oil; 1 bunch coriander; 1 onion; 1 red capsicum; 1 carrot; 1 zucchini; 1 broccoli; 180 g soba; 4 garlic cloves; 3 tsp ginger; 1 chilli; 2 tbsp lime juice; 1.5 tbsp soy; 1 tbsp honey; 2 tbsp hot water |
| Q11 | Sweet Potato Nachos `sweet-potato-nachos/` | 2 | 2 small sweet potatoes; oil spray; 2 corn cobs; 1/2 capsicum; 1 cup black beans; 1/2 cup low-fat cheese; 1 avocado. Salsa: 250 g cherry tomatoes; 1/2 red onion; 2 tbsp coriander; 1 lime; 1 chilli (opt) |
| Q12 | Chicken and Avocado Soft Tacos `chicken-and-avocado-soft-tacos/` | 10 | 20 soft tortillas (15 cm); 750 g roast chicken breast; 400 g can kidney beans; 1 baby cos; 3 avocados; 4 tomatoes; 1 Lebanese cucumber; 1/2 red onion; 30 ml lemon juice; 100 g reduced-fat cheddar; 100 ml light sour cream |
| Q13 | Taco Roll `taco-roll/` | 8 | 1/2 tsp olive oil; 500 g lean beef mince; 15 g taco seasoning; 2 tbsp tomato paste; 1/2 cup water; 1 carrot; 3/4 cup corn; 1/2 cup black beans; 150 g spinach; 125 g light sour cream; 150 g salsa; 1 avocado; 1 tsp lemon juice; 125 g reduced-fat cheese; 8 tortillas |
| Q14 | Vegetarian Sushi `vegetarian-sushi/` | 5 | 1 cup sushi rice; 2 tbsp sushi vinegar; 5 nori sheets; 5 tbsp reduced-fat yoghurt; 1 tsp Dijon; 1 carrot; 1 Lebanese cucumber; 1/2 red capsicum; 1 avocado; 2 tbsp soy; pickled ginger |
| Q15 | Carrot, Date and Oat Biscuit `carrot-date-and-oat-biscuit/` | 12 | 1/3 cup dates; 1/4 tsp bicarb; 1/4 cup boiling water; 1 cup rolled oats; 3/4 cup wholemeal flour; 1.5 tsp baking powder; 1.5 tsp cinnamon; 2 tbsp olive oil; 1 egg; 1 tsp vanilla; 3 tbsp brown sugar; 2 carrots; 1 banana; 25 g almonds |
| Q16 | Banana Bread `banana-bread/` | 16 | 4 bananas; 1 tsp vanilla; 2 eggs; 1/2 cup low-fat milk; 2 tbsp canola oil; 1 cup SR flour; 1 cup SR wholemeal flour; 1 tsp cinnamon; 125 g dates |
| Q17 | Avocado Salsa and Pita Chips `avocado-salsa-and-pita-chips/` | 12 | 8 pita breads; 3 avocados; 1 tomato; 2 long chillies; 1 bunch coriander; 1/2 red onion; 1/2 cup corn; 2 limes; pepper |
| Q18 | Spiced Mixed Nuts `spiced-mixed-nuts/` | 20 | 1.5 tbsp honey; 1 tbsp olive oil; 1 tsp cinnamon; 3 cups unsalted raw nuts |
| Q19 | Tropical Frozen Yoghurt Bites `tropical-frozen-yoghurt-bites/` | 6 | 3 ripe bananas; 2 passionfruit; 227 g canned crushed pineapple in juice; 1.5 cups low-fat Greek yoghurt |
| Q20 | Smoothie Bowl `smoothie-bowl/` | 1 | 1/2 cup spinach; 1 banana; 1/2 cup reduced-fat Greek yoghurt; 1/2 cup mixed berries; 20 g rolled oats; 1 tbsp almonds |
| Q21 | Banana and Blueberry Smoothie `banana-and-blueberry-smoothie/` | 2 | 1/2 banana; 1/2 cup frozen blueberries; 1/2 cup reduced-fat Greek yoghurt; 1/2 cup reduced-fat milk |
| Q22 | Strawberry Smoothie `strawberry-smoothie/` | 2 | 150 g strawberries; 1/2 cup reduced-fat milk; 1/2 cup reduced-fat Greek yoghurt |
| Q23 | Banana and Blueberry Pikelets `banana-and-blueberry-pikelets/` | 8 | 1 cup reduced-fat milk; 1 egg; 3 bananas; 1.5 cups plain flour; 1.5 tsp baking powder; 1.5 cups frozen blueberries; 1 tsp canola oil |
| Q24 | Mini Omelettes `mini-omelettes/` | 6 | 6 eggs; 1/2 capsicum; 1 carrot; 6 button mushrooms; oil spray; Italian herbs (opt) |
| Q25 | Spinach and Egg Roll Ups `spinach-and-egg-roll-ups/` | 4 | 4 hard-boiled eggs; 2 tbsp light mayo; 2 tsp Dijon; 4 flatbreads; 1/3 cup hummus; 1 carrot; 1/2 cucumber; 1.5 cups spinach. Hummus: 400 g chickpeas; 1 lemon; 1 garlic clove; 2 tbsp olive oil; 1/2 tsp cumin; 1 tbsp tahini |
| Q26 | Pizza Scrolls `pizza-scrolls/` | 10 | 1 cup wholemeal SR flour; 1/2 cup plain SR flour; 3/4 cup low-fat Greek yoghurt; 1/4 cup tomato paste; 3/4 cup low-fat tasty cheese; 2 tomatoes; 1 green capsicum; 1/4 red onion; 1 tsp oregano; 1 tbsp milk |
| Q27 | Mini Bean Quesadillas `mini-bean-quesadillas/` | 6 | 2 tsp olive oil; 1 red onion; 2 garlic cloves; 2 tsp paprika; 1 tsp cumin; 1 green capsicum; 400 g black beans; 2 tbsp tomato paste; 1/4 cup water; 2 cups spinach; 1 cup reduced-fat cheese; 6 light wraps |
| Q28 | Miso Roast Chicken `miso-roast-chicken/` | 6 | 1.5 kg chicken; 1/2 lemon; 1 garlic clove; 75 g miso; 1 tbsp maple syrup; 25 g butter; 5 leeks; 1/2 butternut pumpkin; 3 potatoes; 1/4 cup kimchi (opt); pepper |
| Q29 | Spanish Chicken and Vegetable Skewers `spanish-chicken-and-vegetable-skewers/` | 6 | 600 g chicken breast; 1/4 cup lemon juice; 3 garlic cloves; 1 tsp paprika; 1/2 tsp cumin; 1/2 tsp coriander; pepper; 3 tbsp coriander; 3 capsicums (red, green, yellow); 1 red onion; 3 zucchini; 2 tbsp olive oil; 1 lemon |
| Q30 | Coconut Lentil Soup `coconut-lentil-soup/` | 4 | Curry mix: 2 tsp ground coriander, 1 tsp turmeric, 1 tsp mustard powder, 1/2 tsp pepper, 1/2 tsp cumin, chilli (opt). 2 tbsp olive oil; 1 onion; 2 garlic; 4 cm ginger; 1 cup red lentils; 400 g can tomatoes; 270 ml reduced-fat coconut milk; 1 L water; 1/2 cup yoghurt; 2 tsp lime juice; 1/3 cup coriander |
| Q31 | Pumpkin, Chickpea and Coconut Curry `pumpkin-chickpea-and-coconut-curry/` | 4 | 1 tbsp olive oil; 1 onion; 4 garlic; 3 tsp ginger; 1 chilli; 1 bunch coriander; 2 tsp turmeric; 2 tsp cumin; 2 tsp ground coriander; pepper; 400 g can tomatoes; 400 ml light coconut milk; 800 g pumpkin; 420 g can chickpeas; 1 cup basmati; 1 lime |
| Q32 | Creamy Vegetable Pasta `creamy-vegetable-pasta/` | 12 | 1 zucchini; 2 tomatoes; 1/2 red capsicum; 1 sweet potato; 2 carrots; 4 cauliflower florets; 1/2 tsp garlic; 2 tsp mixed herbs; 2 tsp olive oil; 350 g chunky pasta sauce; 1 cup reduced-fat milk; 1.5 cups water; 1.5 tsp chicken stock powder; 1/2 cup light sour cream; 750 g penne; 2 cups reduced-fat cheese |
| Q33 | Chicken Pesto Pasta `chicken-pesto-pasta/` | 4 | 300 g penne; 1/2 tbsp olive oil; 1 onion; 1 zucchini; 2 garlic; 1 chilli; 400 g chicken breast; 2 cups spinach; 200 g grape tomatoes; 2 tbsp parsley. Pesto: 1 tbsp pine nuts; 3 cups basil; 2 garlic; 25 g parmesan; 1 tbsp olive oil; 1/4 tsp pepper |
| W1 | Cookbook:Pad Thai | 2-3 | 225 g rice noodles; 60 ml fish sauce; 50 ml white/rice vinegar; 75 ml tamarind juice; 75 ml palm/granulated sugar; 60 ml vegetable oil; 2 garlic; 30 ml chilli flakes; 225 g shrimp/tofu/chicken/beef; vegetables; 2 eggs; 4 green onions; 340 g bean sprouts; 175 ml peanuts; lime, coriander (opt) |
| W2 | Cookbook:Simple Nachos | 4-12 | 450 g lean beef mince; 1 can diced tomatoes with chiles; <=2 tsp taco seasoning; 2 tbsp sour cream; Mexican seasoning; corn chips |
| W3 | Cookbook:Sushi | not read | URL only, ingredients not recorded |
| W4 | Cookbook:Chicken Parmesan | 4 | 6 chicken breast halves; 1/2 cup flour; 2 eggs; 1.5 cups seasoned breadcrumbs; 1/2 cup parmesan; 1/2 tsp salt; 1/2 tsp pepper; olive oil; 16 oz pasta sauce; sliced mozzarella |
| W5 | Cookbook:Lamington | n/a | sponge cake; chocolate icing; desiccated coconut (no quantities) |
| W6 | Cookbook:Anzac Biscuits I | 25 | 2 cups plain flour; 1 cup sugar; 2 cups rolled oats; 1 cup desiccated coconut; 4 tbsp golden syrup; 225 g butter; 1 tsp baking soda; 2 tbsp water |
| (W7) | Cookbook:Fish and Chips | 4 | Deep-fried version, not a healthier swap; kept only as the "what it is" reference. Not used in the table. |

Quality note: Q recipes are written for health, so most are genuinely healthier swaps. Cost per serve cannot be stated without real prices (section 4). Unit conversions (US cups vs metric) in W recipes need care at ingest.

## 4. Retailers (public terms and robots only; no product or price pages fetched)

| Item | Coles | Woolworths |
|---|---|---|
| robots.txt | Fetched OK. `User-agent: *` rules: `Disallow: /search/`, product pages with no hyphen blocked, `Allow: /product/*-*`, query-parameter and `/on-special` paths mostly blocked. No explicit mention of bots or AI | HTTP 403 Forbidden on normal fetch. Stopped, not retried, no workaround |
| Terms | https://www.coles.com.au/important-information/terms/website-terms-conditions read. Section 2 limits use to "personal purposes unless Coles provides express written consent" and bars copying/republishing content and loads that are "unreasonable or disproportionately large". Does not use the words scraping or robots. Section 4 carves "pricing data" out of Coles-owned content, but that is not a licence to reuse it | Terms page returned 403. Not read. Unknown |
| Automated price collection | Not expressly permitted. Search path is disallowed to crawlers and use is limited to personal purposes. Treat as not permitted without written consent | Unknown (blocked). Treat as not permitted |
| Official API or open price data | None found; terms page does not mention one | None found (not checked beyond the blocked pages) |

Follow-up the owner could do: ask both retailers by email for written consent or a data licence. ACCC and state consumer sites were not checked. Until then, no retailer price enters the app.

Link-out search URLs (from memory, NOT fetched; confirm in a normal browser before shipping). A user taps a link and views the page themselves, so we never fetch it:
- Coles: `https://www.coles.com.au/search/products?q=<term>` (the `/search/` prefix matches the robots rule seen above)
- Woolworths: `https://www.woolworths.com.au/shop/search/products?searchTerm=<term>`

## 5. Restaurants (not researched; planning only)

Verify with `docs/superpowers/research/verification-protocol.md`: one human-readable page per place (own site, council or regulator page), read once, outcome open-correct / moved / closed / never-existed / unverifiable, evidence and date recorded, gate 90 percent and Wilson lower bound 85 percent, so at least 22 verified places per kind. Sample with `scripts/sample-for-verification.mjs`, never choose places by hand. No Google, Yelp, Tripadvisor, store locators or OSM.

| Craving group | Sold at independent Melbourne restaurants? | Suggested kind and check |
|---|---|---|
| Fish and chips, pies, sausage rolls, donuts | Yes, fish-and-chip shops and bakeries | Bakery and takeaway kinds; menu or trading hours on the shop's own site |
| Pad Thai, Chinese-style, laksa, curry, sushi, tacos/burritos, nachos | Yes, cuisine restaurants | Cuisine restaurant kinds; own site menu with current hours |
| Chicken parmigiana, wings, pizza-style snacks | Yes, pubs and Italian places | Pub/restaurant; website menu |
| Iced coffee, matcha, acai bowl, milkshake, ice cream, waffles | Yes, cafes and gelato shops | Cafe kind; dated social post is allowed only if it is on the place's own page |
| Anzac biscuits, lamingtons, Tim Tams, cake | Bakeries only for lamington/cake | Bakery |
| Cheezels, packet snacks, popcorn, hot dog / sausage sizzle | No (packaged goods or pop-ups) | Not a restaurant item; link to supermarket search only |
| Bacon and egg roll, garlic bread, creamy pasta | Cafes and Italian places | Cafe/restaurant; menu page |

The existing hand-checked tier should seed these. The bulk Overture tier remains labelled unchecked.
