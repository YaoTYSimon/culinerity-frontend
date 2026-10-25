import { useCallback, useEffect, useState } from 'react';
import type { SupportPlace } from '@culinerity/core';
import { photoUrl } from '../assets/photos';
import { useServices } from '../services/ServicesContext';
import { PillButton } from './PillButton';
import { RoundPhoto } from './RoundPhoto';

const directionsUrl = (p: SupportPlace) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.suburb)}`;

function Skeleton() {
  return (
    <div role="status" className="grid gap-6">
      <p className="sr-only">Loading places…</p>
      <div aria-hidden="true" className="grid gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2 motion-safe:animate-pulse">
            <span className="h-4 w-3/5 rounded-full bg-surface" />
            <span className="h-3 w-2/5 rounded-full bg-surface" />
            <span className="h-3 w-4/5 rounded-full bg-surface" />
            <span className="mt-1 h-11 w-32 rounded-full bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportPanel({ suburb }: { suburb?: string }) {
  const { support } = useServices();
  const [places, setPlaces] = useState<SupportPlace[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setFailed(false);
    setPlaces(null);
    support.findSupport(suburb).then(
      (p) => { if (live) setPlaces(p); },
      () => { if (live) { setPlaces(null); setFailed(true); } },
    );
    return () => { live = false; };
  }, [support, suburb, attempt]);

  return (
    <section aria-labelledby="support-h" className="grid gap-5">
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-3">
          <h1 id="support-h" tabIndex={-1} className="font-display text-[30px] leading-tight font-bold text-balance outline-none">Free food near you.</h1>
          <p className="text-base text-pretty text-muted">Call ahead to check times.</p>
        </div>
        <RoundPhoto src={photoUrl('welcome-pancakes')} size={132} eager className="mt-1" />
      </div>

      {failed && (
        <div role="alert" className="grid justify-items-start gap-3">
          <p className="text-base font-semibold text-pretty">We can't load the list just now. Please try again.</p>
          <PillButton onClick={retry}>Try again</PillButton>
        </div>
      )}
      {!failed && places === null && <Skeleton />}
      {places && (
        <ul className="grid gap-6">
          {places.map((p) => (
            <li key={p.id} className="grid justify-items-start gap-1">
              <h2 className="text-base font-semibold">{p.name}</h2>
              <p className="text-sm text-muted">{p.suburb}</p>
              <p className="text-sm text-pretty">{p.notes}</p>
              <a
                href={directionsUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Directions to ${p.name}`}
                className="focus-ring motion-colors mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-6 text-center font-semibold text-ink"
              >
                Directions
              </a>
            </li>
          ))}
        </ul>
      )}
      {places && places.some((p) => p.isSample) && <p className="text-xs text-muted">Sample data</p>}
    </section>
  );
}
