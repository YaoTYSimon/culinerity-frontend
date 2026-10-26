import type { ThemeId } from '@culinerity/core';

export interface ThemeTokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  'accent-ink': string;
}

/**
 * The single TypeScript source of the theme colours, used by ThemeDots. src/index.css and the no-flash script
 * in index.html must hold the same values; src/theme/tokens.test.ts fails when they drift.
 */
export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  // Accent lightened from the dealt #525e1b (1.87:1 on bg) so the primary button reads on the ground.
  tobacco: { bg: '#472913', surface: '#5a3720', ink: '#e4e0cf', muted: '#cdbfa8', accent: '#9aab3c', 'accent-ink': '#472913' },
  sand: { bg: '#ddd6c6', surface: '#d2cab8', ink: '#2a2a26', muted: '#55544a', accent: '#4f6238', 'accent-ink': '#f3f0e6' },
  walnut: { bg: '#2b2216', surface: '#3d3123', ink: '#e4e2da', muted: '#cbbfae', accent: '#bda38b', 'accent-ink': '#2b2216' },
  cream: { bg: '#f6efe6', surface: '#e6d8c9', ink: '#3a1f1a', muted: '#5b4540', accent: '#8f1d37', 'accent-ink': '#ffffff' },
};

/**
 * The avatar colour choices: each is a theme's accent (the stored `colour` stays that ThemeId), named for the
 * colour you see rather than the theme it comes from, so the name read aloud matches the swatch.
 */
export const AVATAR_COLOURS: { id: ThemeId; name: string }[] = [
  { id: 'tobacco', name: 'Olive' },
  { id: 'sand', name: 'Moss' },
  { id: 'walnut', name: 'Tan' },
  { id: 'cream', name: 'Crimson' },
];
