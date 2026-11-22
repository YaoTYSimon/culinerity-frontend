import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  MAP_COUNCILS, MAP_VIEWBOX, dotRadius, formatDistance, isInsideMap, panViewBox, projectPoint, viewBoxAround, zoomViewBox,
  type MapDot, type PlaceKind, type ViewBox,
} from '@culinerity/core';
import { NearbyMapsLink } from './NearbyMapsLink';
import { KIND } from './NearbyPlaceRow';
import { PillButton } from './PillButton';

interface Props {
  dots: MapDot[];
  /** The person's position, held by the page for this view only. The map keeps nothing. */
  origin: { lat: number; lng: number; label?: string };
  /** Switch to the list and move focus to this checked place's row. */
  onShowInList: (placeId: string) => void;
}

// Sizes are fractions of the window width, so a dot is the same size on screen at every zoom.
const R_CHECKED = 0.011;
const R_UNCHECKED = 0.0085;
const R_YOU = 0.014;
const R_HIT = 0.062;
const PAD = 0.18;
const ZOOM_STEP = 0.6;

// Flat tones derived from the theme roles, so all four themes work with no colour of their own.
const TONES = {
  '--map-water': 'var(--surface)',
  '--map-land': 'color-mix(in srgb, var(--ink) 20%, var(--bg))',
  '--map-core': 'color-mix(in srgb, var(--ink) 32%, var(--bg))',
} as CSSProperties;

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const KIND_PATH: Record<PlaceKind, string> = {
  market: 'M3 10l1.5-5h15L21 10v1a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0zM5 14v6h14v-6',
  grocer: 'M4 10h16l-2 9H6zM9 10l3-6 3 6',
  'social-supermarket': 'M4 10h16l-2 9H6zM9 10l3-6 3 6',
  'co-op': 'M4 10h16l-2 9H6zM9 10l3-6 3 6',
  'community-meal': 'M3 11h18a9 9 0 01-18 0zM8 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4',
  'food-relief': 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z',
};

function KindIcon({ kind }: { kind: PlaceKind }) {
  return <svg viewBox="0 0 24 24" className="size-5 shrink-0" {...ICON}><path d={KIND_PATH[kind]} /></svg>;
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <PillButton variant="surface" size="icon" aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" className="size-5" {...ICON}>{children}</svg>
    </PillButton>
  );
}

