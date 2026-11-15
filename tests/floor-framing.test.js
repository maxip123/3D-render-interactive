import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { topDownPose, FREE_FOV } from '../web/src/math.js';
import { PLANS, planBox } from '../web/src/plans.js';

const floors = JSON.parse(readFileSync('web/public/floors.json', 'utf8'));
const bounds = { min: [100, -5, -60], max: [180, 15, -20] };

/** Dónde caen en pantalla (−1..1) las esquinas del plano con la cámara que propone topDownPose. */
function cornersOnScreen(id, aspect) {
  const box = planBox(PLANS[id]);
  const pose = topDownPose(bounds, { ...floors[id], box }, aspect);
  const cam = new THREE.PerspectiveCamera(FREE_FOV, aspect, 0.1, 500);
  cam.position.fromArray(pose.position);
  cam.lookAt(...pose.target);
  cam.updateMatrixWorld();
  const y = floors[id].floorY;
  return [[box.min[0], box.min[1]], [box.max[0], box.min[1]], [box.min[0], box.max[1]], [box.max[0], box.max[1]]]
    .map(([x, z]) => new THREE.Vector3(x, y, z).project(cam));
}

describe('encuadre de cada piso en 3D', () => {
  it('la huella de un plano va de su borde izquierdo al derecho y de arriba abajo', () => {
    const b = planBox(PLANS.P1);
    expect(b.min).toEqual([122.2, -39.9]);
    expect(b.max[0]).toBeCloseTo(151.73);
    expect(b.max[1]).toBeCloseTo(-39.9 + 29.53 * 610 / 2400);
  });

  for (const id of ['PB', 'P1', 'P2']) {
    for (const aspect of [1.15, 1.7]) {
      it(`${id} entra entero en pantalla (proporción ${aspect})`, () => {
        for (const p of cornersOnScreen(id, aspect)) {
          expect(Math.abs(p.x)).toBeLessThan(0.98);
          expect(Math.abs(p.y)).toBeLessThan(0.98);
        }
      });
    }
  }
});
