import { test, expect } from 'vitest';
import { describeLoadError } from '../web/src/math.js';

test('sin WebGL', () => {
  expect(describeLoadError({ kind: 'webgl' })).toBe('Tu navegador no admite gráficos 3D (WebGL).');
});
test('fallo de red', () => {
  expect(describeLoadError({ kind: 'network', status: 404 })).toBe('No se pudo descargar el modelo. Revisa tu conexión y recarga.');
});
test('archivo dañado', () => {
  expect(describeLoadError({ kind: 'parse' })).toBe('El archivo del modelo está dañado.');
});
test('tipo desconocido se trata como fallo de red', () => {
  expect(describeLoadError({ kind: 'otro' })).toBe('No se pudo descargar el modelo. Revisa tu conexión y recarga.');
  expect(describeLoadError(undefined)).toBe('No se pudo descargar el modelo. Revisa tu conexión y recarga.');
});
