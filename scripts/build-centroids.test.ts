// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCentroids, validateCentroids, DATA_PATH, OUT_PATH } from './build-centroids.mjs';

const data = () => JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const errorsFor = (mut: (d: any) => void) => {
  const d = data();
  mut(d);
  return validateCentroids(d).join('\n');
};

describe('build-centroids', () => {
  it('the committed generated file is up to date', () => {
    expect(readFileSync(OUT_PATH, 'utf8')).toBe(buildCentroids(data()));
  });
  it('accepts the committed dataset', () => {
    expect(validateCentroids(data())).toEqual([]);
  });
  it('rejects duplicate suburb names (after normalising)', () => {
    expect(errorsFor((d) => d.suburbs.push({ ...d.suburbs[0], name: d.suburbs[0].name.toUpperCase() }))).toMatch(/duplicate suburb/i);
  });
  it('rejects duplicate postcodes', () => {
    expect(errorsFor((d) => d.postcodes.push({ ...d.postcodes[0] }))).toMatch(/duplicate postcode/i);
  });
  it('rejects coordinates outside the Melbourne box', () => {
    expect(errorsFor((d) => (d.suburbs[0].lat = -33.8))).toMatch(/outside/i);
    expect(errorsFor((d) => (d.postcodes[0].lng = 151))).toMatch(/outside/i);
    expect(errorsFor((d) => (d.suburbs[0].lat = 'x'))).toMatch(/outside/i);
  });
  it('rejects a postcode that is not 4 digits', () => {
    expect(errorsFor((d) => (d.postcodes[0].code = '301'))).toMatch(/4 digits/);
  });
  it('rejects a missing source licence or non-https url', () => {
    expect(errorsFor((d) => delete d.source.licence)).toMatch(/licence/);
    expect(errorsFor((d) => (d.source.url = 'http://x'))).toMatch(/https/);
  });
  it('rejects empty names and labels', () => {
    expect(errorsFor((d) => (d.suburbs[0].name = ' '))).toMatch(/name/);
    expect(errorsFor((d) => (d.postcodes[0].label = ''))).toMatch(/label/);
  });
});
