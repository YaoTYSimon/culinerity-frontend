import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { areasByDisadvantage, StaticBenchmarkSource, verificationLabel, type BenchmarkSource } from '@culinerity/core';
import { PolicyView } from './PolicyView';

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const src = new StaticBenchmarkSource();
const show = () => render(<PolicyView now={NOW} />);
const section = (name: string) => screen.getByRole('region', { name });

const SECTIONS = [
  'How many go without',
  'Who is most affected',
  'Students and young people',
  'Melbourne areas',
  'What helps (evidence)',
  'Cost of living',
  'About this data',
];

describe('PolicyView', () => {
  it('has one decorative round photo beside the heading, with its size set', () => {
    const { container } = show();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '80');
    expect(img).toHaveAttribute('height', '80');
    expect(img.getAttribute('src')).toMatch(/policy-shared-meal/);
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('has one h1 and an intro sentence', () => {
    show();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'What we know about food insecurity.' })).toBeInTheDocument();
    expect(screen.getByText(/never added together/)).toBeInTheDocument();
  });

  it('has every section heading, in order, and no heading level is skipped', () => {
    show();
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual(SECTIONS);
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]));
    levels.forEach((l, i) => expect(l - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1));
  });

  it('shows the two national measures in separate captioned groups, never together', () => {
    show();
    const foodbank = src.indicators('policy').find((i) => i.id === 'p-hunger-national')!;
    const abs = src.indicators('policy').find((i) => i.id === 'p-abs-national-2023')!;
    const fg = within(section('How many go without')).getByRole('group', { name: /Foodbank/ });
    const ag = within(section('How many go without')).getByRole('group', { name: /ABS|Australian Bureau/ });
    expect(fg).not.toBe(ag);
    expect(fg).toHaveTextContent(foodbank.label);
    expect(fg).not.toHaveTextContent(abs.label);
    expect(ag).toHaveTextContent(abs.label);
    expect(ag).not.toHaveTextContent(foodbank.label);
    expect(within(fg).getByRole('img', { name: /33%/ })).toBeInTheDocument();
    expect(within(ag).getByRole('img', { name: /13\.2%/ })).toBeInTheDocument();
    expect(fg).toHaveTextContent(/different/i);
  });

  it('states the measure of the Victorian rows', () => {
    show();
    const s = section('How many go without');
    const vic = src.indicators('policy').find((i) => i.id === 'p-vphs-victoria-2022')!;
    expect(s).toHaveTextContent(vic.label);
    expect(s).toHaveTextContent(vic.measure ?? vic.label);
    expect(s).toHaveTextContent('Earlier: 4%, 2020');
  });

  it('never shows a combined or summed figure, and every figure shown is a raw dataset number', () => {
    const { container } = show();
    expect(container.textContent).not.toMatch(/46\.2|39\.2|19\.8/);
    // Formatted here from the research JSON itself, independently of the app's own formatting.
    const raw = JSON.parse(readFileSync(resolve(__dirname, '../../docs/superpowers/research/2026-10-26-food-security-data.json'), 'utf8'));
    const commas = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const written = (v: number, decimals = 0) => {
      const [whole, frac = ''] = String(v).split('.');
      return commas(whole) + (decimals || frac ? '.' + frac.padEnd(decimals, '0') : '');
    };
    const allowed = new Set<string>();
    for (const i of raw.indicators) {
      if (i.display) allowed.add(i.display);
      else if (i.unit.startsWith('AUD')) allowed.add('$' + written(i.value, i.decimals));
      else if (i.unit.startsWith('%')) allowed.add(written(i.value, i.decimals) + '%');
      else allowed.add(written(i.value, i.decimals));
    }
    for (const a of raw.areas) allowed.add(commas(String(Math.round(a.seifaIrsdScore))));
    const shown = [...container.querySelectorAll('[data-figure]')].map((e) => e.querySelector('span')?.textContent ?? '');
    expect(shown.length).toBeGreaterThan(25);
    for (const t of shown) expect(allowed.has(t), t).toBe(true);
    expect(shown).toContain('34.0%');
    expect(shown).toContain('3.0%');
  });

  it('draws bars in two separate groups, each with its source and a text alternative per bar', () => {
    show();
    const s = section('Who is most affected');
    const groups = within(s).getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveTextContent(/Foodbank/);
    expect(groups[1]).toHaveTextContent(/ABS|Australian Bureau/);
    expect(groups[0]).not.toHaveTextContent('lone-parent');
    for (const g of groups) {
      const bars = within(g).getAllByRole('img');
      expect(bars.length).toBeGreaterThan(1);
      bars.forEach((b) => expect(b.getAttribute('aria-label')).toMatch(/\d/));
      expect(within(g).getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(within(groups[0]).getByRole('img', { name: '68% of single-parent households' })).toBeInTheDocument();
    expect(within(groups[1]).getByRole('img', { name: '34.0% of lone-parent families with dependent children' })).toBeInTheDocument();
  });

  it('shows press-only rows only in the Students section, with the label', () => {
    const { container } = show();
    const press = src.indicators().filter((i) => i.verification === 'press');
    expect(press.length).toBeGreaterThan(0);
    const students = section('Students and young people');
    expect(students).toHaveTextContent('Not Melbourne-specific');
    for (const p of press) {
      expect(students).toHaveTextContent(p.label);
      for (const name of SECTIONS.filter((n) => n !== 'Students and young people' && n !== 'About this data')) {
        expect(section(name)).not.toHaveTextContent(p.label);
      }
    }
    expect(within(students).getAllByText(verificationLabel('press')).length).toBe(press.length);
    expect(container.textContent).not.toMatch(/whole day/i);
    expect(students).toHaveTextContent('Reported in a republished article');
  });

  it('lists areas by score ascending, whole numbers, with the scale and no council names', () => {
    show();
    const s = section('Melbourne areas');
    const areas = areasByDisadvantage(src.areas());
    const items = within(s).getAllByRole('listitem');
    expect(items).toHaveLength(areas.length);
    areas.forEach((a, i) => {
      expect(items[i]).toHaveTextContent(a.name);
      expect(items[i]).toHaveTextContent(Math.round(a.seifaIrsdScore).toLocaleString('en-AU'));
      expect(items[i].textContent).not.toMatch(/\d\.\d/);
      expect(items[i]).toHaveTextContent(`decile ${a.seifaDecileVic}`);
    });
    expect(s).toHaveTextContent('Australian average');
    expect(s).toHaveTextContent('700');
    expect(s).toHaveTextContent('1,200');
    expect(s).toHaveTextContent('1,000');
    expect(s).toHaveTextContent(/not a ranking of Melbourne/);
    expect(s).toHaveTextContent('Lower scores mean more disadvantage');
    expect(s).toHaveTextContent('This measures disadvantage, not hunger.');
    expect(s.textContent).not.toMatch(/\blga\b|council area/i);
    expect(within(s).getAllByRole('img').length).toBe(areas.length);
  });

  it('shows each intervention with an evidence word, summary and source, and the cost note', () => {
    show();
    const s = section('What helps (evidence)');
    for (const i of src.interventions()) {
      expect(s).toHaveTextContent(i.label);
      expect(s).toHaveTextContent(i.summary);
      expect(s).toHaveTextContent(new RegExp(`Evidence: ${i.evidence}`, 'i'));
    }
    expect(s).toHaveTextContent(/cost per person/i);
    expect(s).toHaveTextContent(/not found/i);
    expect(s).toHaveTextContent('$18,000,000');
  });

  it('shares the cost of living rows with the budget view', () => {
    show();
    const s = section('Cost of living');
    expect(s).toHaveTextContent(src.indicators('budget').find((i) => i.id === 'b-cpi-food-melbourne')!.label);
    expect(s).toHaveTextContent('These are lines for total income, not food budgets.');
  });

  it('lists only the sources used by shown rows, with safe links, licence and accessed date', () => {
    const base = new StaticBenchmarkSource();
    const extra = { id: 'unused-fixture', publisher: 'Nobody Publishing', title: 'A report no row uses', url: 'https://example.org/unused', published: '2020', licence: 'none', accessed: '2026-10-26' };
    const fixture: BenchmarkSource = {
      indicators: (g) => base.indicators(g),
      areas: () => base.areas(),
      interventions: () => base.interventions(),
      sources: () => [...base.sources(), extra],
      caveats: () => base.caveats(),
      updated: () => base.updated(),
      notFound: (g) => base.notFound(g),
    };
    render(<PolicyView now={NOW} source={fixture} />);
    const s = section('About this data');
    const sources = within(s).getByRole('list', { name: 'Sources' });
    expect(sources).not.toHaveTextContent(extra.title);
    expect(sources.querySelector(`a[href="${extra.url}"]`)).toBeNull();
    // A source counts as used when a row, area or intervention whose text is on the page (outside this list) rests on it.
    const rest = [...document.querySelectorAll('section')].filter((x) => x !== s).map((x) => x.textContent ?? '').join(' ');
    const shownBy = (id: string) =>
      src.indicators().some((i) => i.sourceId === id && rest.includes(i.label)) ||
      src.areas().some((a) => a.sourceId === id && rest.includes(a.name)) ||
      src.interventions().some((i) => i.sourceId === id && rest.includes(i.label));
    const items = within(sources).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(5);
    expect(items.length).toBeLessThanOrEqual(src.sources().length);
    const first = src.sources().find((x) => x.id === 'abs-food-insecurity-2023')!;
    expect(sources).toHaveTextContent(first.title);
    expect(sources).toHaveTextContent(first.licence);
    expect(sources).toHaveTextContent(/Accessed 26 October 2026/);
    for (const li of items) {
      const a = within(li).getByRole('link');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
    }
    // Every source behind a shown figure is there; the ones nothing shows are not.
    const shownTitles = src.sources().filter((x) => shownBy(x.id)).map((x) => x.title);
    for (const t of shownTitles) expect(sources).toHaveTextContent(t);
    expect(src.sources().some((y) => !shownBy(y.id))).toBe(true);
    for (const x of src.sources().filter((y) => !shownBy(y.id))) expect(sources).not.toHaveTextContent(x.title);
  });

  it('shows every caveat, the not-found list and the update date', () => {
    show();
    const s = section('About this data');
    const caveats = within(s).getByRole('list', { name: 'Things to keep in mind' });
    expect(within(caveats).getAllByRole('listitem')).toHaveLength(src.caveats().length);
    const gaps = within(s).getByRole('list', { name: 'Not found' });
    expect(within(gaps).getAllByRole('listitem')).toHaveLength(src.notFound().length);
    expect(s).toHaveTextContent('Last updated 26 October 2026');
  });

  it('never shows the internal research notes', () => {
    const { container } = show();
    for (const i of src.indicators()) if (i.research) expect(container.textContent).not.toContain(i.research);
  });

  it('uses no technical wording in the text people read', () => {
    const { container } = show();
    expect(container.textContent).not.toMatch(/HTTP \d{3}|extraction|could not be opened/i);
  });

  it('has a print stylesheet that hides the header, footer and navigation and uses light tokens', () => {
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toMatch(/header,\s*footer,\s*nav,\s*\[data-print-hide\]\s*\{\s*display:\s*none\s*!important/);
    expect(print).toMatch(/html\[data-theme\]\s*\{[^}]*--bg:\s*#ffffff/);
    expect(print).toMatch(/print-color-adjust:\s*exact/);
  });

  it('keeps the page short: figures sit in compact rows, with details and the extra cost figures folded', () => {
    show();
    const how = section('How many go without');
    expect(within(how).getAllByText('About this figure').length).toBeGreaterThan(5);
    const cost = section('Cost of living');
    const more = within(cost).getByText('More cost figures').closest('details')!;
    expect(more.open).toBe(false);
    expect(more).toHaveTextContent(/total income, not food budgets/);
    const poverty = src.indicators().find((i) => i.id === 'b-poverty-line-single')!;
    expect(more).toHaveTextContent(poverty.label);
    expect(within(cost).queryAllByText(poverty.label).length).toBe(1);
  });

  it('keeps "Older data" visible outside the folded details', () => {
    show();
    const row = screen.getByText('Victorians assisted by Foodbank Victoria each month').closest('li')!;
    const visible = [...row.children].filter((c) => c.tagName !== 'DETAILS').map((c) => c.textContent).join(' ');
    expect(visible).toMatch(/Older data/);
  });

  it('shows the group households figure once, in Students only', () => {
    show();
    const label = src.indicators().find((i) => i.id === 'p-abs-group-households')!.label;
    expect(screen.getAllByText(label)).toHaveLength(1);
    expect(section('Students and young people')).toHaveTextContent(label);
  });

  it('keeps caveats and not-found always visible (not inside a folded details)', () => {
    show();
    const s = section('About this data');
    for (const name of ['Things to keep in mind', 'Not found']) {
      expect(within(s).getByRole('list', { name }).closest('details')).toBeNull();
    }
    expect(within(s).getByRole('list', { name: 'Sources' }).closest('details')).not.toBeNull();
  });

  it('says the period is not stated, without a lower-case fragment or an internal phrase', () => {
    const { container } = show();
    expect(container.textContent).toMatch(/Period not stated/);
    expect(container.textContent).not.toMatch(/\. not stated|reference year unknown/);
  });

  it('gives every heading and group a unique id', () => {
    const { container } = show();
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('says what each dial is a share of, in visible text', () => {
    show();
    const how = section('How many go without');
    expect(within(how).getAllByText('of Australian households').length).toBeGreaterThan(0);
    expect(within(how).getAllByText('of households').length).toBeGreaterThan(0);
  });
});
