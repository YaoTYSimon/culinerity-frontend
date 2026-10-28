import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  centroidTable, coverage, rankPlaces, rankSentence, roundOrigin, suburbCentroid,
  type LatLng, type Place, type PlaceFilter, type PlaceSourceRecord,
} from '@culinerity/core';
import { useLocationProvider } from '../location/LocationContext';
import { useServices } from '../services/ServicesContext';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import { INPUT_CLASS } from './formParts';
import { NearbyFilters } from './NearbyFilters';
import { NearbyPlaceRow } from './NearbyPlaceRow';
import { PageHeader } from './PageHeader';
import { PillButton } from './PillButton';
import type { View } from './views';

/** Held in memory for this view only: rounded to about 100 m, never stored or sent. */
type Origin = LatLng & { label?: string };
type Phase = { kind: 'idle' } | { kind: 'locating' } | { kind: 'failed'; reason: 'denied' | 'unavailable' | 'timeout' };

const PAGE = 12;
const NEAR_M = 10_000;
const FAR_M = 50_000;
const FALLBACK_COUNT = 5;

const MESSAGE = {
  denied: 'Location is off for this site. You can type a suburb instead, or turn it on in your browser settings.',
  unavailable: "We couldn't work out where you are. Type a suburb instead.",
  timeout: 'That took too long. Try again, or type a suburb.',
} as const;

/** A polite live region that mounts empty and is filled after mount, so the first result is announced. */
function LiveCount({ text }: { text: string }) {
  const [said, setSaid] = useState('');
  useEffect(() => { setSaid(text); }, [text]);
  return <div aria-live="polite" className="text-base font-semibold">{said}</div>;
}

const plural = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

interface Props {
  score?: number;
  profileSuburb?: string;
  /** When given, the view links to Food support (Nearby itself never decides where "elsewhere" is). */
  onNavigate?: (view: View) => void;
}

