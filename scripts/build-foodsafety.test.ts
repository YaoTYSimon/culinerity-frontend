// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATA_PATH, OUT_PATH, buildFoodSafety, validateFoodSafety } from './build-foodsafety.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const TODAY = '2026-11-21';
const errorsFor = (mut: (d: any) => void) => {
  const d = data();
  mut(d);
  return validateFoodSafety(d, TODAY).join('\n');
};

describe('build-foodsafety validator', () => {
  it('accepts the committed dataset', () => {
    expect(validateFoodSafety(data(), TODAY)).toEqual([]);
  });
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildFoodSafety(data(), TODAY));
  });
  it('every source was read on 2026-11-21 from an official https host with licence wording', () => {
    for (const s of data().sources) {
      expect(s.accessed).toBe('2026-11-21');
      expect(s.url).toMatch(/^https:\/\/([a-z]+\.)*(vic|gov)\.au|^https:\/\/www\.(betterhealth|health|safefood)\.vic\.gov\.au|^https:\/\/www\.foodstandards\.gov\.au/);
      expect(s.licence.length).toBeGreaterThan(20);
    }
  });
  it('rejects a figure that is not listed or not in the source notes', () => {
    expect(errorsFor((d) => (d.sections[0].lines[0].text = 'Set the fridge to 7 °C.'))).toMatch(/figure 7 is not listed/);
    expect(errorsFor((d) => (d.sections[0].lines[0].figures = ['5', '9']))).toMatch(/figure 9 is not in the cited/);
  });
  it('rejects a phone number that is not in its source notes', () => {
    expect(errorsFor((d) => (d.contacts[0] = { ...d.contacts[0], display: '1300 11 22 33', tel: '1300112233', figures: ['1300', '11', '22', '33'] }))).toMatch(/not in the cited/);
  });
  it('rejects a source without https, an official host, licence or a real date', () => {
    expect(errorsFor((d) => (d.sources[0].url = 'http://www.betterhealth.vic.gov.au/x'))).toMatch(/https/);
    expect(errorsFor((d) => (d.sources[0].url = 'https://example.com/x'))).toMatch(/not an official/);
    expect(errorsFor((d) => (d.sources[0].licence = ''))).toMatch(/licence/);
    expect(errorsFor((d) => (d.sources[0].accessed = '2026-02-30'))).toMatch(/real/);
  });
  it('rejects a line with no source or an unknown source', () => {
    expect(errorsFor((d) => (d.sections[0].lines[0].sourceIds = []))).toMatch(/at least one source/);
    expect(errorsFor((d) => (d.sections[0].lines[0].sourceIds = ['nope']))).toMatch(/unknown source/);
  });
});
