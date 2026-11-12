import { test, expect } from 'vitest';
import { createFlight } from '../web/src/math.js';

const A = { position: [0, 0, 0], quaternion: [0, 0, 0, 1], fov: 50 };
const B = { position: [10, 0, 0], quaternion: [0, Math.SQRT1_2, 0, Math.SQRT1_2], fov: 60 };

test('el vuelo termina exactamente en el destino y avisa una vez', () => {
  const f = createFlight(); let last, done = 0;
  f.start(A, B, 1000, p => { last = p; }, () => done++);
  f.tick(400); expect(f.active).toBe(true); expect(last.position[0]).toBeGreaterThan(0); expect(last.position[0]).toBeLessThan(10);
  f.tick(700);
  expect(f.active).toBe(false);
  expect(last.position).toEqual([10, 0, 0]);
  expect(last.fov).toBe(60);
  expect(last.quaternion[1]).toBeCloseTo(Math.SQRT1_2);
  expect(done).toBe(1);
  f.tick(100); expect(done).toBe(1);
});
test('la orientación intermedia es un cuaternión unitario', () => {
  const f = createFlight(); let last;
  f.start(A, B, 1000, p => { last = p; }, () => {});
  f.tick(500);
  expect(Math.hypot(...last.quaternion)).toBeCloseTo(1);
});
test('segundo start cancela el primero: onDone del primero no se llama', () => {
  const f = createFlight(); let first = 0, second = 0;
  f.start(A, B, 1000, () => {}, () => first++);
  f.tick(300);
  f.start(B, A, 1000, () => {}, () => second++);
  f.tick(2000);
  expect(first).toBe(0); expect(second).toBe(1);
});
test('cancel deja active en false y no avisa', () => {
  const f = createFlight(); let done = 0;
  f.start(A, B, 1000, () => {}, () => done++);
  f.cancel(); f.tick(2000);
  expect(f.active).toBe(false); expect(done).toBe(0);
});
test('duración cero llega al destino en el primer tick', () => {
  const f = createFlight(); let last;
  f.start(A, B, 0, p => { last = p; }, () => {});
  f.tick(16);
  expect(last.position).toEqual([10, 0, 0]);
});
