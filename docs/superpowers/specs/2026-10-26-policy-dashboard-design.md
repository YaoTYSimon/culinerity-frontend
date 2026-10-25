# Policy dashboard: Design

Written unattended (the user asked for "the policy dashboard at the bottom, if possible" and went to sleep with blanket permission to create and source everything). Decisions are the designer's; see "Calls made". Builds on the plate design system and on the sourced dataset `docs/superpowers/research/2026-10-26-food-security-data.json` (19 sources, 38 indicators, 12 areas, 6 interventions; two headline figures were re-checked against the primary sources: Foodbank Hunger Report 2025 reports 33% of Australian households (about 3.5 million) food insecure, and the ABS 2023 release reports 13.2% of households (23.2% of the lowest-income households, 34.0% of lone-parent families, 27.8% of group households)).

## Intent and why

People who work on food security (councils, universities, community groups, journalists, students) need **one honest page** that shows what is known about food insecurity in Australia, Victoria and Melbourne, **where the figures come from**, and **what the evidence says helps**, in the same warm, plain style as the rest of Culinerity. The earlier prototype of this page (on the `backup/pre-rewrite` branch) used **invented** suburb numbers and made-up policy "effects"; this version contains **only sourced figures**, shows their uncertainty, and offers no simulator that would imply precision the evidence does not have.

It sits "at the bottom": a link in the footer ("Data and policy") and the last item in the Menu, not part of the everyday flow.

## What gets built

A **"Data and policy"** view (new `View` 'policy'; one h1 "What we know about food insecurity."; a one-sentence intro: "Figures from published research, with where each one comes from. Different surveys measure different things, so we show them side by side, never added together."). Sections, each with a plain h2, a short reading and rows of figures; every figure row shows the number, what it measures, who it covers, the period, the publisher (as a link), and a confidence word ("High confidence", "Medium", "Low") in plain text; figures older than 5 years or flagged dated carry "Older data":

