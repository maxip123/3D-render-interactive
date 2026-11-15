// Selector de piso: corta los niveles superiores y propone una cámara cenital.
import { clipHeightFor, topDownPose } from './math.js';
import { PLANS, planBox } from './plans.js';

// Huella de un piso: la del plano calibrado, que es su contorno real; si no hay plano, la medida del modelo.
const footprint = (floors, id) => planBox(PLANS[id]) ?? floors[id].box;

export const FLOOR_OPTIONS = [
  { id: 'ALL', label: 'Todo' },
  { id: 'PB', label: 'PB' },
  { id: 'P1', label: '1.º piso' },
  { id: 'P2', label: '2.º piso' },
];

/**
 * @returns {{ select(id: string): {position:number[], target:number[]}, current(): string }}
 * `select` aplica el corte y devuelve la pose de cámara sugerida (quien llama la anima).
 */
export function initFloors(viewer, floors, onChange) {
  let current = 'ALL';
  const box = { min: viewer.bounds.min.toArray(), max: viewer.bounds.max.toArray() };
  return {
    current: () => current,
    select(id) {
      current = floors[id] ? id : 'ALL';
      viewer.setClipHeight(clipHeightFor(floors, current));
      onChange?.(current);
      if (current === 'ALL') {
        // Tres cuartos exterior sobre la huella del restaurante (no del contexto que lo rodea).
        const boxes = Object.keys(floors).map(id => footprint(floors, id));
        const union = {
          min: [Math.min(...boxes.map(b => b.min[0])), Math.min(...boxes.map(b => b.min[1]))],
          max: [Math.max(...boxes.map(b => b.max[0])), Math.max(...boxes.map(b => b.max[1]))],
        };
        const midY = Math.max(...Object.values(floors).map(f => f.clipY)) / 2;
        const top = topDownPose(box, { floorY: midY, box: union }, viewer.camera.aspect);
        const dist = Math.hypot(...top.position.map((v, i) => v - top.target[i])) * 1.2;
        const dir = [-0.3, 0.42, 0.86];
        return { position: top.target.map((v, i) => v + dir[i] * dist), target: top.target };
      }
      return topDownPose(box, { ...floors[current], box: footprint(floors, current) }, viewer.camera.aspect);
    },
  };
}
