export const QUALITY_REASONS: string[];
export const MAX_NAMES_PER_POINT: number;
export function qualityDrop(place: { name: string; address: string }): 'truncated-name' | 'junk-name' | 'bad-address' | null;
export function dropCentroids<T extends { id: string; name: string; lat: number; lng: number }>(places: T[], max?: number): { kept: T[]; dropped: T[] };
export const GENERIC_WORDS: Set<string>;
export function nameTokens(name: string): string[];
