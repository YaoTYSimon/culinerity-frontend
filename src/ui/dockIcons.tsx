import type { ReactNode } from 'react';

/** Hand-drawn 24px stroke icons with round caps, drawn in currentColor so every theme works. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export const HomeIcon = () => (
  <Icon>
    <path d="M3.5 11.2 12 4l8.5 7.2" />
    <path d="M5.5 10v8.2a1.8 1.8 0 0 0 1.8 1.8h9.4a1.8 1.8 0 0 0 1.8-1.8V10" />
    <path d="M10 20v-5.2a2 2 0 0 1 4 0V20" />
  </Icon>
);

export const NearbyIcon = () => (
  <Icon>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const BudgetIcon = () => (
  <Icon>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17Z" />
    <path d="M4 8.5C4 7.1 5.1 6 6.5 6H16" />
    <path d="M20 11.5h-3.2a2 2 0 0 0 0 4H20" />
    <circle cx="17" cy="13.5" r=".4" />
  </Icon>
);

export const CookIcon = () => (
  <Icon>
    <path d="M5 11h14v5.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 16.5Z" />
    <path d="M5 13.5H3M19 13.5h2" />
    <path d="M9 7.5c-.8-1 .8-1.8 0-2.8M13 7.5c-.8-1 .8-1.8 0-2.8" />
  </Icon>
);
