export const CELL_DEG: number;
export const CELL_ORIGIN: { lat: number; lng: number };
export function cellKey(lat: number, lng: number, cellDeg?: number): string;
export function neighbours(key: string, cellDeg?: number): string[];
