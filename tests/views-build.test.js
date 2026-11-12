import { test, expect } from 'vitest';
import { buildViews } from '../tools/lib/views.js';

const ROOT = [1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1];
const gltf = {
  scenes: [{ nodes: [0] }],
  nodes: [
    { matrix: ROOT, children: [1, 2] },
    { name: 'PB-Vista 1', translation: [136.08, 34.02, 1.5], rotation: [0, 0, 0, 1] },
    { name: 'Otra', translation: [1, 2, 3] },
  ],
};
const map = [
  { id: 'pb-a', scene: 'PB-Vista 1', floor: 'PB', render: 'pb-a.jpg', fov: 60 },
  { id: 'p1-a', scene: 'No existe', floor: 'P1', render: 'p1-a.jpg', fov: 55 },
  { id: 'x', scene: 'Otra', floor: 'P2', fov: 60 },
];

test('vista con escena existente trae posición convertida', () => {
  const v = buildViews(gltf, map)[0];
  expect(v.position[0]).toBeCloseTo(136.08);
  expect(v.position[1]).toBeCloseTo(1.5);
  expect(v.position[2]).toBeCloseTo(-34.02);
  expect(v.quaternion).toHaveLength(4);
  expect(v).toMatchObject({ id: 'pb-a', scene: 'PB-Vista 1', floor: 'PB', render: 'pb-a.jpg', fov: 60 });
});

test('escena inexistente deja position y quaternion en null, conserva render', () => {
  const v = buildViews(gltf, map)[1];
  expect(v.position).toBeNull();
  expect(v.quaternion).toBeNull();
  expect(v.scene).toBeNull();
  expect(v.render).toBe('p1-a.jpg');
});

test('entrada sin render deja render null y no lanza', () => {
  const v = buildViews(gltf, map)[2];
  expect(v.render).toBeNull();
  expect(v.position[1]).toBeCloseTo(3);
});

test('nodo sin rotación usa la identidad', () => {
  expect(buildViews(gltf, map)[2].quaternion).toHaveLength(4);
});

test('devuelve una View por entrada del mapa, en el mismo orden', () => {
  expect(buildViews(gltf, map).map(v => v.id)).toEqual(['pb-a', 'p1-a', 'x']);
});

import { existsSync, readFileSync } from 'node:fs';
import { readGlbJson } from '../tools/lib/glb.js';

test.skipIf(!existsSync('web/public/model/entreaguas.glb'))(
  'el GLB optimizado conserva las cámaras de escena del original', () => {
    const map = JSON.parse(readFileSync('tools/view-map.json', 'utf8'));
    const a = buildViews(readGlbJson('santiago mercado.glb'), map);
    const b = buildViews(readGlbJson('web/public/model/entreaguas.glb'), map);
    for (let i = 0; i < a.length; i++) {
      expect(b[i].position, a[i].id).not.toBeNull();
      for (let k = 0; k < 3; k++) expect(b[i].position[k]).toBeCloseTo(a[i].position[k], 3);
      const dot = Math.abs(a[i].quaternion.reduce((s, v, k) => s + v * b[i].quaternion[k], 0));
      expect(dot).toBeCloseTo(1, 4);
    }
  });
