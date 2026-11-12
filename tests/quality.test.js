import { test, expect } from 'vitest';
import { nextQuality, createFpsMeter } from '../web/src/quality.js';

test('baja un nivel si va lento', () => { expect(nextQuality(2, 20)).toBe(1); });
test('no baja de 0', () => { expect(nextQuality(0, 10)).toBe(0); });
test('sube un nivel si sobra rendimiento', () => { expect(nextQuality(1, 55)).toBe(2); });
test('no sube de 2', () => { expect(nextQuality(2, 60)).toBe(2); });
test('en la zona media se queda igual', () => { expect(nextQuality(1, 30)).toBe(1); });

test('el medidor entrega el promedio cada 2 s', () => {
  const m = createFpsMeter();
  let out = null;
  for (let i = 0; i < 119; i++) out = m.sample(1 / 60) ?? out;
  expect(out).toBeNull();
  for (let i = 0; i < 2; i++) out = m.sample(1 / 60) ?? out;
  expect(out).toBeCloseTo(60, 0);
});
test('el medidor ignora pausas largas (pestaña oculta)', () => {
  const m = createFpsMeter();
  expect(m.sample(5)).toBeNull();
  let out = null;
  for (let i = 0; i < 121; i++) out = m.sample(1 / 60) ?? out;
  expect(out).toBeCloseTo(60, 0);
});
test('reset descarta lo acumulado', () => {
  const m = createFpsMeter();
  for (let i = 0; i < 100; i++) m.sample(1 / 60);
  m.reset();
  let out = null;
  for (let i = 0; i < 30; i++) out = m.sample(1 / 60) ?? out;
  expect(out).toBeNull();
});
