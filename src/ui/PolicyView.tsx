import { useId, type ReactNode } from 'react';
import {
  areasByDisadvantage,
  StaticBenchmarkSource,
  type BenchmarkSource,
  type Indicator,
} from '@culinerity/core';
import { BarRows, type Bar } from './BarRows';
import { figureParts, POVERTY_LINE_NOTE } from './BenchmarkRows';
import { CompactRows } from './CompactRows';
import { Disclosure } from './Disclosure';
import { ExternalLink } from './ExternalLink';
import { PageHeader } from './PageHeader';
import { ScaleRows } from './ScaleRows';
import { ShareDial } from './ShareDial';

interface Props {
  now: Date;
  source?: BenchmarkSource;
}

const DEFAULT_SOURCE = new StaticBenchmarkSource();

/** Which dataset rows sit in which section, by id. Every figure itself is read from the dataset. */
const FOODBANK_HEADLINE = 'p-hunger-national';
const FOODBANK_MORE = ['p-hunger-households-count', 'p-hunger-severe-share'];
const ABS_HEADLINE = 'p-abs-national-2023';
const VICTORIA = ['p-vphs-victoria-2022', 'p-vphs-barwon-2022', 'p-foodbank-vic-monthly'];
const FOODBANK_BARS = ['p-hunger-single-parent', 'p-hunger-disability', 'p-hunger-renters', 'p-hunger-casual-trend', 'p-hunger-middle-income-trend', 'p-hunger-high-income'];
const ABS_BARS = ['p-abs-single-parent', 'p-abs-lowest-quintile'];
const STUDENTS = ['p-student-tas-2022', 'p-student-tas-2024', 'p-youth-one-in-five', 'p-student-hardship', 'p-abs-group-households', 'b-student-ua-living-costs'];
const RELIEF = ['p-relief-ever-used', 'p-relief-past-year', 'p-relief-shame', 'p-vic-food-relief-budget'];
const COST_HEADLINE = ['b-cpi-food-melbourne', 'b-cpi-food-australia'];
const COST_MORE = ['b-poverty-line-single', 'b-poverty-line-couple-2kids', 'b-jobseeker-shortfall', 'b-parenting-shortfall', 'p-poverty-jobseeker'];

const EVIDENCE_WORD = { strong: 'Strong', moderate: 'Moderate', mixed: 'Mixed', weak: 'Weak' } as const;

const longDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="font-display text-[24px]">{title}</h2>
      {children}
    </section>
  );
}

function Group({ title, caption, children }: { title: string; caption: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2">
      <h3 id={id} className="text-lg font-semibold text-balance">{title}</h3>
      <p className="text-sm text-pretty text-muted">{caption}</p>
      {children}
    </div>
  );
}

