import { DISH_PHOTO } from './dishPhotos';

const modules = import.meta.glob<string>('./*.jpg', { eager: true, query: '?url', import: 'default' });

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const id = path.replace(/^\.\//, '').replace(/\.jpg$/, '');
  BY_ID[id] = url;
}

const has = (table: Record<string, string>, key: string): boolean => Object.prototype.hasOwnProperty.call(table, key);

/** URL of the bundled photograph for a catalogue id: its own file, else its dish's photo (see DISH_PHOTO), else undefined when it only has a drawing. */
export function photoFor(itemId: string): string | undefined {
  if (has(BY_ID, itemId)) return BY_ID[itemId];
  return has(DISH_PHOTO, itemId) && has(BY_ID, DISH_PHOTO[itemId]) ? BY_ID[DISH_PHOTO[itemId]] : undefined;
}

/** Photo ids that exist as files (for tests). */
export const PHOTO_IDS: readonly string[] = Object.keys(BY_ID);

export type WelcomePhotoName = 'welcome-curry' | 'welcome-soup' | 'welcome-pancakes';
/** Screen headers: budget, data and policy, sign-in; `nearby-market` is bundled for the future Nearby screen. */
export type HeaderPhotoName = 'budget-harvest' | 'policy-shared-meal' | 'signin-cups' | 'nearby-market';
export type PhotoName = WelcomePhotoName | HeaderPhotoName;

/** URL of a bundled screen photograph (the three welcome photos and the four header photos). */
export function photoUrl(name: PhotoName): string {
  return BY_ID[name];
}

export { DISH_PHOTO } from './dishPhotos';
export { PHOTO_CREDITS, type PhotoCredit } from './credits';
