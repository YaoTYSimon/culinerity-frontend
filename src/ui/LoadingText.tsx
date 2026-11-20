/** Plain-text Suspense fallback while a view's code chunk loads (plate design: no card, chip or shadow). */
export function LoadingText() {
  return (
    <p role="status" data-lazy-fallback className="text-base text-muted">
      Loading…
    </p>
  );
}
