import { test, expect } from 'vitest';
import { scrubTime } from '../web/src/math.js';

test('arrastrar todo el ancho hacia la izquierda recorre el clip completo', () => {
  expect(scrubTime(0, -800, 800, 4)).toBe(4);
});
test('arrastrar hacia la derecha retrocede', () => {
  expect(scrubTime(3, 400, 800, 4)).toBe(1);
});
test('no sale del clip por ningún extremo', () => {
  expect(scrubTime(0, 500, 800, 4)).toBe(0);
  expect(scrubTime(3.5, -800, 800, 4)).toBe(4);
});
test('medio ancho es medio clip', () => {
  expect(scrubTime(0, -400, 800, 4)).toBe(2);
});
test('ancho o duración inválidos devuelven el tiempo inicial', () => {
  expect(scrubTime(1, -100, 0, 4)).toBe(1);
  expect(scrubTime(1, -100, 800, NaN)).toBe(1);
});

import { scrubPosition } from '../web/src/math.js';

test('posición: arrastrar a la izquierda va hacia +1 (clip derecho), a la derecha hacia -1 (clip izquierdo)', () => {
  expect(scrubPosition(0, -400, 800)).toBe(0.5);
  expect(scrubPosition(0, 400, 800)).toBe(-0.5);
});
test('posición: se limita a [-1, 1]', () => {
  expect(scrubPosition(0.8, -800, 800)).toBe(1);
  expect(scrubPosition(-0.8, 800, 800)).toBe(-1);
});
test('posición: sin clip izquierdo no baja de 0', () => {
  expect(scrubPosition(0, 400, 800, false)).toBe(0);
});
test('posición: ancho inválido devuelve la inicial', () => {
  expect(scrubPosition(0.3, -100, 0)).toBe(0.3);
});
