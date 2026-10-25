import { THEME_IDS, THEME_NAMES, type ThemeId } from '@culinerity/core';
import { useTheme } from '../theme/ThemeProvider';

/** Each dot is half ground, half accent, drawn in that theme's own colours so it reads before it is chosen. */
const SWATCH: Record<ThemeId, { bg: string; accent: string }> = {
  tobacco: { bg: '#472913', accent: '#525e1b' },
  sand: { bg: '#ddd6c6', accent: '#4f6238' },
  walnut: { bg: '#2b2216', accent: '#bda38b' },
  cream: { bg: '#f6efe6', accent: '#8f1d37' },
};

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
            <span
              aria-hidden="true"
              className={`block size-5 rounded-full border border-muted ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: `linear-gradient(135deg, ${SWATCH[id].bg} 50%, ${SWATCH[id].accent} 50%)` }}
            />
          </button>
        );
      })}
    </div>
  );
}
