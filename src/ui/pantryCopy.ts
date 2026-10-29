import type { AddItemError } from '@culinerity/core';

/** Every sentence on the My pantry screen, in one place. Kind, plain, no streaks or shame. */
export const INTRO = "Tell us what you have and we'll suggest what to cook. Optional.";
export const SHARED_DEVICE = 'Your pantry is saved on this device only. Anyone who can open your profile here can see it.';
export const EMPTY_PANTRY = 'Nothing here yet. Tap a few starters, or type what you have.';
export const STARTERS_LABEL = 'Common starters, our pick';
export const STAPLES_LABEL = 'Things I always have';
export const STAPLES_HINT = "Turn on what is always in your kitchen. We count these as there, with no amount or date.";
export const NO_DETAILS = "We have no details for this one, so we don't use it for recipes";
export const SHOW_FIRST = 50;

/** Pantry assumptions a person can mark; ids from the ingredient table (none is on until chosen). */
export const STAPLE_IDS: readonly string[] = [
  'canola-oil', 'olive-oil', 'sugar', 'flour-wheat', 'soy-sauce', 'vinegar', 'cumin', 'turmeric', 'paprika', 'chilli-ground', 'coriander-ground',
];

export const ADD_ERRORS: Record<AddItemError, string> = {
  full: 'Your pantry is full (200). Remove something to add more.',
  empty: 'Type what you have first.',
  'bad-grams': 'Use a number like 250, 250g or 1.5kg, up to 50kg.',
  'bad-date': "That date doesn't look right. Pick a day within the next five years.",
};
export const BAD_AMOUNT = ADD_ERRORS['bad-grams'];

/** Cook with what you have: every sentence in one place. Kind, plain, no streaks or shame. */
export const COOK_RULES_LINE = 'Showing recipes that avoid what you told us to avoid. This is a guide, not a certification. Check labels.';
export const COOK_NO_PANTRY = 'Your pantry is empty. Add a few things and we will suggest what to cook.';
export const COOK_FREE_TEXT_ONLY = 'None of what you added can be used for recipes yet. We only use items we have details for.';
export const COOK_ALL_HIDDEN = 'Every recipe near what you have is hidden because of what you told us to avoid.';
export const COOK_NOTHING_NOW = 'Nothing you can cook right now.';
export const COOK_NOTHING_CLOSE = 'Nothing close yet. Add a few more things to My pantry and we will look again.';
export const SECTION_LABELS = { now: 'You can cook this now', one: 'Need one more thing', few: 'Need a few more things' } as const;
export const STATUS_LABELS = { one: 'Need one more thing', few: 'Need a few more things' } as const;
export const ADD_MISSING = 'Add missing to my shopping list';
export const SALT_NOTE = "Salt isn't counted.";
export const SAFETY_HEADING = 'Food safety';
export const BEST_BEFORE_CHECK = 'Past its best-before. Check it looks and smells right.';
/**
 * Spec open item: a line for pregnancy and weakened immune systems ("check food safety advice from your doctor or
 * midwife") is shown only after the NSW "weakened immune system" PDF has been read. It has not, so it is left out here.
 * See docs/superpowers/specs/2026-10-29-pantry-recipes-design.md, "Food safety".
 */
export const NSW_ATTRIBUTION =
  "General guidance from NSW Food Authority (a NSW agency, not Victoria's). (c) State of New South Wales through the NSW Food Authority.";
