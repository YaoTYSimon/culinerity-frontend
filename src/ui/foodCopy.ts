import type { DietRule } from '@culinerity/core';

/** Said on every setup screen. */
export const PRIVACY_LINE = 'Optional. Stays on this device. You can clear it any time.';

/** The passcode is access control, not encryption (see AGENTS.md). */
export const SHARED_DEVICE_LINE =
  'Anyone who can open this browser as you could see this. Use a profile with a passcode on a shared device.';

export const ALLERGY_NOTE = 'Tell us what to avoid. This does not replace reading labels or medical advice.';

/** The person's words for each rule, with one plain line on what we do with it. We do not verify any kitchen. */
export const RULE_COPY: Record<DietRule, { label: string; meaning: string }> = {
  halal: { label: 'Halal', meaning: 'No pork, no alcohol, meat from halal sources' },
  kosher: { label: 'Kosher', meaning: 'No pork or shellfish, meat and dairy kept apart, kosher-certified meat' },
  vegetarian: { label: 'Vegetarian', meaning: 'No meat, poultry or fish' },
  vegan: { label: 'Vegan', meaning: 'No animal products at all, including egg, milk and honey' },
  noBeef: { label: 'No beef', meaning: 'Leaves out anything with beef' },
  noPork: { label: 'No pork', meaning: 'Leaves out pork, bacon and ham' },
  noAlcohol: { label: 'No alcohol', meaning: 'Leaves out dishes made with alcohol' },
  glutenFree: { label: 'Gluten-free', meaning: 'Leaves out wheat, barley, rye and oats' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon 8 Feb" from a calendar day (YYYY-MM-DD), the same in every time zone. */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export const MOON_CAVEAT = 'Dates depend on the moon sighting.';
