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
