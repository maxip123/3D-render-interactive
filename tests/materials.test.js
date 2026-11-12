import { test, expect } from 'vitest';
import { surfaceFor } from '../tools/lib/materials.js';

test('telas son mates y no metálicas', () => {
  expect(surfaceFor('_Sollos_Cadeira Munick_600x610x820_Tecido Cinza_4')).toEqual({ metallic: 0, roughness: 0.95 });
  expect(surfaceFor('00-sofa rojo')).toEqual({ metallic: 0, roughness: 0.95 });
});
test('metales son metálicos', () => {
  expect(surfaceFor('Metal_Aluminum_Anodized1')).toEqual({ metallic: 0.9, roughness: 0.35 });
  expect(surfaceFor('00-metal barra').metallic).toBe(0.9);
  expect(surfaceFor('COCINA INDUSTRIAL#1').metallic).toBe(0.9);
});
test('maderas tienen brillo satinado', () => {
  expect(surfaceFor('Cherry Highgloss 300cm')).toEqual({ metallic: 0, roughness: 0.45 });
  expect(surfaceFor('Flooring Parquet Parallel D01 120cm').roughness).toBe(0.45);
  expect(surfaceFor('00-Madera Barra').roughness).toBe(0.45);
});
test('espejo refleja', () => {
  expect(surfaceFor('Glass Mirror 001')).toEqual({ metallic: 1, roughness: 0.03 });
});
test('piedra y muros son ásperos; lo desconocido usa el valor por defecto', () => {
  expect(surfaceFor('00-piedra muro agua').roughness).toBe(0.85);
  expect(surfaceFor('<auto>13')).toEqual({ metallic: 0, roughness: 0.75 });
  expect(surfaceFor(undefined)).toEqual({ metallic: 0, roughness: 0.75 });
});
