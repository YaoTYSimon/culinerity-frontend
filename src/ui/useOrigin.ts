import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { roundOrigin, suburbCentroid, type LatLng } from '@culinerity/core';
import { useLocationProvider } from '../location/LocationContext';

/** Held in memory for the view that asked: rounded to about 100 m, never stored or sent. */
export type Origin = LatLng & { label?: string };
export type LocatePhase = { kind: 'idle' } | { kind: 'locating' } | { kind: 'failed'; reason: 'denied' | 'unavailable' | 'timeout' };

/**
 * The person's chosen position: from the device (asked once, when they press the button) or from a typed suburb or postcode.
 * Shared by Nearby and "Where to get it". Leaving the view drops the position and any answer still on its way.
 */
export function useOrigin(profileSuburb?: string) {
  const provider = useLocationProvider();
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [phase, setPhase] = useState<LocatePhase>({ kind: 'idle' });
  const [typed, setTyped] = useState(profileSuburb ?? '');
  const [used, setUsed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const token = useRef(0);
  const busy = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const locateButton = useRef<HTMLButtonElement>(null);

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
    if (found.kind === 'match') setOrigin({ lat: found.lat, lng: found.lng, label: found.label });
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
  const stopLocating = () => {
    cancel();
    setPhase({ kind: 'idle' });
    locateButton.current?.focus();
  };

  return { origin, phase, typed, setTyped, used, suggestions, noMatch, field, locateButton, locate, useText, onSubmit, clear, stopLocating };
}

export type OriginState = ReturnType<typeof useOrigin>;
