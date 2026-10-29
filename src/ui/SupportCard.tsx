import type { ReactNode } from 'react';
import { FOODBANK_FIND_FOOD, HELPLINES, supportFor, type Helpline, type Support, type TradeoffCategory } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import { PillButton } from './PillButton';
import {
  DEBT_HOURS, DEBT_LEAD, FIND_FOOD_LINK, FOOD_SUPPORT_BUTTON, KIDS_LEAD, KIDS_LEAD_PARENT, LIFELINE_LEAD, LIFELINE_TAIL,
  NEED_A_HAND_TITLE, SUPPORT_BODY, SUPPORT_CLOSE, SUPPORT_HEADING,
} from './tradeoffCopy';

/** Inside a sentence the link stays inline, so the lines keep their rhythm. */
const linkClass = 'focus-ring rounded-sm font-semibold text-ink underline underline-offset-4';

/** A phone number that dials when tapped. */
export function TelLink({ tel, children }: { tel: string; children: string }) {
  return <a href={`tel:${tel}`} className={linkClass}>{children}</a>;
}

const Line = ({ children }: { children: ReactNode }) => <p className="text-base leading-7 text-pretty">{children}</p>;
const call = (id: Helpline['id']) => <TelLink tel={HELPLINES[id].tel}>{HELPLINES[id].display}</TelLink>;

const debtLine = <Line>{DEBT_LEAD} {call('national-debt-helpline')} {DEBT_HOURS}</Line>;
const lifelineLine = (
  <Line>{LIFELINE_LEAD} {call('lifeline')}{LIFELINE_TAIL} <TelLink tel="000">000</TelLink>.</Line>
);

/** The help lines for a support set, in the card's order. `parent` words the Kids Helpline line for a parent. */
function HelpLines({ support: s, onOpenSupport, parent = false }: { support: Support; onOpenSupport: () => void; parent?: boolean }) {
  return (
    <>
      {s.findFood && <div><ExternalLink href={FOODBANK_FIND_FOOD}>{FIND_FOOD_LINK}</ExternalLink></div>}
      {s.foodSupportView && (
        <div><PillButton variant="text" className="-ml-3" onClick={onOpenSupport}>{FOOD_SUPPORT_BUTTON}</PillButton></div>
      )}
      {s.helplines.includes('national-debt-helpline') && debtLine}
      {s.helplines.includes('lifeline') && lifelineLine}
      {s.helplines.includes('kids-helpline') && (
        <Line>{parent ? KIDS_LEAD_PARENT : KIDS_LEAD} {call('kids-helpline')}{parent ? '' : '.'}</Line>
      )}
    </>
  );
}

const EVERYTHING: Support = {
  tier: 'food+child', findFood: true, foodSupportView: true, helplines: ['national-debt-helpline', 'lifeline', 'kids-helpline'],
};

/** Always on the view, so help is reachable without logging anything. */
export function HelpDisclosure({ onOpenSupport }: { onOpenSupport: () => void }) {
  return (
    <Disclosure summary={NEED_A_HAND_TITLE}>
      <div className="grid justify-items-start gap-2 pt-2">
        <HelpLines support={EVERYTHING} onOpenSupport={onOpenSupport} parent />
      </div>
    </Disclosure>
  );
}

/** A quiet, closable note under the status line. Not an alert or a dialog; never stored. */
export function SupportCard({ category, onOpenSupport, onClose }: { category: TradeoffCategory; onOpenSupport: () => void; onClose: () => void }) {
  if (supportFor(category).tier === 'none') return null;
  return (
    <section aria-labelledby="support-card-title" className="grid justify-items-start gap-2">
      <h2 id="support-card-title" className="font-display text-[24px]">{SUPPORT_HEADING}</h2>
      <Line>{SUPPORT_BODY}</Line>
      <HelpLines support={supportFor(category)} onOpenSupport={onOpenSupport} />
      <PillButton variant="text" className="-ml-3" onClick={onClose}>{SUPPORT_CLOSE}</PillButton>
    </section>
  );
}