/** Greater Melbourne drawn on the device from a bundled outline: no tiles, no request to any host. */
export function NearbyMap({ dots, origin, onShowInList }: Props) {
  const youOn = isInsideMap(origin.lat, origin.lng);
  const fit = useMemo(() => viewBoxAround([...dots, ...(youOn ? [origin] : [])], PAD), [dots, origin, youOn]);
  const fitKey = `${fit.x}|${fit.y}|${fit.w}`;
  const [moved, setMoved] = useState<{ key: string; vb: ViewBox } | null>(null);
  const vb = moved && moved.key === fitKey ? moved.vb : fit;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = dots.find((d) => d.id === pickedId) ?? null;
  const drag = useRef<{ x: number; y: number; vb: ViewBox; far: boolean } | null>(null);
  const wasDrag = useRef(false);

  const councils = useMemo(
    () => MAP_COUNCILS.map((c, i) => <path key={i} d={c.d} style={{ fill: c.core ? 'var(--map-core)' : 'var(--map-land)' }} stroke="var(--bg)" strokeWidth={1} vectorEffect="non-scaling-stroke" />),
    [],
  );

  const set = (next: ViewBox) => setMoved({ key: fitKey, vb: next });
  const zoom = (f: number) => set(zoomViewBox(vb, f));
  const pan = (fx: number, fy: number) => set(panViewBox(vb, vb.w * fx, vb.h * fy));

  const onKeyDown = (e: KeyboardEvent) => {
    const step = 0.2;
    const map: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0), ArrowRight: () => pan(step, 0), ArrowUp: () => pan(0, -step), ArrowDown: () => pan(0, step),
      '+': () => zoom(ZOOM_STEP), '=': () => zoom(ZOOM_STEP), '-': () => zoom(1 / ZOOM_STEP),
    };
    const act = map[e.key];
    if (!act) return;
    e.preventDefault();
    act();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    wasDrag.current = false;
    drag.current = { x: e.clientX, y: e.clientY, vb, far: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.far && Math.hypot(dx, dy) < 5) return;
    d.far = true;
    wasDrag.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(rect.width, rect.height * (MAP_VIEWBOX.w / MAP_VIEWBOX.h)) || 1;
    const k = d.vb.w / px;
    set(panViewBox(d.vb, -dx * k, -dy * k));
  };
  const endDrag = () => { drag.current = null; };

  const checkedDots = dots.filter((d) => d.checked);
  const places = `${dots.length} ${dots.length === 1 ? 'place' : 'places'} on a map of Melbourne`;
  const you = youOn ? `. ${origin.label ? `You are here (middle of ${origin.label})` : 'You are here'}` : '';
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const you2 = youOn ? projectPoint(origin.lat, origin.lng) : null;
  const rC = dotRadius(vb, R_CHECKED);
  const rU = dotRadius(vb, R_UNCHECKED);
  const rY = dotRadius(vb, R_YOU);
  const line = dotRadius(vb, 0.003);

  return (
    <div className="grid gap-3">
      <div onKeyDown={onKeyDown} className="relative">
        <div
          className="relative mx-auto max-h-[70vh] w-full touch-pan-y overflow-hidden rounded-[2rem] select-none"
          style={{ ...TONES, aspectRatio: `${MAP_VIEWBOX.w} / ${MAP_VIEWBOX.h}`, background: 'var(--map-water)', cursor: 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <svg role="img" aria-label={places + you} viewBox={viewBox} className="absolute inset-0 size-full">
            {councils}
            {dots.filter((d) => !d.checked).map((d) => {
              const { x, y } = projectPoint(d.lat, d.lng);
              return (
                <circle
                  key={d.id} data-dot="unchecked" cx={x} cy={y} r={rU} fill="transparent" stroke="var(--ink)" strokeWidth={line} aria-hidden="true"
                  onClick={() => { if (!wasDrag.current) setPickedId(d.id); }}
                />
              );
            })}
            {picked && (() => {
              const { x, y } = projectPoint(picked.lat, picked.lng);
              return <circle data-testid="map-selected" cx={x} cy={y} r={rC * 2} fill="none" stroke="var(--ink)" strokeWidth={line * 1.5} aria-hidden="true" />;
            })()}
            {you2 && (
              <g data-testid="map-you" aria-hidden="true">
                <circle cx={you2.x} cy={you2.y} r={rY * 2} fill="none" stroke="var(--ink)" strokeWidth={line * 1.5} />
                <circle cx={you2.x} cy={you2.y} r={rY} fill="var(--accent)" stroke="var(--ink)" strokeWidth={line} />
              </g>
            )}
          </svg>
          <svg role="group" aria-label="Places checked by us" viewBox={viewBox} className="pointer-events-none absolute inset-0 size-full">
            {checkedDots.map((d) => {
              const { x, y } = projectPoint(d.lat, d.lng);
              const label = `${d.name}, ${formatDistance(d.metres)}`;
              return (
                <g
                  key={d.id} data-dot="checked" role="button" tabIndex={0} aria-label={label} aria-pressed={pickedId === d.id}
                  className="group pointer-events-auto cursor-pointer outline-none"
                  onClick={() => setPickedId(d.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setPickedId(d.id); } }}
                >
                  <circle cx={x} cy={y} r={dotRadius(vb, R_HIT)} fill="transparent" />
                  <circle cx={x} cy={y} r={rC * 2} fill="none" stroke="var(--ink)" strokeWidth={line * 1.5} className="opacity-0 group-focus-visible:opacity-100" />
                  <circle cx={x} cy={y} r={rC} fill="var(--ink)" stroke="var(--bg)" strokeWidth={line} />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="absolute right-3 bottom-3 grid gap-2">
          <MapButton label="Zoom in" onClick={() => zoom(ZOOM_STEP)}><path d="M12 5v14M5 12h14" /></MapButton>
          <MapButton label="Zoom out" onClick={() => zoom(1 / ZOOM_STEP)}><path d="M5 12h14" /></MapButton>
          <MapButton label="Whole map" onClick={() => set({ ...MAP_VIEWBOX })}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></MapButton>
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {picked && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="flex min-w-0 items-center gap-2 text-base font-semibold">
              {picked.kind ? <KindIcon kind={picked.kind} /> : <span aria-hidden="true" className="size-3 shrink-0 rounded-full border-2 border-ink" />}
              <span className="break-words">{picked.name}</span>
              <span className="sr-only">{picked.kind ? KIND[picked.kind] : 'Not checked by us'}</span>
              <span className="shrink-0 font-normal text-muted">{formatDistance(picked.metres)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <NearbyMapsLink name={picked.name} address={picked.address} />
              {picked.checked && <PillButton variant="surface" className="mt-1" onClick={() => onShowInList(picked.id)}>Show in list</PillButton>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
