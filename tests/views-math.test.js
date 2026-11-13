import { test, expect } from 'vitest';
import { fitRect, verticalFovFor, groupViews } from '../web/src/math.js';

test('render 1402x1122 en pantalla 390x844 se contiene con bandas', () => {
  const r = fitRect(1402, 1122, 390, 844);
  expect(r.x).toBe(0);
  expect(r.w).toBe(390);
  expect(r.h).toBeCloseTo(312.11, 1);
  expect(r.y).toBeCloseTo(265.94, 1);
});
test('pantalla más ancha que el render: bandas a los lados', () => {
  const r = fitRect(1402, 1122, 1920, 900);
  expect(r.h).toBe(900);
  expect(r.w).toBeCloseTo(1124.6, 1);
  expect(r.x).toBeCloseTo((1920 - 1124.6) / 2, 1);
  expect(r.y).toBe(0);
});
test('render a toda la altura: verticalFovFor devuelve el fov original', () => {
  expect(verticalFovFor(60, 900, 900)).toBeCloseTo(60);
});
test('pantalla más alta que el render: fov vertical mayor que el original', () => {
  const v = verticalFovFor(60, 312.11, 844);
  expect(v).toBeGreaterThan(60);
  // la franja del render (312 de 844 px) debe abarcar exactamente 60°
  const half = Math.tan(v * Math.PI / 360) * (312.11 / 844);
  expect(2 * Math.atan(half) * 180 / Math.PI).toBeCloseTo(60, 1);
});

const V = (id, floor, extra = {}) => ({ id, floor, render: `${id}.jpg`, position: [0, 0, 0], quaternion: [0, 0, 0, 1], fov: 60, ...extra });
test('groupViews ordena EXT, PB, P1, P2 y omite vistas sin render', () => {
  const g = groupViews([V('p2-a', 'P2'), V('pb-a', 'PB'), V('x', 'PB', { render: null }), V('fachada', 'EXT'), V('p1-a', 'P1')]);
  expect(g.map(x => x.floor)).toEqual(['EXT', 'PB', 'P1', 'P2']);
  expect(g[1].items.map(v => v.id)).toEqual(['pb-a']);
});
test('groupViews conserva vistas con render y sin posición', () => {
  const g = groupViews([V('pb-a', 'PB', { position: null, quaternion: null })]);
  expect(g[0].items).toHaveLength(1);
});
test('groupViews omite pisos vacíos y tolera lista vacía', () => {
  expect(groupViews([V('pb-a', 'PB')]).map(x => x.floor)).toEqual(['PB']);
  expect(groupViews([])).toEqual([]);
});
