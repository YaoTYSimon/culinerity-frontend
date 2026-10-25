import { useEffect, useState } from 'react';
import type { SupportPlace } from '@culinerity/core';
import { useServices } from '../services/ServicesContext';

const KIND_LABEL: Record<SupportPlace['kind'], string> = {
  pantry: 'Food pantry',
  'community-fridge': 'Community fridge',
  meal: 'Free meal',
};

export function SupportPanel({ suburb }: { suburb?: string }) {
  const { support } = useServices();
  const [places, setPlaces] = useState<SupportPlace[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    setPlaces(null);
    support.findSupport(suburb).then(
      (p) => { if (live) setPlaces(p); },
      () => { if (live) { setPlaces(null); setFailed(true); } },
    );
    return () => { live = false; };
  }, [support, suburb]);

  return (
    <section aria-labelledby="support-h" className="grid gap-3 rounded-card bg-card p-4 text-card-foreground">
      <h2 id="support-h" className="text-base font-semibold text-balance">Free food support near you</h2>
      <p className="text-sm text-pretty text-muted-foreground">
        Anyone can use these. You do not need to prove anything, and there is no shame in asking.
      </p>
      {failed && <p role="alert" className="text-sm">We could not load the list just now. Please try again later.</p>}
      {!failed && places === null && <p role="status" className="text-sm text-muted-foreground">Loading places...</p>}
      {places && (
        <ul className="grid gap-3">
          {places.map((p) => (
            <li key={p.id} className="grid gap-1 rounded bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{p.name}</h3>
                {p.isSample && (
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground">Sample data</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{KIND_LABEL[p.kind]} in {p.suburb}</p>
              <p className="text-sm text-pretty">{p.notes}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm font-medium">Culinerity is not medical advice.</p>
    </section>
  );
}
