# Cultural food and "eat what fits": Design

Requested by the user on 27 October 2026: "a culturally significant food tracker which should also be an important part of the app, where people can eat what fits culturally." Written without a question round (the user is away from the keyboard); every decision is the designer's call and the user can change any. Builds on the plate design system, the swaps engine, the weekly tracker (`week`) and the nearby-options design (`2026-10-26-nearby-options-design.md`).

## Intent and why
Melbourne is one of the most culturally diverse cities in the world, and food insecurity is not only about money: a cheap swap that does not fit someone's faith, tradition or home cooking is not a swap they will eat. Today the app suggests swaps for common Australian cravings. This feature lets people say, in their own words and only if they want to, which foods and food rules matter to them, and then makes **swaps, the week tracker and nearby places fit them first**. It also lets people keep a simple record of the culturally meaningful meals they eat (family dinners, festival foods, fasting and feast days) as a quiet, positive streak of "meals that felt like home", which supports the app's cognitive-load framing without judging anyone.

## What gets built
1. **"My food" setup** (optional, from the number screen, Menu "My food", and the welcome flow as a skippable step): the person picks any of: food traditions or cuisines (a curated starter list of cuisines common in Melbourne, plus "Add your own" free text), dietary rules (halal, kosher, vegetarian, vegan, no beef, no pork, no alcohol, gluten-free, allergies as free text), and occasions (Ramadan, Lent, Diwali, Lunar New Year, Passover, Easter, Eid, Navratri and others, by the person's own choice). Nothing is inferred from name, language, suburb or anything else; nothing is pre-selected.
2. **Fit the swaps:** the swaps results honour dietary rules as hard filters (a halal rule never shows a pork swap) and traditions as a ranking boost ("Fits your kitchen" label in plain words), then the usual hunger-score ranking (cheaper at low scores, healthier at high). Where the catalogue has no fitting swap, the screen says so kindly and shows the closest options marked "check the ingredients".
3. **Cultural meals tracker** ("Meals that felt like home", a view under My week): add a meal in two taps (pick a tradition or "Other", dish name optional, who with optional: "family", "friends", "community", "alone"); the week shows a plate-style ring of days with at least one such meal, a plain sentence ("4 meals that felt like home this week"), and a calm list with Remove/Undo. No scoring, no targets, no shaming for zero.
4. **Occasion mode:** if the person chose occasions, the app shows a small, dated reminder during the occasion's real dates (computed from a bundled, sourced calendar table, e.g. Ramadan dates for the next few years from an authoritative source; lunar dates shown as "about" where they depend on sighting) with fitting swaps and budget context ("Eid meals often cost more: here is the budget view").
5. **Nearby fit:** the Nearby view filters/boosts places that sell or serve fitting food (halal butcher, Asian grocer, Middle Eastern grocer, community kitchens run by cultural associations), using place tags from sourced data. This depends on the nearby-options feature and is built after it.
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
- Pure core functions (tested, platform-free, `now` injected): `fitsRules(item, rules)`, `rankForProfile(items, foodProfile, score)`, `culturalWeek(meals, now)` (Monday week, DST-safe, reusing the budget week helpers), `occasionsOn(calendar, ids, now)`.
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
