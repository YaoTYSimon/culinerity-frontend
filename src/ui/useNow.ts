import { useEffect, useRef, useState } from 'react';

/** Small pad past midnight so the timer never fires a moment early. */
const PAD_MS = 50;
/** Elapsed-share maths (pace) uses time of day, so it also re-reads this often. */
const TICK_MS = 15 * 60 * 1000;

/**
 * The current time as a Date that stays fresh: it moves on at each local midnight (so a tab left open over a
 * Sunday night becomes Monday), every 15 minutes, and when the tab becomes visible again. `read` gives the ISO time.
 */
export function useNow(read: () => string): Date {
  const [now, setNow] = useState(() => new Date(read()));
  const readRef = useRef(read);
  readRef.current = read;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setNow(new Date(readRef.current()));
    const schedule = () => {
      const n = new Date(readRef.current());
      const midnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, midnight.getTime() - n.getTime() + PAD_MS);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') {
        refresh();
        clearTimeout(timer);
        schedule();
      }
    };
    schedule();
    const tick = setInterval(refresh, TICK_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}
