import { THEME_IDS, THEME_NAMES } from '@culinerity/core';
import { THEME_TOKENS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeDots() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center">
      {THEME_IDS.map((id) => {
        const selected = id === theme;
        return (
          <button
            key={id}
            type="button"
            aria-label={THEME_NAMES[id]}
            aria-pressed={selected}
            onClick={() => setTheme(id)}
            className="focus-ring flex size-11 items-center justify-center rounded-full"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className={`block size-5 rounded-full ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
            >
              {/* Half ground, half accent, in that theme's own colours so it reads before it is chosen. */}
              <path d="M10 0A10 10 0 0 0 10 20Z" fill={THEME_TOKENS[id].bg} />
              <path d="M10 0A10 10 0 0 1 10 20Z" fill={THEME_TOKENS[id].accent} />
              <circle cx="10" cy="10" r="9.5" fill="none" strokeWidth="1" className="stroke-muted" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
