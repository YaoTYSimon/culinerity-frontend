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

/** URL of one of the three bundled home-cooked welcome photographs. */
export function photoUrl(name: WelcomePhotoName): string {
  return BY_ID[name];
}

export { PHOTO_CREDITS, type PhotoCredit } from './credits';
