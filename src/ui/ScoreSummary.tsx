import { scoreBand, type ScoreBand } from '../domain/scoring/score';

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
    <section aria-labelledby="score-h" className="@container rounded-lg bg-hero p-4 text-hero-foreground">
      <h2 id="score-h" className="sr-only">Your food security score</h2>
      <div className="grid items-center gap-4 @sm:grid-cols-[auto_1fr]">
        <svg viewBox="0 0 120 120" className="size-28 justify-self-center" role="img" aria-label={`Score ${score} out of 100, ${band}`}>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-hero-lo" />
          <circle
            cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)} transform="rotate(-90 60 60)"
            className="stroke-highlight"
          />
          <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="700" className="fill-hero-foreground">{score}</text>
        </svg>
        <div className="grid gap-1">
          <p className="font-display text-2xl">{band}</p>
          <p className="text-sm text-pretty text-hero-muted">{BAND_TEXT[band]}</p>
          <p className="text-xs text-hero-muted">100 = secure, 0 = critical{date ? ` · taken ${date}` : ''}</p>
        </div>
      </div>
    </section>
  );
}
