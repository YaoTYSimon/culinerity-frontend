import type { Profile } from '@culinerity/core';

/** The screens. Navigation is plain state in App (no router). */
export type View = 'swaps' | 'number' | 'checkin' | 'budget' | 'support' | 'nearby' | 'week' | 'welcome' | 'policy' | 'food' | 'meals' | 'pantry' | 'cook' | 'tradeoffs' | 'whatif' | 'foodsafety';

/** What the menu can ask for: a view, or "home" (the number once there is a score, otherwise the swaps). */
export type NavTarget = View | 'home';

/** Home is the number once there is a score, otherwise the swap search. */
export function homeFor(profile: Profile): View {
  return typeof profile.score === 'number' ? 'number' : 'swaps';
}

/** The view to show: the number screen needs a score, so without one it falls back to home. */
export function resolveView(requested: View, profile: Profile): View {
  return requested === 'number' && typeof profile.score !== 'number' ? homeFor(profile) : requested;
}
