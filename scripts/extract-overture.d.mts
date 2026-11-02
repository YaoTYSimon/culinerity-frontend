export function buildSql(release: string, parquet?: string): string;
export function assertOutsideRepo(out: string, repoRoot?: string): void;
export function parseArgs(argv: string[]): { release: string; out: string; parquet?: string };
