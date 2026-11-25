import type { ReactNode } from 'react';

/** Decorative 24-grid stroke glyphs for the menu group headings: currentColor, round caps, aria-hidden. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-4 shrink-0"
    >
      {children}
    </svg>
  );
}

const Sun = () => (
  <Glyph>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </Glyph>
);

const Coin = () => (
  <Glyph>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.8 9.4c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2 2.7.8 2.7 2-1.1 2-2.7 2c-1.3 0-2.3-.5-2.8-1.4M12 6.5V8m0 8v1.5" />
  </Glyph>
);

const Pot = () => (
  <Glyph>
    <path d="M5 10h14v6.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 16.5Z" />
    <path d="M3 12.5h2M19 12.5h2M9 6.5c0-1 .8-1 .8-2M14 6.5c0-1 .8-1 .8-2" />
  </Glyph>
);

const Basket = () => (
  <Glyph>
    <path d="M4 10h16l-2 9H6zM9 10l3-6 3 6" />
  </Glyph>
);

const Leaf = () => (
  <Glyph>
    <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l7-7" />
  </Glyph>
);

const Palette = () => (
  <Glyph>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.2-1-1.5-1-2.7 0-.9.7-1.5 1.7-1.5H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.7 16.7 3.5 12 3.5Z" />
    <path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" />
  </Glyph>
);

/** One icon per menu group, keyed by the group id in `GROUPS`. */
export const GROUP_ICONS: Record<string, () => ReactNode> = {
  today: Sun,
  money: Coin,
  food: Pot,
  find: Basket,
  about: Leaf,
  colours: Palette,
};
