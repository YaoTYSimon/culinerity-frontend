import { PHOTO_CREDITS } from '../assets/photos';

const link = 'underline underline-offset-2 hover:text-foreground focus-ring';

export function PhotoCredits() {
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center focus-ring">Photo credits ({PHOTO_CREDITS.length})</summary>
      <p className="mt-1">Photographs from Wikimedia Commons.</p>
      <ul className="mt-2 grid gap-2">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.itemId}>
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className={link} aria-label={`${c.title} on Wikimedia Commons (opens in a new tab)`}>{c.title}</a>
            {' by '}{c.creator}{', '}
            <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer" className={link} aria-label={`${c.licence} licence for ${c.title} (opens in a new tab)`}>{c.licence}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
