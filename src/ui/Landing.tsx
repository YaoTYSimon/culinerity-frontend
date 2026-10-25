interface Props {
  onStart: () => void;
  onDismiss: () => void;
}

const btn =
  'min-h-11 rounded px-2.5 text-sm md:px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-safe:transition-colors motion-safe:duration-150';

/** The one gentle, optional, dismissible prompt. A slim panel, never a gate. */
export function Landing({ onStart, onDismiss }: Props) {
  return (
    <section
      aria-labelledby="checkin-h"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-card bg-card p-2 pl-4 md:grid md:justify-normal md:gap-3 md:p-4"
    >
      <h2 id="checkin-h" className="text-sm font-semibold">Optional check-in</h2>
      <p className="hidden text-sm text-pretty text-muted-foreground md:block">
        A few questions about food and money in the last month, so swaps and support suit you. It stays on this device.
      </p>
      <div className="flex gap-1 md:gap-2">
        <button type="button" onClick={onStart} className={`${btn} bg-primary text-primary-foreground hover:opacity-90`}>
          Take the check-in
        </button>
        <button type="button" onClick={onDismiss} className={`${btn} text-foreground hover:bg-muted`}>
          Not now
        </button>
      </div>
    </section>
  );
}
