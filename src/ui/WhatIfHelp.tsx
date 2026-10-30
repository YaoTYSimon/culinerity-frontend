import { WHATIF_HELP, type HelpLine } from '@culinerity/core';
import { ExternalLink } from './ExternalLink';
import { PillButton } from './PillButton';
import { TelLink } from './SupportCard';
import { WHATIF_COPY } from './whatIfCopy';

interface Props {
  /** One sentence of the person's own swap arithmetic, or null. */
  swapsLine: string | null;
  onSeeSwaps: () => void;
  onOpenBudget: () => void;
  onOpenSupport: () => void;
  onOpenNearby: () => void;
}

const telOf = (phone: string): string => phone.replace(/\s/g, '');
const hostOf = (url: string): string => new URL(url).host;

function Contact({ line }: { line: HelpLine }) {
  return (
    <li className="grid justify-items-start gap-0.5 py-1">
      {line.phone && <p className="text-base font-semibold text-pretty">{line.label}</p>}
      {line.phone && <p className="text-base"><TelLink tel={telOf(line.phone)}>{line.phone}</TelLink>{line.hours ? `, ${line.hours}` : ''}</p>}
      <ExternalLink href={line.url}>{line.phone ? hostOf(line.url) : line.label}</ExternalLink>
    </li>
  );
}

/** Plain links to what the app can honestly offer, then the two verified contacts. Never instructions. */
export function WhatIfHelp({ swapsLine, onSeeSwaps, onOpenBudget, onOpenSupport, onOpenNearby }: Props) {
  const button = (label: string, onClick: () => void) => (
    <li><PillButton variant="text" className="-ml-3" onClick={onClick}>{label}</PillButton></li>
  );
  return (
    <ul aria-label={WHATIF_COPY.helpHeading} className="grid">
      {button('Cheaper swaps', onSeeSwaps)}
      {swapsLine && <li className="text-base text-pretty text-muted">{swapsLine}</li>}
      {button('Budget', onOpenBudget)}
      {button('Food support', onOpenSupport)}
      {button('Nearby', onOpenNearby)}
      {WHATIF_HELP.map((l) => <Contact key={l.id} line={l} />)}
    </ul>
  );
}
