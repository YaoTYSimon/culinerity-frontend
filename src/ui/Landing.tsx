interface Props {
  onStart: () => void;
  onDismiss: () => void;
}

const btn =
  'min-h-11 rounded-md px-5 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Welcome and the one gentle, optional, dismissible prompt. Never blocks the app. */
export function Landing({ onStart, onDismiss }: Props) {
  return (
    <section aria-labelledby="landing-h" className="@container grid gap-5 rounded-lg bg-linear-to-br from-hero-hi to-hero-lo p-5 text-hero-foreground">
      <div className="grid gap-3">
        <h1 id="landing-h" className="font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-tight text-balance">
          Eat well in Melbourne, whatever your week looks like
        </h1>
        <p className="text-pretty text-hero-muted">
          Tell us what you are craving and we will suggest tasty swaps that fit your budget. For anyone in Melbourne, with no sign-up.
        </p>
      </div>
      <section aria-labelledby="checkin-h" className="grid gap-3 rounded-md bg-hero/60 p-4">
        <h2 id="checkin-h" className="font-semibold">Optional check-in</h2>
        <p className="text-sm text-pretty text-hero-muted">
          A few questions about food and money in the last month, so the swaps and support suit you. It stays on this device, and you can skip it.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onStart} className={`${btn} bg-highlight text-highlight-foreground`}>
            Take the check-in
          </button>
          <button type="button" onClick={onDismiss} className={`${btn} border border-hero-muted text-hero-foreground`}>
            Not now
          </button>
        </div>
      </section>
    </section>
  );
}
