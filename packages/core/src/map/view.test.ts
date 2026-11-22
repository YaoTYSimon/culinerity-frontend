import { describe, expect, it } from 'vitest';
import type { RankedBulk } from '../places/bulk';
import type { RankedPlace } from '../places/rank';
import type { BulkPlace } from '../places/tier';
import type { Place } from '../places/types';
import { MAP_VIEWBOX, projectPoint, viewBoxAround } from './project';
import { LOCAL_MIN_WIDTH, MAX_RING_WIDTH, MIN_ZOOM_WIDTH, buildMapDots, countInView, dotRadius, localViewBox, panViewBox, ringsVisible, zoomViewBox } from './view';

const checked = (id: string, metres: number, lat = -37.81, lng = 144.96): RankedPlace => ({
  place: { id, name: id, kind: 'market', lat, lng, address: '1 A St' } as Place,
  metres,
});
const bulk = (id: string, distanceM: number, lat = -37.81, lng = 144.96): RankedBulk => ({
  place: { id, name: id, kind: 'grocer', lat, lng, address: '2 B St' } as unknown as BulkPlace,
  distanceM,
});

describe('buildMapDots', () => {
  it('lists checked dots nearest first, then the unchecked ones', () => {
    const dots = buildMapDots([checked('far', 900), checked('near', 100)], [bulk('u', 50)]);
    expect(dots.map((d) => d.id)).toEqual(['near', 'far', 'u']);
    expect(dots.map((d) => d.checked)).toEqual([true, true, false]);
  });
  it('caps unchecked dots to the nearest but never caps checked ones', () => {
    const c = Array.from({ length: 5 }, (_, i) => checked(`c${i}`, i));
    const u = Array.from({ length: 10 }, (_, i) => bulk(`u${9 - i}`, 9 - i));
    const dots = buildMapDots(c, u, 3);
    expect(dots.filter((d) => d.checked)).toHaveLength(5);
    expect(dots.filter((d) => !d.checked).map((d) => d.id)).toEqual(['u0', 'u1', 'u2']);
  });
  it('drops places off the map without spending the cap', () => {
    const dots = buildMapDots([checked('sydney', 1, -33.87, 151.2)], [bulk('off', 1, -33, 151), bulk('on', 2)], 1);
    expect(dots.map((d) => d.id)).toEqual(['on']);
  });
});

describe('zoomViewBox', () => {
  it('zooms in about the centre and back out', () => {
    const vb = viewBoxAround([{ lat: -37.81, lng: 144.96 }], 0.1);
    const widerCentre = (v: typeof vb) => [v.x + v.w / 2, v.y + v.h / 2];
    const bigger = { x: 300, y: 300, w: 400, h: 400 / (MAP_VIEWBOX.w / MAP_VIEWBOX.h) };
    const inn = zoomViewBox(bigger, 0.5);
    expect(inn.w).toBe(200);
    expect(widerCentre(inn)[0]).toBeCloseTo(widerCentre(bigger)[0], 0);
    expect(widerCentre(inn)[1]).toBeCloseTo(widerCentre(bigger)[1], 0);
    expect(zoomViewBox(inn, 2).w).toBe(400);
    expect(vb.w).toBeGreaterThan(0);
  });
  it('stops at the smallest window and at the whole map', () => {
    expect(zoomViewBox({ x: 10, y: 10, w: 80, h: 87 }, 0.1).w).toBe(MIN_ZOOM_WIDTH);
    expect(zoomViewBox({ x: 100, y: 100, w: 600, h: 650 }, 5)).toEqual(MAP_VIEWBOX);
  });
  it('never leaves the map', () => {
    const edge = zoomViewBox({ x: 0, y: 0, w: 200, h: 217 }, 1.5);
    expect(edge.x).toBeGreaterThanOrEqual(0);
    expect(edge.y).toBeGreaterThanOrEqual(0);
    expect(edge.x + edge.w).toBeLessThanOrEqual(MAP_VIEWBOX.w);
  });
});

describe('panViewBox and dotRadius', () => {
  it('moves and clamps', () => {
    const vb = { x: 100, y: 100, w: 200, h: 200 / (MAP_VIEWBOX.w / MAP_VIEWBOX.h) };
    expect(panViewBox(vb, 50, -30)).toMatchObject({ x: 150, y: 70, w: 200 });
    expect(panViewBox(vb, -999, -999)).toMatchObject({ x: 0, y: 0 });
    expect(panViewBox(vb, 9999, 9999).x).toBe(MAP_VIEWBOX.w - 200);
  });
  it('keeps a dot the same size on screen: radius scales with the window', () => {
    const a = { ...MAP_VIEWBOX };
    const b = { ...MAP_VIEWBOX, w: MAP_VIEWBOX.w / 4 };
    expect(dotRadius(b, 0.01) * 4).toBeCloseTo(dotRadius(a, 0.01));
  });
});

