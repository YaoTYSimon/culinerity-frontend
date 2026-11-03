const mapsUrl = (name: string, address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

/** The Maps link names the place only, never the person. */
export function NearbyMapsLink({ name, address }: { name: string; address: string }) {
  return (
    <a
      href={mapsUrl(name, address)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${name} in Maps`}
      className="focus-ring motion-colors mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-6 text-center font-semibold text-ink"
    >
      Open in Maps
    </a>
  );
}
