export function buildSample(
  places: Array<Record<string, any>>,
  checked: Array<{ name: string; lat: number; lng: number }>,
  opts: { seed: number; fraction?: number },
): { rows: Array<Record<string, any>>; sizes: Array<{ stratum: string; size: number; sampled: number }> };
export function parseArgs(argv: string[]): { input: string; out: string; seed: number; fraction: number };
