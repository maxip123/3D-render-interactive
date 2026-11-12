import { test, expect } from 'vitest';
import { clipHeightFor, topDownPose } from '../web/src/math.js';

const floors = { PB: { floorY: 0, clipY: 2.3 }, P1: { floorY: 5.1, clipY: 7.4 }, P2: { floorY: 8.62, clipY: 10.92 } };
const bounds = { min: [107.8, 0, -41.4], max: [163.9, 18.8, -32.5] };

test('Todo no corta', () => { expect(clipHeightFor(floors, 'ALL')).toBeNull(); });
test('cada piso corta a su altura', () => {
  expect(clipHeightFor(floors, 'PB')).toBe(2.3);
  expect(clipHeightFor(floors, 'P1')).toBe(7.4);
  expect(clipHeightFor(floors, 'P2')).toBe(10.92);
});
test('selección desconocida no corta', () => { expect(clipHeightFor(floors, 'P9')).toBeNull(); });

test('la vista de piso apunta al centro en planta, a la altura del piso', () => {
  const { target } = topDownPose(bounds, floors.P1, 1.6);
  expect(target[0]).toBeCloseTo((107.8 + 163.9) / 2);
  expect(target[1]).toBeCloseTo(5.1);
  expect(target[2]).toBeCloseTo((-41.4 + -32.5) / 2);
});
test('la cámara queda por encima del corte e inclinada 35° respecto de la vertical', () => {
  const { position, target } = topDownPose(bounds, floors.P1, 1.6);
  expect(position[1]).toBeGreaterThan(floors.P1.clipY);
  const d = position.map((v, i) => v - target[i]);
  const tilt = Math.atan2(Math.hypot(d[0], d[2]), d[1]) * 180 / Math.PI;
  expect(tilt).toBeCloseTo(35, 1);
  expect(d[2]).toBeGreaterThan(0);   // del lado +Z, mirando hacia el edificio
});
test('en pantalla angosta la cámara se aleja para que quepa el piso', () => {
  const wide = topDownPose(bounds, floors.PB, 1.6), tall = topDownPose(bounds, floors.PB, 0.46);
  const dist = p => Math.hypot(...p.position.map((v, i) => v - p.target[i]));
  expect(dist(tall)).toBeGreaterThan(dist(wide));
});

test('si el piso trae su propia huella, la cámara se centra y ajusta a ella', () => {
  const floor = { floorY: 0, clipY: 2.3, box: { min: [130, -40], max: [160, -32] } };
  const own = topDownPose(bounds, floor, 1.6), whole = topDownPose(bounds, floors.PB, 1.6);
  expect(own.target[0]).toBeCloseTo(145);
  expect(own.target[2]).toBeCloseTo(-36);
  const dist = p => Math.hypot(...p.position.map((v, i) => v - p.target[i]));
  expect(dist(own)).toBeLessThan(dist(whole));
});
