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
  note?: string;
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

export interface BenchmarkData {
  generatedAt: string;
  sources: Source[];
  indicators: Indicator[];
  areas: Area[];
  interventions: Intervention[];
  caveats: string[];
  notFound: string[];
}

export interface BenchmarkSource {
  indicators(group?: IndicatorGroup): Indicator[];
  areas(): Area[];
  interventions(): Intervention[];
  sources(): Source[];
  caveats(): string[];
  notFound(): string[];
}
