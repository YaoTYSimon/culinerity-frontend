import type { ThemeId } from '@culinerity/core';
import { THEME_TOKENS } from '../theme/tokens';

interface Props {
  /** The person's name; the circle shows its first letter. */
  name?: string;
  /** Overrides the letter taken from `name`. */
  letter?: string;
  /** The account's colour: that theme's accent fills the circle, its accent-ink draws the letter. */
  colour: ThemeId;
  /** Diameter in px. */
  size: number;
  className?: string;
}

const firstLetter = (s: string): string => [...s.trim()][0]?.toUpperCase() ?? '?';

/** A flat coloured circle with one letter. Decorative: the name is always written in text beside it. */
export function Avatar({ name = '', letter, colour, size, className = '' }: Props) {
  const t = THEME_TOKENS[colour];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: t.accent,
        color: t['accent-ink'],
        fontSize: Math.round(size * 0.44),
        lineHeight: 1,
      }}
    >
      {letter ? firstLetter(letter) : firstLetter(name)}
    </span>
  );
}
