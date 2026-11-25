import { THEMES } from '@culinerity/core';
import { THEME_TOKENS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The colour choices: one round swatch per theme (half its ground, half its accent, in its own colours so it
 * reads before it is chosen) with the name beneath. The current one is bigger and carries a check; no borders,
 * rings or shadows. Driven by the one THEMES list.
 */
export function ThemeSwatches() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-5 gap-y-1 py-1">
      {THEMES.map(({ id, name }) => {
        const selected = id === theme;
        const t = THEME_TOKENS[id];
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(id)}
            className="focus-ring motion-colors flex min-h-11 flex-col items-center gap-1 rounded-3xl px-1 py-1.5 hover:bg-bg"
          >
            <span className="grid size-12 place-items-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className={`block rounded-full motion-safe:transition-[width,height] motion-safe:duration-150 ${selected ? 'size-12' : 'size-8'}`}
              >
                <path d="M10 0A10 10 0 0 0 10 20Z" fill={t.bg} />
                <path d="M10 0A10 10 0 0 1 10 20Z" fill={t.accent} />
                {selected && (
                  <>
                    <circle cx="10" cy="10" r="5" fill={t.ink} />
                    <path d="M7.4 10.2l1.9 1.9 3.5-4" fill="none" stroke={t.bg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </span>
            <span className={`text-[13px] leading-none ${selected ? 'font-extrabold' : 'font-semibold text-muted'}`}>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
