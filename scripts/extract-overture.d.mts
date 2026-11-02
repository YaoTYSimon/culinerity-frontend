export function buildSql(release: string): string;
export function assertOutsideRepo(out: string, repoRoot?: string): void;
export function parseArgs(argv: string[]): { release: string; out: string };
