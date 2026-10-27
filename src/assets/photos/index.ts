const modules = import.meta.glob<string>('./*.jpg', { eager: true, query: '?url', import: 'default' });

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const id = path.replace(/^\.\//, '').replace(/\.jpg$/, '');
  BY_ID[id] = url;
}

/** URL of the bundled photograph for a catalogue item id, or undefined when it only has a drawing. */
export function photoFor(itemId: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(BY_ID, itemId) ? BY_ID[itemId] : undefined;
}

export type WelcomePhotoName = 'welcome-curry' | 'welcome-soup' | 'welcome-pancakes';
/** Screen headers: budget, data and policy, sign-in; `nearby-market` is bundled for the future Nearby screen. */
export type HeaderPhotoName = 'budget-harvest' | 'policy-shared-meal' | 'signin-cups' | 'nearby-market';
export type PhotoName = WelcomePhotoName | HeaderPhotoName;

/** URL of a bundled screen photograph (the three welcome photos and the four header photos). */
export function photoUrl(name: PhotoName): string {
  return BY_ID[name];
}

export { PHOTO_CREDITS, type PhotoCredit } from './credits';
