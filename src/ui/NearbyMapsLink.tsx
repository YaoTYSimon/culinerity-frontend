import { PinGlyph } from './placeIcons';

const mapsUrl = (name: string, address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

/** The Maps link names the place only, never the person. `compact` is a round icon button (the name is still spoken). */
export function NearbyMapsLink({ name, address, compact = false }: { name: string; address: string; compact?: boolean }) {
  return (
    <a
      href={mapsUrl(name, address)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${name} in Maps`}
      className={
        compact
          ? 'focus-ring motion-colors inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink'
          : 'focus-ring motion-colors mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-6 text-center font-semibold text-ink'
      }
    >
      {compact ? <PinGlyph /> : 'Open in Maps'}
    </a>
  );
}
