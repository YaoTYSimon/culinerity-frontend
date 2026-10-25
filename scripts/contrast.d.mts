export function luminance(hex: string): number;
export function contrastRatio(a: string, b: string): number;
export function readThemes(css: string): Record<string, Record<string, string>>;
export function checkThemes(css: string): Record<string, { name: string; ratio: number; min: number }[]>;
