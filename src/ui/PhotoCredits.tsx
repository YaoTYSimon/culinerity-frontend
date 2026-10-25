import { PHOTO_CREDITS } from '../assets/photos';

const link = 'underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PhotoCredits() {
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Photo credits</summary>
      <p className="mt-1">Photographs from Wikimedia Commons.</p>
      <ul className="mt-2 grid gap-2">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.itemId}>
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>{c.title}</a>
            {' by '}{c.creator}{', '}
            <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer" className={link}>{c.licence}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
