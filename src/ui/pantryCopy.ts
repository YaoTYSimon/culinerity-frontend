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
