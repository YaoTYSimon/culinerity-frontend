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
 * The single TypeScript source of the theme colours, used by ThemeSwatches. src/index.css and the no-flash script
 * in index.html must hold the same values; src/theme/tokens.test.ts fails when they drift.
 */
export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  // Accent lightened from the dealt #525e1b (1.87:1 on bg) so the primary button reads on the ground.
  tobacco: { bg: '#472913', surface: '#5a3720', ink: '#e4e0cf', muted: '#cdbfa8', accent: '#9aab3c', 'accent-ink': '#472913' },
  sand: { bg: '#ddd6c6', surface: '#d2cab8', ink: '#2a2a26', muted: '#55544a', accent: '#4f6238', 'accent-ink': '#f3f0e6' },
  walnut: { bg: '#2b2216', surface: '#3d3123', ink: '#e4e2da', muted: '#cbbfae', accent: '#bda38b', 'accent-ink': '#2b2216' },
  cream: { bg: '#f6efe6', surface: '#e6d8c9', ink: '#3a1f1a', muted: '#5b4540', accent: '#8f1d37', 'accent-ink': '#ffffff' },
  // Cool dark navy with a soft sky accent.
  ink: { bg: '#14202e', surface: '#1f3045', ink: '#e3e9f0', muted: '#b4c2d3', accent: '#7fb5e6', 'accent-ink': '#14202e' },
  // Soft light green with a deep leaf accent.
  sage: { bg: '#e3eadb', surface: '#d3ddc8', ink: '#1f2a1f', muted: '#4a5a45', accent: '#3b6b3e', 'accent-ink': '#f4f8ee' },
  // Warm dark terracotta.
  clay: { bg: '#3a1f18', surface: '#4e2c22', ink: '#f1e3d8', muted: '#d9bfae', accent: '#e0875f', 'accent-ink': '#3a1f18' },
  // Light peach with a burnt-orange accent.
  sunrise: { bg: '#fbe6d6', surface: '#f3d3bc', ink: '#3b2214', muted: '#6a4a38', accent: '#b0431a', 'accent-ink': '#ffffff' },
  // High contrast: black, white and a yellow accent.
  mono: { bg: '#000000', surface: '#1c1c1c', ink: '#ffffff', muted: '#d4d4d4', accent: '#ffd60a', 'accent-ink': '#000000' },
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
