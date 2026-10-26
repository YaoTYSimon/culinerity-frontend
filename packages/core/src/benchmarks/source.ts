import { benchmarkData } from './generated/benchmarks.generated';
import type { BenchmarkData, BenchmarkSource, Indicator, IndicatorGroup, Verification } from './types';

const OLDER_THAN_YEARS = 5;

const VERIFICATION_LABELS: Record<Verification, string> = {
  primary: 'Read from the source itself',
  secondary: 'Read from a research paper that reports it',
  press: 'Press report only (not checked against the study)',
};

export function verificationLabel(v: Verification): string {
  return VERIFICATION_LABELS[v];
}

/** True when a figure is flagged dated or its reference year is more than five years before `now`. */
export function isOlderData(i: Indicator, now: Date): boolean {
  return i.dated === true || (i.year !== undefined && now.getFullYear() - i.year > OLDER_THAN_YEARS);
}

/** Callers get their own copy, so they cannot change the shared dataset. */
function copy<T>(v: T): T {
  return structuredClone(v);
}

/** Reads the generated, sourced dataset. Static: no runtime requests. */
export class StaticBenchmarkSource implements BenchmarkSource {
  constructor(private readonly data: BenchmarkData = benchmarkData) {}

  indicators(group?: IndicatorGroup) {
    return this.data.indicators.filter((i) => !group || i.group === group).map(copy);
  }
  areas() {
    return copy(this.data.areas);
  }
  interventions() {
    return copy(this.data.interventions);
  }
  sources() {
    return copy(this.data.sources);
  }
  caveats() {
    return copy(this.data.caveats);
  }
  notFound(group?: IndicatorGroup) {
    return this.data.notFound.filter((n) => !group || n.group === group).map((n) => n.text);
  }
}
