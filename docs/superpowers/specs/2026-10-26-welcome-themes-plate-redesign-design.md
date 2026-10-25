# Welcome page, four themes and the "plate" redesign: Design

Builds on `2026-10-25-culinerity-rewrite-design.md` (the shipped web app). Everything there still holds: score 0–100 with **100 = secure, 0 = critical** always labelled, mock-first data, privacy (answers stay on the device, no third-party requests), AA contrast, `focus-visible`, `motion-safe`, tests, SOLID/DRY.

## Intent and why

The app works but looks like a generated page. The user wants it to feel like a **home-cooked, comforting** place for anyone in Melbourne, with the **hunger number** (the 0–100 food-security score, "cognitive load of hunger") as the emotional centre of the first impression and the home screen. The design comes from the taste skill's rules (installed at `~/.agents/skills/design-taste-frontend`; read `SKILL.md`, `references/app-screens.md`, `references/tells.md`, `references/type.md`, `references/colour.md`).

**The idea (one sentence):** *On this page, the plate becomes the dial.* The score sits on a round plate whose rim fills as the number rises; food photos are cropped as round plates; buttons are fully round. This replaces the earlier cream-and-serif look, rounded white cards, pill chips, small label lines, dashed rules and endless animation, all of which the skill lists as generated-page tells.

Reference mockups (open in a browser, they are static HTML): `docs/superpowers/design/mockups/welcome-themes.html` (welcome page in four themes) and `docs/superpowers/design/mockups/six-screens.html` (check-in question, number, swaps, food support, friendly states, share card). They are the visual authority for layout, type scale, spacing and copy; this document is the authority for behaviour.

## What gets built

