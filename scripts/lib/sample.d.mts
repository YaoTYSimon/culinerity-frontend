export const CBD: { lat: number; lng: number };
export const REGIONS: string[];
export const REGION_EDGES_KM: number[];
export const DEFAULT_KIND_WEIGHTS: Record<string, number>;
export const DEFAULT_REGION_WEIGHTS: Record<string, number>;
export const EXCLUDE_METERS: number;
export function regionFor(p: { lat: number; lng: number }): 'inner' | 'middle' | 'outer';
export function stratumKey(kind: string, region: string): string;
export function mulberry32(seed: number): () => number;
export function sampleStrata<T extends { id: string; name: string; kind: string; lat: number; lng: number }>(
  places: T[],
  opts: {
    seed: number;
    fraction?: number;
    minPerStratum?: number;
    kindWeights?: Record<string, number>;
    regionWeights?: Record<string, number>;
    exclude?: Array<{ name: string; lat: number; lng: number }>;
  },
): Array<{ stratum: string; size: number; places: T[] }>;
export function wilson(k: number, n: number, z?: number): { p: number; lower: number; upper: number };