export function Nearby({ score, profileSuburb, onNavigate }: Props) {
  const { places: source } = useServices();
  const provider = useLocationProvider();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [sources, setSources] = useState<PlaceSourceRecord[]>([]);
  const [used, setUsed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [typed, setTyped] = useState(profileSuburb ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const token = useRef(0);
  const busy = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const locateButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    setLoadFailed(false);
    Promise.all([source.list(), source.sources()]).then(
      ([p, s]) => { if (live) { setPlaces(p); setSources(s); } },
      () => { if (live) setLoadFailed(true); },
    );
    return () => { live = false; };
  }, [source, attempt]);

  // Leaving the view drops the position and any answer still on its way.
  useEffect(() => () => { token.current += 1; }, []);

  useEffect(() => {
    if (phase.kind === 'failed' && phase.reason === 'denied') field.current?.focus();
  }, [phase]);

  const cancel = useCallback(() => {
    token.current += 1;
    busy.current = false;
  }, []);

  const locate = async () => {
    if (busy.current) return;
    busy.current = true;
    const mine = ++token.current;
    setPhase({ kind: 'locating' });
    const result = await provider.locate().catch(() => ({ ok: false, reason: 'unavailable' }) as const);
    if (mine !== token.current) return;
    busy.current = false;
    if (result.ok) {
      setOrigin(roundOrigin(result));
      setPhase({ kind: 'idle' });
      setSuggestions([]);
      setNoMatch(false);
      setShown(PAGE);
    } else {
      setPhase({ kind: 'failed', reason: result.reason });
    }
  };

  const useText = (text: string) => {
    cancel();
    setUsed(true);
    setPhase({ kind: 'idle' });
    const found = suburbCentroid(text);
    setSuggestions(found.kind === 'suggest' ? found.options : []);
    setNoMatch(found.kind === 'none');
    if (found.kind === 'match') {
      setOrigin({ lat: found.lat, lng: found.lng, label: found.label });
      setShown(PAGE);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    useText(typed);
  };
  const clear = () => {
    cancel();
    setOrigin(null);
    setTyped('');
    setSuggestions([]);
    setNoMatch(false);
    setPhase({ kind: 'idle' });
    queueMicrotask(() => locateButton.current?.focus());
  };

  const view = useMemo(() => {
    if (!origin || !places) return null;
    const ranked = rankPlaces(places, origin, score, filter);
    if (ranked.length === 0) return { rows: [], note: 'Nothing matches that filter nearby. Try All.', paged: false };
    if (ranked.some((r) => r.metres < NEAR_M)) return { rows: ranked, note: '', paged: true };
    const closest = [...ranked].sort((a, b) => a.metres - b.metres).slice(0, FALLBACK_COUNT);
    const far = closest[0].metres > FAR_M;
    return { rows: closest, note: `Nothing in our list within 10 km.${far ? ' Our starter list covers Melbourne for now.' : ''}`, paged: false };
  }, [origin, places, score, filter]);

  const stats = useMemo(() => (places ? coverage(places) : null), [places]);

  const rows = view?.rows ?? [];
  const visible = view?.paged ? rows.slice(0, shown) : rows;
  const locating = phase.kind === 'locating';
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <section aria-labelledby="nearby-h" className="grid gap-5">
      <PageHeader photo="nearby-market">
        <h1 id="nearby-h" tabIndex={-1} className="font-display text-[30px] leading-tight font-bold text-balance outline-none">Close to you.</h1>
        <p className="text-base text-pretty text-muted">Your location stays on this device. It is not saved or sent anywhere.</p>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <PillButton ref={locateButton} aria-disabled={locating} onClick={locate}>Use my location</PillButton>
        {locating && <PillButton variant="surface" onClick={() => { cancel(); setPhase({ kind: 'idle' }); locateButton.current?.focus(); }}>Cancel</PillButton>}
        {origin && <PillButton variant="text" onClick={clear}>Clear my location</PillButton>}
      </div>

      <div aria-live="polite" className="empty:hidden grid justify-items-start gap-3 text-base font-semibold text-pretty">
        {locating && <p>Finding you…</p>}
        {phase.kind === 'failed' && (
          <>
            <p>{MESSAGE[phase.reason]}{phase.reason === 'unavailable' && offline ? ' You also look to be offline; the list still works.' : ''}</p>
            {phase.reason === 'timeout' && <PillButton variant="surface" onClick={locate}>Try again</PillButton>}
          </>
        )}
      </div>

      <form onSubmit={onSubmit} className="grid gap-2">
        <label htmlFor="nearby-suburb" className="text-sm font-semibold text-muted">Type a suburb or postcode</label>
        <div className="flex gap-2">
          <input
            id="nearby-suburb"
            ref={field}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={INPUT_CLASS}
          />
          <PillButton type="submit" variant="surface" className="shrink-0">Use this suburb</PillButton>
        </div>
        {typed !== '' && typed === profileSuburb && !used && (
          <p className="text-sm text-muted">Press Use this suburb to see places near it.</p>
        )}
        <div aria-live="polite" className="empty:hidden grid gap-2 text-base text-pretty">
          {noMatch && <p className="font-semibold">We don't have that suburb yet. Try one nearby.</p>}
          {suggestions.length > 0 && (
            <>
              <p className="font-semibold">Did you mean</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <PillButton key={s} variant="surface" onClick={() => { setTyped(s); useText(s); }}>{s}</PillButton>
                ))}
              </div>
            </>
          )}
        </div>
      </form>

      {places === null && !loadFailed && <p role="status" className="text-base text-muted">Loading places…</p>}
      {loadFailed && (
        <div role="alert" className="grid justify-items-start gap-3">
          <p className="text-base font-semibold text-pretty">We can't load the list just now. Please try again.</p>
          <PillButton onClick={() => setAttempt((n) => n + 1)}>Try again</PillButton>
        </div>
      )}

      {places && !origin && (
        <p className="text-base text-pretty">Press Use my location, or type a suburb or postcode, to see places close to you.</p>
      )}

      {places && origin && (
        <div className="grid gap-4">
          <NearbyFilters value={filter} onChange={(v) => { setFilter(v); setShown(PAGE); }} />
          <LiveCount text={plural(rows.length)} />
          {origin.label && <p className="text-sm text-muted">from the middle of {origin.label}</p>}
          {view?.note && <p className="text-base font-semibold text-pretty">{view.note}</p>}
          {rows.length > 0 && (
            <>
              <p className="text-sm text-pretty">{rankSentence(score)}</p>
              <ul aria-label="Places near you" className="grid gap-10">
                {visible.map((r) => <NearbyPlaceRow key={r.place.id} item={r} />)}
              </ul>
              {view?.paged && visible.length < rows.length && (
                <PillButton variant="surface" onClick={() => setShown((n) => n + PAGE)} className="justify-self-start">Show more</PillButton>
              )}
              <p className="text-sm text-muted">Straight-line distance, not walking time. Price bands are typical for this kind of place.</p>
            </>
          )}
        </div>
      )}

      {stats && stats.count > 0 && (
        <Disclosure summary="About this list">
          <p className="pb-2 text-sm text-pretty text-muted">
            A starter list of {stats.count} places we could check, in {stats.suburbs.join(', ')}. It is not every place.
          </p>
        </Disclosure>
      )}

      <div className="grid gap-1">
        <ExternalLink href="https://findfood.foodbank.org.au/?state=vic">More help from Foodbank</ExternalLink>
        {onNavigate && (
          <PillButton variant="text" onClick={() => onNavigate('support')} className="-ml-3 justify-self-start">Free food and meals</PillButton>
        )}
      </div>

      <Disclosure summary="Where this comes from">
        <ul className="grid gap-3 pb-2 text-sm text-pretty text-muted">
          {sources.map((s) => (
            <li key={s.id}>
              <span className="font-semibold text-ink">{s.publisher}</span>, checked {s.accessed}. <span>{s.licence}</span>
            </li>
          ))}
          <li>
            <span className="font-semibold text-ink">{centroidTable.source.publisher}</span> (suburb and postcode positions), checked {centroidTable.source.accessed}. <span>{centroidTable.source.licence}</span>
          </li>
        </ul>
      </Disclosure>
    </section>
  );
}
