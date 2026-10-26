export type IndicatorGroup = 'budget' | 'policy';
export type Verification = 'primary' | 'secondary' | 'press';
export type Evidence = 'moderate' | 'weak' | 'mixed' | 'strong';

export interface Indicator {
  id: string;
  group: IndicatorGroup;
  label: string;
  /** Null for string-valued rows, which carry `display` instead. */
  value: number | null;
  /** Used verbatim when present, for example "about 1 in 5". */
  display?: string;
  unit: string;
  scope: string;
  period: string;
  /** Reference year of the figure. Absent only when `dated` is true and the source gives no year. */
  year?: number;
  dated?: boolean;
  verification: Verification;
  /** What exactly was asked or measured. */
  measure?: string;
  previous?: { value: number; period: string };
  /** Plain, user-facing remark about what the figure means and its caveats. */
  note?: string;
  /** Remarks on how the figure was found. Kept in the data, never shown. */
  research?: string;
  sourceId: string;
}

export interface Source {
  id: string;
  publisher: string;
  title: string;
  url: string;
  published: string;
  licence: string;
  accessed: string;
}

export interface Area {
  name: string;
  seifaIrsdScore: number;
  seifaDecileVic: number | null;
  release: string;
  sourceId: string;
}

export interface Intervention {
  id: string;
  label: string;
  evidence: Evidence;
  summary: string;
  sourceId: string;
  costPerPersonAud: number | null;
}

/** Something the research looked for and could not find, tagged by the screen it belongs to. */
export interface NotFoundItem {
  group: IndicatorGroup;
  text: string;
}

export interface BenchmarkData {
  generatedAt: string;
  sources: Source[];
  indicators: Indicator[];
  areas: Area[];
  interventions: Intervention[];
  caveats: string[];
  notFound: NotFoundItem[];
}

export interface BenchmarkSource {
  indicators(group?: IndicatorGroup): Indicator[];
  areas(): Area[];
  interventions(): Intervention[];
  sources(): Source[];
  caveats(): string[];
  notFound(group?: IndicatorGroup): string[];
}
