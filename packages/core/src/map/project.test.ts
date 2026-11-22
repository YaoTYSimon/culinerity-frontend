import { describe, expect, it } from 'vitest';
import { MAP_VIEWBOX, isInsideMap, projectPoint, viewBoxAround } from './project';

const CBD = { lat: -37.8136, lng: 144.9631 };
const FRANKSTON = { lat: -38.1447, lng: 145.1229 };
const WERRIBEE = { lat: -37.9, lng: 144.6613 };
const CRAIGIEBURN = { lat: -37.5979, lng: 144.9423 };

describe('projectPoint', () => {
  it('puts known places inside the viewBox', () => {
    for (const p of [CBD, FRANKSTON, WERRIBEE, CRAIGIEBURN]) {
      const { x, y } = projectPoint(p.lat, p.lng);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_VIEWBOX.w);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_VIEWBOX.h);
    }
  });
  it('has north up and east right', () => {
    const cbd = projectPoint(CBD.lat, CBD.lng);
    expect(projectPoint(FRANKSTON.lat, FRANKSTON.lng).y).toBeGreaterThan(cbd.y);
    expect(projectPoint(CRAIGIEBURN.lat, CRAIGIEBURN.lng).y).toBeLessThan(cbd.y);
    expect(projectPoint(WERRIBEE.lat, WERRIBEE.lng).x).toBeLessThan(cbd.x);
    expect(projectPoint(FRANKSTON.lat, FRANKSTON.lng).x).toBeGreaterThan(cbd.x);
  });
  it('keeps true proportions (one degree of latitude is longer than one of longitude)', () => {
    const a = projectPoint(-38, 145);
    const north = projectPoint(-37, 145);
    const east = projectPoint(-38, 146);
    const dy = a.y - north.y;
    const dx = east.x - a.x;
    expect(dx / dy).toBeGreaterThan(0.75);
    expect(dx / dy).toBeLessThan(0.83);
  });
});

describe('isInsideMap', () => {
  it('accepts Greater Melbourne and rejects far places', () => {
    expect(isInsideMap(CBD.lat, CBD.lng)).toBe(true);
    expect(isInsideMap(FRANKSTON.lat, FRANKSTON.lng)).toBe(true);
    expect(isInsideMap(-33.8688, 151.2093)).toBe(false); // Sydney
    expect(isInsideMap(-38.1499, 144.3617)).toBe(false); // Geelong
    expect(isInsideMap(-36.7570, 144.2794)).toBe(false); // Bendigo
    expect(isInsideMap(Number.NaN, 145)).toBe(false);
  });
});

describe('viewBoxAround', () => {
  const ratio = MAP_VIEWBOX.w / MAP_VIEWBOX.h;
  const within = (v: { x: number; y: number; w: number; h: number }) => {
    expect(v.x).toBeGreaterThanOrEqual(0);
    expect(v.y).toBeGreaterThanOrEqual(0);
    expect(v.x + v.w).toBeLessThanOrEqual(MAP_VIEWBOX.w + 1e-6);
    expect(v.y + v.h).toBeLessThanOrEqual(MAP_VIEWBOX.h + 1e-6);
    expect(v.w / v.h).toBeCloseTo(ratio, 4);
  };
  it('zooms to the points, keeps the aspect ratio and contains them', () => {
    const pts = [CBD, FRANKSTON];
    const v = viewBoxAround(pts, 0.1);
    within(v);
    expect(v.w).toBeLessThan(MAP_VIEWBOX.w);
    for (const p of pts) {
      const { x, y } = projectPoint(p.lat, p.lng);
      expect(x).toBeGreaterThanOrEqual(v.x);
      expect(x).toBeLessThanOrEqual(v.x + v.w);
      expect(y).toBeGreaterThanOrEqual(v.y);
      expect(y).toBeLessThanOrEqual(v.y + v.h);
    }
  });
  it('gives a single point a minimum window, centred where it can be', () => {
    const v = viewBoxAround([CBD], 0.1);
    within(v);
    expect(v.w).toBeGreaterThanOrEqual(100);
    expect(v.w).toBeLessThan(MAP_VIEWBOX.w);
    const { x, y } = projectPoint(CBD.lat, CBD.lng);
    expect(v.x + v.w / 2).toBeCloseTo(x, 1);
    expect(v.y + v.h / 2).toBeCloseTo(y, 1);
  });
  it('clamps to the map at an edge', () => {
    within(viewBoxAround([{ lat: -38.49, lng: 144.51 }], 0.1));
    within(viewBoxAround([{ lat: -37.31, lng: 145.89 }], 0.1));
  });
  it('shows the whole map for no usable points or a very wide spread', () => {
    expect(viewBoxAround([], 0.1)).toEqual({ x: 0, y: 0, w: MAP_VIEWBOX.w, h: MAP_VIEWBOX.h });
    expect(viewBoxAround([{ lat: -33.9, lng: 151.2 }], 0.1)).toEqual({ x: 0, y: 0, w: MAP_VIEWBOX.w, h: MAP_VIEWBOX.h });
    const wide = viewBoxAround([{ lat: -38.45, lng: 144.55 }, { lat: -37.35, lng: 145.85 }], 0.2);
    within(wide);
    expect(wide.w).toBeCloseTo(MAP_VIEWBOX.w, 3);
  });
});
