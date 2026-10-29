import { culturalSources } from '@culinerity/core';

const link = 'whitespace-nowrap underline underline-offset-2 hover:text-ink focus-ring rounded-full';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';

/** CC BY 4.0 credit for the Jewish festival dates. The link comes from the generated source record. */
export function HebcalCredit({ className = 'mt-2' }: { className?: string }) {
  const hebcal = culturalSources().find((s) => s.id === 'hebcal-api');
  if (!hebcal) return null;
  return (
    <p className={className}>
      Jewish festival dates:{' '}
      <a href={hebcal.url} target="_blank" rel="noopener noreferrer" className={link} aria-label="Hebcal.com Jewish calendar API (opens in a new tab)">Hebcal.com</a>
      {', '}
      <a href={CC_BY} target="_blank" rel="noopener noreferrer" className={link} aria-label="CC BY 4.0 licence (opens in a new tab)">CC BY 4.0</a>
      .
    </p>
  );
}
