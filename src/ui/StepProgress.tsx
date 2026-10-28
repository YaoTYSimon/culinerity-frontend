interface Props {
  /** Accessible name of the bar, e.g. "Check-in progress". */
  label: string;
  /** What a step is called in the spoken value, e.g. "Question" gives "Question 2 of 9". */
  noun: string;
  step: number;
  total: number;
}

/** A slim round progress bar with "N of M", shared by the one-question-per-screen flows. */
export function StepProgress({ label, noun, step, total }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={`${noun} ${step} of ${total}`}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <p className="shrink-0 text-sm text-muted" aria-hidden="true">{step} of {total}</p>
    </div>
  );
}
