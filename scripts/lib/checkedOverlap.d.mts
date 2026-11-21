export const CHECKED_OVERLAP_METERS: number;
export function similarReliefNames(a: string, b: string): boolean;
export function dropNearChecked<T extends { id: string; name: string; kind: string; lat: number; lng: number }>(
  places: T[],
  checked: { name: string; lat: number; lng: number }[],
  meters?: number,
): { kept: T[]; dropped: { id: string; name: string; of: string }[] };