1. **How many go without.** The two national measures in separate rows with a plain explanation of why they differ (different questions, different years: Foodbank's online survey of households, 33% in 2025, about 3.5 million households, 61% of those severely food insecure; the ABS 10-item module for 2023, 13.2% of households). A small plate dial for each shows the share (33% and 13.2%) with its own caption; the two dials are **not** placed on one scale as a series. Victoria: the Victorian Population Health Survey figure (8% of adults, 2022) and the Barwon rise (4% in 2020 to 14% in 2022) as separate rows. If the research marks a figure as not found (e.g. a current statewide Victorian rate), the page says "Not found in published sources we could read" and does not estimate.
2. **Who is most affected.** Horizontal bars (flat, fully round-ended, themed tokens, direct labels, no gridlines): Foodbank 2025: single-parent households 68%, households with a person with a disability or health issue 67%, renting households 48%, part-time or casual worker households 40%, households earning $91,000 or more 20% (for scale); ABS 2023 as a second, separately labelled group of bars: lowest income quintile 23%, lone-parent families 34%, group households 28% (students and young workers share houses). Each bar group carries its source and instrument in the caption.
3. **Students and young people.** The University of Tasmania surveys (41.9% in 2022, high confidence; 53% in 2024, medium, reported via press coverage of the paper), the ABS group-household figure, the youth figures from the Monash article (medium/low). Caption: "Not Melbourne-specific." Student living-cost rise since 2021 (29% vs 24%, low confidence).
4. **Melbourne areas.** A sorted list (most disadvantaged first) of the 12 SA2 areas in the dataset with their ABS SEIFA 2021 Index of Relative Socio-economic Disadvantage score as a bar and the number; caption: "Lower scores mean more disadvantage. These are ABS statistical areas (SA2), not suburbs; names are the nearest suburb. This measures disadvantage, not hunger." The LGA labels are the research agent's mapping, shown only as "nearest council area" with a note that they are approximate, or omitted if the mapping cannot be verified in the build (the builder checks against the ABS SA2→LGA concordance; if not verifiable, drop LGA text).
5. **What helps (evidence).** One row per intervention (cash transfers; food vouchers and subsidies; food banks and pantries; community meals; school meals; co-ops and social grocers): evidence strength as a word (Strong/Moderate/Mixed/Weak, never colour alone) with one plain sentence and the source; a note that **cost-per-person figures were not found**, and that the evidence base is thin (one narrative review plus small Australian studies). Victoria's 2025–26 budget commitment of $18 million for food relief is a figure row.
6. **Cost of living.** The CPI food rows from the budget research (Melbourne and Australia), with the 28 October 2026 release note ("The September quarter CPI is due on 28 October 2026"), poverty lines, and the JobSeeker shortfall rows, shared with the budget tracker's benchmark source.
7. **About this data.** The full source list (publisher, title, date, link, licence and attribution requirement when the source states one, accessed date), the five main caveats from the research, the list of "not found" items, and "Last updated 26 October 2026". A "Send corrections" line is NOT added (no inbox exists).

Nothing on this page uses, shows or sends **any user data**. There is no suburb input, no "your area" lookup and no simulator.

## Data

- Reuse the sourced dataset through the same `BenchmarkSource` mechanism as the budget tracker (extend it with `group: 'policy'` indicators, `suburbs` and `interventions` from the research JSON) generated by `scripts/build-benchmarks.mjs` into a typed file with a test that fails if the generated file is out of date. Pure helpers (sorting areas by score ascending, formatting percentages and money, computing "Older data" from `period`/year) live in core with tests.
- **Integrity tests (important):** every figure row maps to an indicator id that exists in the dataset; every indicator has a source with an `https://` URL; the displayed number is read from the dataset (never typed into a component); the two national measures are never rendered on a shared axis or summed (a test asserts they render in separate, captioned groups); low-confidence indicators render the word "Low confidence"; the "not found" list from the research appears.

## Constraints

- Plate design system (Schibsted Grotesk, fully round shapes, flat colour, themes, no cards/chips/hairlines/shadows/gradients, AA contrast, `focus-visible`, one h1, headings in order, landmarks, 44px targets, no horizontal scroll at 320–1280px, phone-first, centred 520px column on desktop). Bars are SVG or CSS with direct value labels (text as well as length); every bar and dial has a text alternative; colour is never the only encoding; respects `prefers-reduced-motion` (no animation required; a one-time bar grow is optional and must be disabled under reduced motion).
- Copy: neutral, precise, non-sensational; no alarm colours; no moralising; plain words for terms ("food insecurity: not having enough food, or not being sure of getting it, because of money").
- Accuracy and attribution: show each figure exactly as sourced (unit, scope, period); keep CC BY or other attribution where the source states it; never present medium/low-confidence figures as settled; never create a new statistic by combining sources.
- Links are plain external anchors (`rel="noopener noreferrer"`, `target="_blank"`), no runtime fetching, no analytics.
- Print-friendly (a simple `@media print` stylesheet: light theme tokens, no navigation) so councils can print it.

## Goals / non-goals / anti-goals

- **Goals:** an honest, cited one-page overview; a pleasant page that matches the app; reusable data for the budget tracker; clear about what is not known.
- **Non-goals:** user data aggregation, suburb-level hunger estimates, policy cost simulators, maps, downloading datasets, an admin interface, live data feeds.
- **Anti-goals:** invented or extrapolated numbers; the old prototype's fake suburb table and policy "gain" figures; mixing instruments; implying that the SEIFA score measures hunger; hiding uncertainty.

## Calls made (designer, unattended; the user can change any)

1. Static, cited dataset instead of live data; manual refresh documented.
2. No simulator and no per-suburb "hunger" estimates (evidence does not support them).
3. Two national measures shown separately with an explanation, never on one axis.
4. SEIFA shown for SA2 areas with the honest caption; LGA labels dropped unless verified.
5. Dated or low-confidence figures are labelled in words and sometimes omitted from headline rows.
6. The page is reached from the footer link and the last Menu item, not the number screen.
7. Print stylesheet included; no export file.

## Left to the builder

Component and file names; the exact bar/dial geometry within the system; how to word the reading under each section (within the tone); the build script details; whether to group the sources list alphabetically or by section.
