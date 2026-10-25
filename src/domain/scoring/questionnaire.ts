/**
 * Food-security questionnaire.
 *
 * Domain A (FIES_QUESTIONS): the FAO Food Insecurity Experience Scale, eight
 * yes/no items, worded in plain language. Source: FAO, Voices of the Hungry.
 * It is a validated instrument.
 *
 * Domains B-G are additions carried over from the earlier "Cognitive Load of
 * Hunger" check-in. They were written for this project and are UNVALIDATED:
 *   B Mental bandwidth      - unvalidated; informed by scarcity research
 *                             (Mullainathan & Shafir) but items are our own.
 *   C Cost pressure         - unvalidated; own items.
 *   D Nutrition trade-offs  - unvalidated; own items.
 *   E Time and logistics    - unvalidated; own items.
 *   F Decision friction     - unvalidated; own items.
 *   G Cultural fit, dignity - unvalidated; own items.
 * Each is answered 0 (never) to 4 (almost always) over the past 4 weeks.
 */

export type DomainId = 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const FIES_QUESTIONS: readonly string[] = [
  'In the past 4 weeks, did you worry you would not have enough food because money was short?',
  'Were you unable to eat healthy and nutritious food because money was short?',
  'Did you eat only a few kinds of food because money was short?',
  'Did you have to skip a meal because there was not enough money for food?',
  'Did you eat less than you thought you should because money was short?',
  'Did your household run out of food because money was short?',
  'Were you hungry but did not eat because there was not enough money for food?',
  'Did you go a whole day without eating because money was short?',
];

export const DOMAINS: Record<DomainId, readonly string[]> = {
  B: [
    'Thoughts about food, or how to pay for it, interrupted something else I was doing',
    'I found it hard to concentrate at work, school or home because of worry about food',
    'I ran food costs through my head when I was not shopping',
    'Worry about food kept me awake or was on my mind first thing in the morning',
  ],
  C: [
    'I had to choose between food and another essential (rent, power, transport, medicine)',
    'I put items back or left them off the list because of the total',
    'I was unsure I could cover food until my next pay or payment',
  ],
  D: [
    'I bought a less healthy option because the healthier one cost more',
    'I filled up on cheap foods I would rather not rely on',
  ],
  E: [
    'Getting food took more time or travel than I could easily spare',
    'I went to more than one shop, or waited for a markdown, to make the budget work',
    'I lacked the time, energy or kitchen equipment to cook what I had',
  ],
  F: [
    'Deciding what to buy or cook felt overwhelming',
    'I second-guessed food purchases after making them',
    'I put off shopping or meal decisions because they felt like too much',
  ],
  G: [
    'I could not get the foods that matter to my culture, faith or family',
    'I felt uncomfortable about how I get food',
    'I had little real choice over what I ate',
  ],
};

export interface Answers {
  fies: (boolean | null)[];
  domains: Record<DomainId, (number | null)[]>;
}
