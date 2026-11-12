import { test, expect } from 'vitest';
import { statSync } from 'node:fs';
import { modelStats, checkStats } from '../tools/lib/stats.js';
import { readGlbJson } from '../tools/lib/glb.js';

const ok = { bytes: 19e6, drawnTriangles: 1.4e6, materials: 53, extensionsUsed: ['EXT_meshopt_compression'] };

test('checkStats acepta 19 MB y 1.4 M triángulos sin extensión antigua', () => {
  expect(checkStats(ok)).toEqual([]);
});
test('checkStats rechaza 21 MB', () => {
  expect(checkStats({ ...ok, bytes: 21e6 })).toHaveLength(1);
});
test('checkStats rechaza 1.6 M triángulos', () => {
  expect(checkStats({ ...ok, drawnTriangles: 1.6e6 })).toHaveLength(1);
});
test('checkStats rechaza KHR_materials_pbrSpecularGlossiness', () => {
  expect(checkStats({ ...ok, extensionsUsed: ['KHR_materials_pbrSpecularGlossiness'] })).toHaveLength(1);
});
test('modelStats cuenta una malla instanciada una vez por instancia', () => {
  const gltf = {
    accessors: [{ count: 300 }, { count: 4 }],
    meshes: [{ primitives: [{ indices: 0, attributes: {} }] }],
    materials: [{}, {}],
    nodes: [
      { mesh: 0 },
      { mesh: 0, extensions: { EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 1 } } } },
    ],
  };
  expect(modelStats(gltf, 10)).toMatchObject({ bytes: 10, drawnTriangles: 100 + 400, materials: 2, extensionsUsed: [] });
});
test('modelStats del original da 5 678 081 triángulos y 53 materiales', () => {
  const f = 'santiago mercado.glb';
  const s = modelStats(readGlbJson(f), statSync(f).size);
  expect(s.drawnTriangles).toBe(5678081);
  expect(s.materials).toBe(53);
  expect(s.extensionsUsed).toContain('KHR_materials_pbrSpecularGlossiness');
});
