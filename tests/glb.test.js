import { test, expect } from 'vitest';
import { readGlbJson, applyRoot, applyRootQuat, rootMatrixOf } from '../tools/lib/glb.js';

const ROOT = [1,0,0,0, 0,4.49e-11,-1,0, 0,1,4.49e-11,0, 0,0,0,1];

test('applyRoot pasa de Z arriba a Y arriba', () => {
  const p = applyRoot(ROOT, [136.0814, 34.0256, 1.5]);
  expect(p[0]).toBeCloseTo(136.0814);
  expect(p[1]).toBeCloseTo(1.5);
  expect(p[2]).toBeCloseTo(-34.0256);
});

test('applyRoot suma la traslación de la matriz', () => {
  const m = [1,0,0,0, 0,1,0,0, 0,0,1,0, 10,20,30,1];
  expect(applyRoot(m, [1, 2, 3])).toEqual([11, 22, 33]);
});

test('applyRootQuat con identidad gira el eje Z local hacia Y del visor', () => {
  // un nodo sin rotación: su eje +Z (arriba en SketchUp) debe quedar en +Y
  const q = applyRootQuat(ROOT, [0, 0, 0, 1]);
  // rotar (0,0,1) por q
  const [x, y, z, w] = q;
  const v = [2*(x*z + w*y), 2*(y*z - w*x), 1 - 2*(x*x + y*y)];
  expect(v[0]).toBeCloseTo(0); expect(v[1]).toBeCloseTo(1); expect(v[2]).toBeCloseTo(0);
});

test('readGlbJson lee el modelo real', () => {
  const j = readGlbJson('santiago mercado.glb');
  expect(j.nodes.some(n => n.name === 'PB-Vista 1')).toBe(true);
});

test('rootMatrixOf acepta una raíz expresada como rotación (TRS)', () => {
  const gltf = { scenes: [{ nodes: [0] }], nodes: [{ rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2] }] };
  const p = applyRoot(rootMatrixOf(gltf), [1, 2, 3]);
  expect(p[0]).toBeCloseTo(1); expect(p[1]).toBeCloseTo(3); expect(p[2]).toBeCloseTo(-2);
});
