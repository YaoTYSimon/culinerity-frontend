/** The screens. Navigation is plain state in App (no router). */
export type View = 'swaps' | 'number' | 'checkin' | 'support' | 'week' | 'welcome';

/** What the menu can ask for: a view, or "home" (the number once there is a score, otherwise the swaps). */
export type NavTarget = View | 'home';
