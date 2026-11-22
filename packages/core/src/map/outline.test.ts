import { describe, expect, it } from 'vitest';
import { MAP_COUNCILS, MAP_OUTLINE_BOUNDS, MAP_OUTLINE_VIEWBOX } from './outline.generated';
import { MAP_BOUNDS, MAP_VIEWBOX } from './project';

describe('generated map outline', () => {
  it('uses the same bounds and viewBox as the projection', () => {
    expect(MAP_OUTLINE_BOUNDS).toEqual(MAP_BOUNDS);
    expect(MAP_OUTLINE_VIEWBOX).toEqual(MAP_VIEWBOX);
  });
  it('has the Greater Melbourne councils as core paths', () => {
    const core = MAP_COUNCILS.filter((c) => c.core).map((c) => c.name);
    for (const n of ['MELBOURNE', 'FRANKSTON', 'WYNDHAM', 'WHITTLESEA', 'YARRA RANGES', 'MORNINGTON PENINSULA']) expect(core).toContain(n);
    expect(core).not.toContain('MITCHELL');
    for (const c of MAP_COUNCILS) expect(c.d).toMatch(/^M[-\d. ]+l[-\d. ]+z/);
  });
  it('stays small', () => {
    expect(JSON.stringify(MAP_COUNCILS).length).toBeLessThan(60_000);
  });
});
