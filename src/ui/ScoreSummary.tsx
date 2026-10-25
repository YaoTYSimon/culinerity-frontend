import { scoreBand, type ScoreBand } from '@culinerity/core';

const BAND_TEXT: Record<ScoreBand, string> = {
  Critical: 'Things look very tight. Support is below, and the swaps lean cheap.',
  Struggling: 'Things look tight. Support is below, and the swaps lean cheap.',
  Strained: 'Some pressure. Swaps balance cost and nutrition.',
  Steady: 'Mostly steady. Swaps lean towards nutrition.',
  Secure: 'Looking secure. Swaps lean towards nutrition.',
};

const R = 52;
const CIRC = 2 * Math.PI * R;

export function ScoreSummary({ score, takenAt }: { score: number; takenAt?: string }) {
  const band = scoreBand(score);
  const date = takenAt && !Number.isNaN(Date.parse(takenAt)) ? new Date(takenAt).toLocaleDateString('en-AU') : null;
  return (
    <section aria-labelledby="score-h" className="rounded-card bg-card p-4">
      <h2 id="score-h" className="mb-3 text-sm font-semibold">Your food security score</h2>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="size-20 shrink-0" role="img" aria-label={`Score ${score} out of 100, ${band}`}>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
          {score > 0 && (
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)} transform="rotate(-90 60 60)"
              className="stroke-primary"
            />
          )}
          <text x="60" y="71" className="fill-foreground text-[34px] [text-anchor:middle]">{score}</text>
        </svg>
        <div className="grid min-w-0 gap-1">
          <p className="text-base font-semibold">{band}</p>
          <p className="text-sm text-pretty text-muted-foreground">{BAND_TEXT[band]}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">100 = secure, 0 = critical{date ? ` · taken ${date}` : ''}</p>
    </section>
  );
}