describe('localViewBox', () => {
  const user = { lat: -37.8136, lng: 144.9631 };
  const near = (n: number, step = 0.002) => Array.from({ length: n }, (_, i) => ({ lat: user.lat + 0.003 + i * step, lng: user.lng + (i % 3) * 0.002 }));
  const contains = (vb: { x: number; y: number; w: number; h: number }, p: { lat: number; lng: number }) => {
    const { x, y } = projectPoint(p.lat, p.lng);
    return x >= vb.x && x <= vb.x + vb.w && y >= vb.y && y <= vb.y + vb.h;
  };

  it('is a local window, never the whole map, even when there are hundreds of places', () => {
    const far = Array.from({ length: 150 }, (_, i) => ({ lat: -38.4 + (i % 10) * 0.01, lng: 145.8 - (i % 7) * 0.01 }));
    const vb = localViewBox(user, [...near(25), ...far]);
    expect(vb.w).toBeLessThan(200);
    expect(vb.w).toBeLessThan(MAP_VIEWBOX.w / 4);
  });
  it('keeps the user and the nearest 25 checked places inside, with the map aspect ratio', () => {
    const list = near(30, 0.003);
    const vb = localViewBox(user, list);
    expect(contains(vb, user)).toBe(true);
    list.slice(0, 25).forEach((p) => expect(contains(vb, p)).toBe(true));
    expect(vb.w / vb.h).toBeCloseTo(MAP_VIEWBOX.w / MAP_VIEWBOX.h, 1);
  });
  it('ignores places beyond the count', () => {
    const wide = localViewBox(user, near(30, 0.003), 30);
    const tight = localViewBox(user, near(30, 0.003), 5);
    expect(tight.w).toBeLessThan(wide.w);
  });
  it('is never tighter than about 8 km wide', () => {
    expect(LOCAL_MIN_WIDTH).toBeGreaterThan(55);
    expect(LOCAL_MIN_WIDTH).toBeLessThan(75);
    expect(localViewBox(user, []).w).toBeGreaterThanOrEqual(LOCAL_MIN_WIDTH);
    expect(localViewBox(user, near(2, 0.0005)).w).toBeGreaterThanOrEqual(LOCAL_MIN_WIDTH);
  });
  it('stays on the map near an edge', () => {
    const edge = { lat: -37.31, lng: 145.89 };
    const vb = localViewBox(edge, [{ lat: -37.32, lng: 145.88 }]);
    expect(vb.x).toBeGreaterThanOrEqual(0);
    expect(vb.y).toBeGreaterThanOrEqual(0);
    expect(vb.x + vb.w).toBeLessThanOrEqual(MAP_VIEWBOX.w);
    expect(vb.y + vb.h).toBeLessThanOrEqual(MAP_VIEWBOX.h);
  });
  it('uses the nearest places alone when the user is off the map, and the whole map when nothing is usable', () => {
    expect(localViewBox({ lat: 0, lng: 0 }, near(3)).w).toBeLessThan(MAP_VIEWBOX.w);
    expect(localViewBox({ lat: 0, lng: 0 }, [])).toEqual(MAP_VIEWBOX);
    expect(localViewBox(null, [])).toEqual(MAP_VIEWBOX);
  });
});

describe('ringsVisible and countInView', () => {
  it('draws rings only when the window is under about 40 km wide', () => {
    expect(MAX_RING_WIDTH).toBeGreaterThan(250);
    expect(MAX_RING_WIDTH).toBeLessThan(400);
    expect(ringsVisible({ ...MAP_VIEWBOX })).toBe(false);
    expect(ringsVisible({ x: 0, y: 0, w: 150, h: 150 / (MAP_VIEWBOX.w / MAP_VIEWBOX.h) })).toBe(true);
  });
  it('counts the dots whose position falls inside the window', () => {
    const a = projectPoint(-37.81, 144.96);
    const vb = { x: a.x - 30, y: a.y - 20, w: 60, h: 40 };
    const dots = [{ lat: -37.81, lng: 144.96 }, { lat: -38.4, lng: 145.8 }] as Parameters<typeof countInView>[1];
    expect(countInView(vb, dots)).toBe(1);
    expect(countInView({ ...MAP_VIEWBOX }, dots)).toBe(2);
  });
});
