import { describe, expect, it } from 'vitest';
import { DATA_LICENCES, buildDataLicences } from './dataLicences';

describe('data licences', () => {
  it('gives every entry an id, label, text and https url', () => {
    expect(DATA_LICENCES.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const l of DATA_LICENCES) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(l.label.trim()).not.toBe('');
      expect(l.text.trim()).not.toBe('');
      expect(l.url).toMatch(/^https:\/\//);
    }
  });
  it('credits Overture Maps Foundation and links the CDLA-Permissive-2.0 text', () => {
    const o = DATA_LICENCES.find((l) => l.id === 'overture');
    expect(o?.text).toContain('Overture Maps Foundation, overturemaps.org');
    const c = DATA_LICENCES.find((l) => l.id === 'cdla-permissive-2.0');
    expect(c?.url).toBe('https://cdla.dev/permissive-2-0/');
  });
  it('names the release once one is pinned, and says so plainly until then', () => {
    expect(buildDataLicences('2026-09-17.0').find((l) => l.id === 'overture')?.text).toContain('release 2026-09-17.0');
    expect(DATA_LICENCES.find((l) => l.id === 'overture')?.text).toMatch(/release is named here when/i);
  });
  it('credits the Vicmap map outline under CC BY 4.0 with a checked date', () => {
    const v = DATA_LICENCES.find((l) => l.id === 'vicmap-lga');
    expect(v?.text).toContain('Vicmap Admin');
    expect(v?.text).toContain('State of Victoria');
    expect(v?.text).toContain('CC BY 4.0');
    expect(v?.text).toContain('22 November 2026');
  });
  it('has no Foursquare, OpenStreetMap or ODbL entry', () => {
    const all = JSON.stringify(DATA_LICENCES);
    expect(all).not.toMatch(/foursquare|openstreetmap|odbl/i);
  });
});
