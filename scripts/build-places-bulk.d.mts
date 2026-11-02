export const PLACES_DIR: string;
export const MAX_SHARD_GZIP: number;
export const MAX_TOTAL_GZIP: number;
export const OVERTURE_ATTRIBUTION_URL: string;
export function shardPlace(p: any): any;
export function buildShards(places: any[], opts?: { maxShardGzip?: number; maxTotalGzip?: number }): { manifest: any; files: Record<string, string> };