1. **Welcome page** shown once, to a first-time visitor (no account, no login: the app has none). Left-aligned wordmark "Culinerity" and the four theme dots at the top right; headline **"How much is food on your mind?"**; one supporting sentence (two minutes, one number out of 100, 100 is secure, 0 is critical, stays on your phone); an empty plate-dial showing "?" and "out of 100"; three round photos (red curry, orange autumn soup, pancake table); primary round button **"Find my number"** (starts the check-in); plain text link **"Skip to cheaper swaps"** (goes to the swap search). Shown on first launch only (`welcomeSeen` stored on the device); also reachable again from the menu ("Welcome").
2. **Four colour themes**, user-selectable: *Tobacco and olive* (default), *Sand and moss*, *Walnut and tan*, *Cream and pomegranate* (the old look, kept because the user likes it; the skill flags it as the most generic, so it is not the default). Token values are in the mockup source and below. The picker is four small round dots (each half ground, half accent) on the welcome page and in the app header menu; the choice is saved on the device (key `culinerity.theme.v1`), applied before first paint (no flash), and never sent anywhere. The selected dot has a visible ring and `aria-pressed`; each dot has an accessible name (the theme name).
3. **Check-in, one question per screen:** the 8 FIES questions then the six domain questions from `@culinerity/core` (same scoring, same content), now one question at a time with progress dots ("3 of 8"-style count), big filled answer buttons (Yes/No for FIES; the 0–4 frequency labels for domains), Back, and "Answers stay on this phone". Never saves a score until everything is answered; "Skip for now" always available. Same props contract as today's `Questionnaire` (`onComplete(score)`, `onSkip()`).
4. **The number (home dashboard once a score exists):** headline from the band (e.g. "Food is on your mind a lot."), the plate-dial with the score and band ("42 · Strained"), "100 is secure, 0 is critical", a one-line trend when there are ≥2 check-ins ("Up 9 since your first check-in: 33, 35, 36, 40, 42"), a "Cheapest swaps first" / "Healthiest swaps first" nudge matching the ranking rule, and the primary button "See cheaper swaps". The rim fill animates once on load (reduced-motion: shows the final state immediately). Needs a **score history** (see Data).
5. **Swaps list:** rows with a round photo (round drawn illustration as fallback), name, store · per serve, **"Saves $X"** as plain text, big price on the right, relative health label as plain text ("Healthier" etc., never a number), the sample-data note once per list. Behaviour unchanged (ranking, budget flags, unpriced = "Price unavailable", never $0).
6. **Food support page:** headline "Free food near you.", one round photo, plain rows (name, suburb, then the place's `notes` text, which carries the times and conditions), a "Directions" button on each row, "Sample data" and "not medical advice" notes.
7. **Friendly states:** loading (plain round skeleton shapes, `motion-safe` pulse), no match ("We don't have that one yet." with suggestion buttons), backend unreachable ("We can't reach the server." with "Try again"). Replaces the current versions; same behaviour and tests.
8. **Shareable "my week" card:** a page with a big round photo, "I saved $N on food this week.", the list of swaps the person added to their week with each saving, and "Made with Culinerity. Savings only: no score, no name." Sharing uses the Web Share API with a plain-text summary, falling back to copy-to-clipboard; no image export in this version. Needs an **"Add to my week"** action on a swap row (a round button) and a stored list (see Data).

## Visual system (from the taste skill; the "direction dealt" is `one-motif`, seed 1598580120)

- **Type:** one family, **Schibsted Grotesk** (weights 400, 600, 800), self-hosted with `@fontsource/schibsted-grotesk` (no third-party requests). Display: 800, tracking −0.045em, leading 0.95, sentence case. Text: 400/600, leading 1.35–1.4. Five sizes at most on a screen. Headlines are at most 2–3 lines. Left-aligned; one centred moment per screen (the plate).
- **Shape:** fully round only: buttons and answer buttons are pills (`border-radius: 999px`), photos are circles, the dial is a circle. No rounded cards, no chips, no pill badges, no hairlines, no dashed rules, no shadows at rest, no gradients, no emoji, no icons in tinted squares, no small uppercase labels, no monospace, no index numbering.
- **Surfaces:** flat colour and tone steps only (`--surface` one step from `--bg`). Rows are separated by space, not lines.
- **Motion:** only the dial rim filling once on the number screen and `motion-safe` skeleton pulses; nothing loops forever; everything respects `prefers-reduced-motion`.
- **Tokens (CSS variables, Tailwind v4 `@theme` + `[data-theme]` overrides):**

| theme | bg | surface | ink | muted | accent | accent-ink |
|---|---|---|---|---|---|---|
| tobacco (default) | #472913 | #5a3720 | #e4e0cf | #cdbfa8 | #525e1b | #e4e0cf |
| sand | #ddd6c6 | #d2cab8 | #2a2a26 | #55544a | #4f6238 | #f3f0e6 |
| walnut | #2b2216 | #3d3123 | #e4e2da | #cbbfae | #bda38b | #2b2216 |
| cream | #f6efe6 | #e6d8c9 | #3a1f1a | #5b4540 | #8f1d37 | #ffffff |

Every text/background and control/background pair must meet WCAG AA (4.5:1 for text, 3:1 for UI): measure them; **if a pair fails, adjust the failing token minimally and record it** (e.g. `muted` on `surface`, `accent-ink` on `accent`). The old per-theme tokens (`--color-hero*`, plate colours, fruit themes) are removed.
- **Imagery:** real photos (CC0) for the welcome collage and the food support photo; the drawn illustrations stay as fallbacks and for swap items without photos, masked as circles. Photos are credited in the existing "Photo credits" disclosure.

## Photos (user-approved files; download exactly these, nothing else)

From Wikimedia Commons, all CC0, found via the taste skill's `scripts/assets.mjs`:
- `commons:61666606` "Red Curry (Unsplash)" → `src/assets/photos/welcome-curry.jpg`
- `commons:61661548` "Autumn Soup (Unsplash)" → `welcome-soup.jpg`
- `commons:58859727` "Breakfast table with pancakes (Unsplash)" → `welcome-pancakes.jpg`
Download one at a time with `--get commons:<id> --to <new empty dir outside the repo> --width 1600`, verify each is a real JPEG and the title/licence match, resize with `sips` to 600px square-friendly JPEG (40–110 KB), strip metadata, add to `credits.ts` (title, creator as printed, CC0, licence and source URLs). Stop and report if anything differs.

## Data (core `Profile`, stored on the device only)

Add optional fields to `Profile` in `packages/core` and to `sanitizeProfile` (type-checked, unknown fields dropped, never throws):
- `welcomeSeen?: boolean`
- `scoreHistory?: { score: number; at: string }[]` (ISO date; newest last; capped at 12; each completed check-in appends; `score` and `scoreTakenAt` keep working as today)
- `weekSwaps?: { itemId: string; name: string; saving: number; at: string }[]` (capped at 50; entries older than 7 days are ignored when summing)
The theme lives in its own store: `ThemeStore` interface in `@culinerity/core` (`load(): ThemeId`, `save(id)`), `LocalThemeStore` (localStorage, never throws) in the web app, `InMemoryThemeStore` for tests; `type ThemeId = 'tobacco' | 'sand' | 'walnut' | 'cream'`; unknown or corrupt values fall back to `'tobacco'`.

## Constraints

- Web app only (React 19 + Vite + Tailwind v4 at the repo root; shared logic in `packages/core`; backend unchanged). Phone-first (390px) and scales to a centred column on desktop (max ~520px, theme-coloured field around it); no horizontal scroll at 320–1280px.
- SOLID/DRY: UI depends on interfaces via `useServices`; the theme applies through one `ThemeProvider` + `data-theme` attribute, not scattered class names; shared pieces (`Plate` dial, `RoundPhoto`, `PillButton`, `ThemeDots`) are reusable components with tests; savings and trend maths are pure functions in core with tests.
- Privacy: no network requests for fonts, photos or themes at runtime; the share text contains only swap names, savings and the total, never the score, answers, finances, suburb or name.
- Accessibility: one h1 per screen; landmarks; keyboard operable (dots, dial buttons, answer pills, Back); every control has an accessible name; focus rings; dial has `role="img"` with a text alternative ("Food security score 42 out of 100, Strained; 100 is secure, 0 is critical"); `aria-live` for loading/errors; minimum 44px targets.
- Existing behaviour and tests keep their intent (never weaken a test). Update markup-dependent tests where the UI changes.
- Replace, don't pile on: remove the old landing hero, hero still life, tonal-card styles and unused tokens/components once replaced (leave drawn illustrations used as fallbacks).

## Goals / non-goals / anti-goals

- **Goals:** a first impression that is warm and specific to this app; the number is the hero; four themes people can choose; the whole app consistent with the new system; fewer generated-page tells.
- **Non-goals:** accounts or login; server-side storage of anything personal; native mobile; image export for the share card; real live prices.
- **Anti-goals:** shaming or clinical tone; showing the score in anything that is shared; a theme that fails contrast; a welcome page that blocks the swap search for someone who just wants swaps; looking like the generic cream-and-serif page again.

## Left to the builder

Exact spacing, component names and file layout (keep `src/ui/` conventions); the exact dial arc geometry; the band copy for each score band (five bands exist in core: Critical, Struggling, Strained, Steady, Secure; write one plain, kind headline each, no stigma); how the menu is laid out; the `geo:` link details; test structure.


## Calls made by the designer (answers to the builder check; not yet confirmed by the user)

1. **Food support copy:** the mockup line "Nobody will ask for proof" is **dropped**: some places (e.g. the Monash pantry) do require registration, so the app must not promise it. Replace with "Call ahead to check times." `SupportPlace` is **not extended**: times and conditions live in `notes` (rewrite the mock notes, e.g. "Tuesdays from 1pm. Limited stock, registration needed."). No core/server schema change.
2. **Directions:** one "Directions" pill button per row, a user-initiated external link `https://www.google.com/maps/search/?api=1&query=<name and suburb, URL-encoded>` with `target="_blank" rel="noopener noreferrer"`. The app itself requests no location and makes no request until the person taps it.
3. **My week:** entries are grouped by `itemId` with a count ("Falafel wrap ×2"). "Add to my week" is repeatable (each tap adds one entry; the week view has "Remove one" per item and "Clear week"). The week window is a **rolling 7 days**. `saving` is stored as computed at add time (cents, positive only); a swap with no known positive saving cannot be added (no button). The share text lists up to 8 grouped items then "+N more" with the total; the on-screen card lists the same.
4. **Navigation:** stays state-based (no router). Views: `swaps`, `number`, `checkin`, `support`, `week`, `welcome`. **Home = the number screen when a score exists, otherwise the swap search.** A header with the wordmark, the four theme dots and a "Menu" button (a simple list: Home, Swaps, Check-in, Food support, My week, Welcome). Opening "Welcome" from the menu does not reset `welcomeSeen`. `FinanceForm` ("Your week" budget) becomes a "Your budget" disclosure under the swap search and on the number screen; the old persistent score badge is replaced by the number screen itself.
5. **Buttons vs chips:** the no-match suggestions and craving choices are real **pill buttons** (one button shape, filled with the surface tone), not badges; the rule against chips is about label-badges. `CravingSearch` keeps its text input and popular cravings, restyled (popular cravings as round photos with names beneath in a grid, 2 columns at 390px, up to 5 on desktop).
6. **Bands:** headlines by band (builder writes final kind wording): Critical "Food is taking up almost all your headspace.", Struggling "Food is taking up a lot of room.", Strained "Food is on your mind a lot.", Steady "Food is mostly in hand.", Secure "Food is in a good place." Nudge: score below 40 "Cheapest swaps first", 40–59 "A balance of cheap and healthy", 60+ "Healthiest swaps first" (the ranking itself is unchanged and continuous). `SUPPORT_BELOW = 40` stays (support is surfaced on the number screen below 40).
7. **Photos per screen:** reuse the three welcome files: curry on the welcome page, soup on the check-in, number and share screens, pancakes on food support. No other downloads.
8. **If the photo download is impossible** (script or network unavailable, or a title/licence mismatch): stop that item, report it, and use the existing drawn illustrations masked as circles; do not substitute other photos.
9. **Replace, don't pile on:** delete `ScoreSummary`, `Landing`, `HeroStillLife` and the old tonal-card styles once their replacements exist; port every intent-level test (a score is never saved before everything is answered; skipping works; first launch never blocks the swap search; corrupt storage still renders first launch; support shows below 40 and is hidden at 80; sample-data and not-medical-advice notes) to the new components.
