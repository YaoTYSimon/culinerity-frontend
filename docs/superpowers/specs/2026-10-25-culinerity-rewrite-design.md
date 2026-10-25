# Culinerity: Focused Rewrite Design

## Intent and why

Culinerity helps anyone in Melbourne eat better for less, and gives the most help to people who are skipping meals or struggling to afford food. The motivating picture is a Monash student from a low-income family who skips meals on campus because tuition leaves too little for food. The app is not limited to students or to people who are food insecure. Older people, families, and people who are fine financially should all find it useful.

Three features carry the product:

1. **Hunger score.** A short, low-friction questionnaire based on FIES (the FAO's 8-question Food Insecurity Experience Scale), plus other validated or sourced food-insecurity measures, produces a score from 0 to 100. **100 means no food insecurity; 0 means critical, effectively starving.** The user also enters income and a simple picture of their finances.
2. **Craving and food swaps.** The user names something they crave or eat; the app suggests cheaper, healthier alternatives. The score decides what leads:
   - Low score (e.g. 15): much cheaper alternatives first. Cost dominates.
   - High score (e.g. 70): healthier alternatives first. Food takes up less of their mind, so general wellbeing is the aim.
   - Income and finances adjust the suggestions (a student with $20 left for the week sees different swaps from one with $80).
3. **Market prices.** Swap suggestions show real price comparisons from Melbourne supermarkets, starting with Coles and Woolworths.

## Goals

- Anyone in Melbourne can open the app and get value immediately. No account is required.
- The questionnaire is optional. Skipping it gives a neutral default experience; taking it personalises ranking.
- Re-taking the questionnaire over time keeps advice current.
- Prices and swaps are trustworthy: every price shows its source and date.
- Clean architecture that follows SOLID, OOD and DRY (see Constraints).

## Non-goals

- Not a medical or clinical tool; no diagnosis.
- No personalised financial or investment advice. Finance inputs only tune food suggestions.
- No user accounts, social features or payments in this version.
- Not limited to or branded for students, households or any single group.

## Anti-goals (failure even if it technically works)

- Shaming or stigmatising: the questionnaire and score must not feel like a test of poverty.
- Recommending "healthy" food that is unaffordable to someone at a low score.
- Showing stale or invented prices as if they were live.
- Hiding the 100 = best convention: the score's direction must be unmistakable in the UI.

## Constraints

- **Stack (existing, kept by the builder's choice):** React 19, Vite, TypeScript, Tailwind v4, started in Figma Make at `~/culinerity-frontend`. Recharts is available. The user has permitted a full rewrite and refactor of this codebase; reuse is optional.
- **SOLID / OOD / DRY** are required:
  - Single responsibility: scoring, swap ranking, price lookup and persistence are separate modules.
  - Open/closed and dependency inversion: the app depends on interfaces (e.g. `PriceSource`, `NutritionSource`, `FoodSupportSource`); concrete sources are injected. Adding a retailer or data source must not touch the UI or ranking logic.
  - Substitutability: mock and live implementations of each interface are interchangeable.
  - Interface segregation: small, focused interfaces.
  - No duplicated scoring, formatting or price logic; shared types in one place.
- **Mock first.** There is no external API available yet. Every external source (retailer prices, nutrition data, food-support locations) ships first as a mock implementation behind its interface, with realistic Melbourne-flavoured data. Mocks must be clearly labelled as mock data in the UI.
- **Pure logic is testable:** scoring and swap ranking are pure functions with unit tests.
- **Privacy:** questionnaire answers and finances stay on-device (local storage) unless the user explicitly opts in to something else. No data is sent to external services.
- **Accessibility:** works on a phone, readable and usable by older users; plain language.

## Decisions made by the user

- The score runs 0 to 100, with 100 meaning no food insecurity.
- Questionnaire is based on FIES plus other validated or sourced scales, and is quick.
- Users can enter their income and financial status.
- Low scores get much cheaper alternatives; high scores get generally healthier ones.
- Price sources include Coles and Woolworths (and "groceries" more broadly).
- Open to anyone in Melbourne, any age, any food-security status.
- All external APIs are mocked first; live sources are researched separately.

## Research findings: live data sources

- **Coles / Woolworths:** no official public API and no government open dataset were found. Third-party scrapers on Apify and wrappers on GitHub return regular price, special price and unit price, but scrape retailer sites, charge per request, and carry terms-of-use and reliability risk. Verify terms before depending on one.
- **Nutrition:** the Australian Food Composition Database (FSANZ, Release 3, December 2025, about 1,588 foods) is free to download as Excel files. It has no official API; reported licence CC BY 4.0 (attribution to FSANZ). Open Food Facts was not verified.
- **Food support:** Monash Caulfield runs a pantry with Foodbank Victoria (limited, registration required). No open Foodbank Victoria location dataset was found.

## Existing code (state as found)

About 4,900 lines. It already has FIES plus six extra domains weighted into a 0 to 100 cognitive-load score (higher worse, with a flip to "free" score), a keyword-matched craving database with recipes, and user-typed price trackers. It lacks live prices, score-driven personalisation and any source abstraction. It also has views outside this scope (policy dashboard, cultural staples, budget simulator, and others) and a landing page written for families. The working tree has uncommitted changes in 18 files.

## Left to the builder

- Exact questionnaire wording and which additional validated scales to include, as long as it stays quick and optional.
- The scoring formula and band names, provided 100 = best and the formula is documented.
- How finances map to ranking weights (a simple transparent rule is fine).
- Data shapes, folder layout, navigation, visual design and copy.
- Which existing code to keep, rewrite or delete, including the existing views and landing page.
- Mock data content and size.
- Test approach; Playwright MCP is installed for checking the running app.

## Calls made by the designer (not yet confirmed by the user)

These resolve gaps a reviewer found. Change any of them freely.

1. **Skipping the questionnaire:** the user is treated as a mid score (50), which blends cost and health equally. The questionnaire is offered once, gently, and can be dismissed or taken later. It is never required and never blocks swaps or prices.
2. **This version is a prototype:** it runs on mock data that is labelled "sample data" in the UI, with each price showing its source and date. Nothing is presented as live. The FSANZ nutrition data is mocked too, in the same shape as the real files, so a real import can replace it later.
3. **Craving input:** free text plus a picklist of common cravings, matched by keyword. If nothing matches, the app falls back to category-level suggestions and says so.
4. **Measuring "cheaper" and "healthier":** cost is per serve; health is a simple nutrient-based score drawn from AFCD-style fields (energy, protein, fibre, sugar, sodium). Both definitions live in one place.
5. **Finance inputs:** weekly food budget (required for personalisation) and weekly income (optional), in AUD.
6. **Version control:** build in `~/culinerity-frontend` on a new branch. The current uncommitted work is preserved on its own commit or branch before anything is removed.
7. **Scoring:** reuse the existing FIES-plus-domains scoring as the starting point, and cite the sources for the added domains in the code.
8. **Low scores:** show food-support options (for example food pantries and community fridges, via `FoodSupportSource`) plus a plain "this is not medical advice" note.
9. **Location:** optional suburb or postcode, stored on-device, used only for food-support proximity. Prices are Melbourne-wide in this version.
10. **Out of scope for now:** offline/PWA support and translations beyond English.

## Update 2026-10-25: native mobile app (user decision)

The user asked for a mobile app instead of a web app. This supersedes the web-UI parts of the stack and constraints above; everything about the product (score, swaps, prices, privacy, mock-first, SOLID/DRY) is unchanged.

- **Platform:** Expo (React Native, TypeScript) for iPhone and Android. NativeWind (Tailwind) for styling so the Tailwind design tokens and practices carry over. **Designer's call, not confirmed by the user.**
- **Shared logic:** the pure TypeScript layers (domain scoring and ranking, source interfaces and mocks, swap service, profile-store interface) move into a shared package used by the app; only the UI and the storage implementation are platform-specific (`AsyncStorage` replaces `localStorage`).
- **Persistence/privacy:** answers and finances stay on the device (AsyncStorage). No location permission is requested.
- **Backend:** unchanged (Task 12 Hono + SQLite); the app uses it through HTTP sources behind the existing interfaces, enabled by a config flag.
- **Design:** Linear-style (restrained palette, hairlines, 8px rhythm, fast transitions, skeleton loading, haptics on key actions), native navigation (bottom tabs: Swaps, Support, Check-in), safe areas, large touch targets (44pt), dynamic text sizes, VoiceOver/TalkBack labels. Dark mode follows the system.
- **Out of scope:** app-store submission, push notifications, accounts.
- The web app on `rewrite/focused` stays as the working reference until the mobile app reaches parity, then is retired by the user's decision.
