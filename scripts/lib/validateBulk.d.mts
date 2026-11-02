export const BULK_KIND_LIST: string[];
export const BULK_LICENCE_LIST: string[];
export const BULK_BOX: { lat: [number, number]; lng: [number, number] };
export const MIN_CONFIDENCE: number;
export function validateBulkPlace(p: any, opts?: { minConfidence?: number }): string[];
export function validateBulkPlaces(list: any[], opts?: { minConfidence?: number }): string[];