/** What the data says about food insecurity, where each figure comes from and what the evidence says helps. Read-only: no user data. */
export function PolicyView({ now, source = DEFAULT_SOURCE }: Props) {
  const sources = source.sources();
  const all = source.indicators();
  const byId = (id: string) => all.find((i) => i.id === id);
  const pick = (ids: string[]): Indicator[] => ids.flatMap((id) => byId(id) ?? []);
  const shown: Indicator[] = [];
  const compact = (ids: string[], hideFigure?: string) => {
    const list = pick(ids);
    shown.push(...list);
    return <CompactRows indicators={list} sources={sources} now={now} hideFigure={hideFigure} />;
  };
  const dial = (id: string) => {
    const i = byId(id);
    if (!i || i.value === null) return null;
    const f = figureParts(i);
    return (
      <div className="grid justify-items-start gap-1">
        <ShareDial value={i.value} text={f.main} label={`${f.main} ${f.unit}`} />
        <p className="text-base font-semibold text-pretty">{f.unit}</p>
      </div>
    );
  };
  const bars = (ids: string[]): Bar[] =>
    pick(ids).map((i) => {
      shown.push(i);
      const f = figureParts(i);
      const details = [
        ...(i.previous ? [`Earlier: ${figureParts({ ...i, value: i.previous.value, display: undefined }).main}, ${i.previous.period}.`] : []),
        ...(i.note ? [i.note] : []),
      ];
      return { id: i.id, label: i.label, value: i.value ?? 0, text: f.main, of: f.unit, details };
    });
  const barSource = (id: string) => {
    const s = sources.find((x) => x.id === byId(id)?.sourceId);
    return s ? <ExternalLink href={s.url}>{s.publisher}</ExternalLink> : null;
  };

  const areas = areasByDisadvantage(source.areas());
  const interventions = source.interventions();
  const noCosts = interventions.length > 0 && interventions.every((i) => i.costPerPersonAud === null);

  // The page body is built first so the source list can follow what was actually shown.
  const sectionHow = (
    <Section id="how-many" title="How many go without">
      <p className="text-base text-pretty">
        Food insecurity means not having enough food, or not being sure of getting it, because of money. Surveys ask different questions in different years, so these two national measures differ and are shown apart.
      </p>
      <Group
        title="Foodbank Hunger Report 2025"
        caption="An online survey of Australian households. A different question and sample from the ABS measure below, so the two cannot be compared or added."
      >
        {dial(FOODBANK_HEADLINE)}
        {compact([FOODBANK_HEADLINE, ...FOODBANK_MORE], FOODBANK_HEADLINE)}
      </Group>
      <Group
        title="Australian Bureau of Statistics, 2023"
        caption="The ABS household survey, using a 10-item food insecurity module. Different from the Foodbank measure above."
      >
        {dial(ABS_HEADLINE)}
        {compact([ABS_HEADLINE], ABS_HEADLINE)}
      </Group>
      <Group title="Victoria" caption="From the Victorian Population Health Survey, which asks whether people ran out of food and could not afford more. That is a different question from the national measures.">
        {compact(VICTORIA)}
      </Group>
    </Section>
  );

  const sectionWho = (
    <Section id="who" title="Who is most affected">
      <BarRows
        title="Foodbank Hunger Report 2025"
        caption={<>Share of each group of households that were food insecure, from Foodbank's online household survey. <br />{barSource(FOODBANK_BARS[0])}</>}
        bars={bars(FOODBANK_BARS)}
      />
      <BarRows
        title="Australian Bureau of Statistics, 2023"
        caption={<>Share of each group of households that were food insecure, from the ABS household survey with the 10-item module. Not the same question as Foodbank's. <br />{barSource(ABS_BARS[0])}</>}
        bars={bars(ABS_BARS)}
      />
    </Section>
  );

  const sectionStudents = (
    <Section id="students" title="Students and young people">
      <p className="text-sm text-pretty text-muted">Not Melbourne-specific.</p>
      {compact(STUDENTS)}
    </Section>
  );

  const sectionAreas = (
    <Section id="areas" title="Melbourne areas">
      <p className="text-sm text-pretty text-muted">
        A selection of areas across Melbourne's west, south-east and inner suburbs, for illustration. This is not a ranking of Melbourne.
      </p>
      <p className="text-sm text-pretty text-muted">
        Lower scores mean more disadvantage. The score is the ABS SEIFA Index of Relative Socio-economic Disadvantage (2021). These are ABS statistical areas (SA2), not suburbs. Decile 1 is the most disadvantaged tenth of Victoria. This measures disadvantage, not hunger.
      </p>
      <ScaleRows areas={areas} />
    </Section>
  );

  const sectionHelps = (
    <Section id="helps" title="What helps (evidence)">
      <p className="text-sm text-pretty text-muted">
        The evidence is thin: mostly one review of studies from high-income countries plus small Australian studies.
        {noCosts && ' Cost per person figures were not found for any of these.'}
      </p>
      <ul className="grid gap-4">
        {interventions.map((i) => {
          const s = sources.find((x) => x.id === i.sourceId);
          return (
            <li key={i.id} className="grid gap-1">
              <h3 className="text-lg font-semibold text-balance">{i.label}</h3>
              <p className="text-base font-semibold">Evidence: {EVIDENCE_WORD[i.evidence]}</p>
              <p className="text-base text-pretty">{i.summary}</p>
              {s && <p className="text-sm text-muted">Source: {s.publisher}</p>}
            </li>
          );
        })}
      </ul>
      <div className="grid gap-0">
        <p className="text-sm text-muted">Sources for this evidence</p>
        <div className="flex flex-wrap gap-x-4">
          {[...new Set(interventions.map((i) => i.sourceId))].flatMap((id) => sources.find((x) => x.id === id) ?? []).map((x) => (
            <ExternalLink key={x.id} href={x.url}>{x.publisher}</ExternalLink>
          ))}
        </div>
      </div>
      <h3 className="text-lg font-semibold">Food relief</h3>
      {compact(RELIEF)}
    </Section>
  );

  const sectionCost = (
    <Section id="cost" title="Cost of living">
      <p className="text-sm text-pretty text-muted">The same figures as the budget page, as their sources give them.</p>
      {compact(COST_HEADLINE)}
      <Disclosure summary="More cost figures">
        <div className="grid gap-1 pt-1">
          {compact(COST_MORE)}
          <p className="text-sm text-pretty">{POVERTY_LINE_NOTE}</p>
        </div>
      </Disclosure>
    </Section>
  );

  const usedIds = new Set([...shown.map((i) => i.sourceId), ...areas.map((a) => a.sourceId), ...interventions.map((i) => i.sourceId)]);
  const used = sources.filter((s) => usedIds.has(s.id));
  const sectionAbout = (
    <Section id="about" title="About this data">
      <h3 className="text-lg font-semibold">Sources</h3>
      <Disclosure summary={`Show all ${used.length} sources`}>
      <ul aria-label="Sources" className="grid gap-3 pt-2">
        {used.map((s) => (
          <li key={s.id} className="grid gap-0.5">
            <p className="text-base font-semibold text-pretty">{s.publisher}</p>
            <ExternalLink href={s.url}>{s.title}</ExternalLink>
            <p className="text-sm text-pretty text-muted">Published: {s.published}. Licence: {s.licence}. Accessed {longDate(s.accessed)}.</p>
          </li>
        ))}
      </ul>
      </Disclosure>
      <h3 className="text-lg font-semibold">Things to keep in mind</h3>
      <ul aria-label="Things to keep in mind" className="grid list-disc gap-2 pl-5 text-sm text-pretty">
        {source.caveats().map((c) => <li key={c}>{c}</li>)}
      </ul>
      <h3 className="text-lg font-semibold">Not found</h3>
      <p className="text-sm text-pretty text-muted">We looked and could not find these, so we show no number for them.</p>
      <ul aria-label="Not found" className="grid list-disc gap-2 pl-5 text-sm text-pretty">
        {source.notFound().map((g) => <li key={g}>{g}</li>)}
      </ul>
      <p className="text-sm text-muted">Last updated {longDate(source.updated())}</p>
      <p className="text-sm text-muted">General information, not advice. Nothing on this page uses your data.</p>
    </Section>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="grid gap-4">
        <PageHeader photo="policy-shared-meal" size={80}>
          <h1 tabIndex={-1} className="font-display text-[30px] text-balance outline-none max-[359px]:text-[26px]">What we know about food insecurity.</h1>
        </PageHeader>
        <p className="text-base text-pretty text-muted">
          Figures from published research, with where each one comes from. Different surveys measure different things, so we show them side by side, never added together.
        </p>
      </div>
      {sectionHow}
      {sectionWho}
      {sectionStudents}
      {sectionAreas}
      {sectionHelps}
      {sectionCost}
      {sectionAbout}
    </div>
  );
}
