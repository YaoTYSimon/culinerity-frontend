import { foodSafetyData, sourcesFor, type FoodSafetyContact, type FoodSafetyData } from '@culinerity/core';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import { FocusHeading } from './FocusHeading';
import { FOOD_SAFETY_INTRO, FOOD_SAFETY_TITLE, NOTHING_STORED, SECTION_SOURCES, SOURCES_INTRO, SOURCES_TITLE } from './foodSafetyCopy';

const longDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Call({ contact }: { contact: FoodSafetyContact }) {
  return (
    <li>
      <a
        href={`tel:${contact.tel}`}
        className="focus-ring motion-colors inline-flex min-h-11 flex-wrap items-center gap-x-2 rounded-3xl bg-surface px-4 py-1 text-lg font-semibold"
      >
        <span>{contact.name}</span>{' '}
        <span className="whitespace-nowrap underline underline-offset-4">{contact.display}</span>{' '}
        <span className="text-sm font-normal text-muted">{contact.hours}</span>
      </a>
    </li>
  );
}

/** A short, sourced reference. Reads a bundled dataset only: no requests, no storage, nothing about the person. */
export function FoodSafetyView({ data = foodSafetyData }: { data?: FoodSafetyData }) {
  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <FocusHeading>{FOOD_SAFETY_TITLE}</FocusHeading>
        <p className="text-base leading-7 text-pretty">{FOOD_SAFETY_INTRO}</p>
      </header>

      {data.sections.map((section) => (
        <section key={section.id} aria-labelledby={`fs-${section.id}`} className="grid gap-3">
          <h2 id={`fs-${section.id}`} className="font-display text-[24px] text-balance">{section.title}</h2>
          <ul className="grid gap-2">
            {section.lines.map((line) => (
              <li key={line.text} className="text-base leading-7 text-pretty">{line.text.replace(/ °C/g, '\u00a0°C')}</li>
            ))}
          </ul>
          {section.id === 'who' && (
            <ul className="grid justify-items-start gap-2" aria-label="Phone numbers">
              {data.contacts.map((c) => <Call key={c.id} contact={c} />)}
            </ul>
          )}
          <p className="text-sm text-pretty text-muted">
            {SECTION_SOURCES}: {sourcesFor(section.id, data).map((s) => s.title).join('; ')}.
          </p>
        </section>
      ))}

      <section aria-labelledby="fs-sources" className="grid gap-3">
        <h2 id="fs-sources" className="font-display text-[24px] text-balance">{SOURCES_TITLE}</h2>
        <Disclosure summary="Sources and dates">
          <p className="pb-2 text-sm text-pretty text-muted">{SOURCES_INTRO}</p>
          <ul className="grid gap-4">
            {data.sources.map((s) => (
              <li key={s.id} className="grid justify-items-start gap-1">
                <ExternalLink href={s.url}>{s.publisher}: {s.title}</ExternalLink>
                <p className="text-sm text-pretty text-muted">
                  {s.reviewed ? `Reviewed ${longDate(s.reviewed)}. ` : ''}Read {longDate(s.accessed)}. {s.licence}
                </p>
              </li>
            ))}
          </ul>
        </Disclosure>
        <p className="text-sm text-pretty text-muted">{NOTHING_STORED}</p>
      </section>
    </div>
  );
}
