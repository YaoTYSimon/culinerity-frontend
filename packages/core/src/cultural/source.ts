import { culturalData } from './generated/cultural.generated';
import type { CalendarRow, CulturalData, OccasionDef, SourceRecord, Tradition } from '../food/types';

export { culturalData };

/** Starter traditions, alphabetical by label. Callers get copies. */
export function traditions(data: CulturalData = culturalData): Tradition[] {
  return data.traditions.map((t) => ({ ...t })).sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

export function occasionDefs(data: CulturalData = culturalData): OccasionDef[] {
  return data.occasions.map((o) => ({ ...o }));
}

export function calendar(data: CulturalData = culturalData): CalendarRow[] {
  return data.calendar.map((r) => ({ ...r }));
}

export function culturalSources(data: CulturalData = culturalData): SourceRecord[] {
  return data.sources.map((s) => ({ ...s }));
}

/** The latest `end` in the calendar (YYYY-MM-DD), or '' when empty. */
export function lastCalendarEnd(data: CulturalData = culturalData): string {
  return data.calendar.reduce((m, r) => (r.end > m ? r.end : m), '');
}

/** Label for a stored tradition: a starter id shows its label; the person's own text returns itself. */
export function labelFor(traditionId: string, data: CulturalData = culturalData): string {
  return data.traditions.find((t) => t.id === traditionId)?.label ?? traditionId;
}
