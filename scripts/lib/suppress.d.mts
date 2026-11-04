export function validateSuppressList(ids: unknown): string[];
export function applySuppress<T extends { id: string }>(places: T[], ids: unknown, dedupedIds?: string[]): { places: T[]; suppressed: number; warnings: string[] };
