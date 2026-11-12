import { applyRoot, applyRootQuat, rootMatrixOf } from './glb.js';

/**
 * Cruza el mapa escena->render con los nodos de escena del GLB.
 * @returns {Array<{id,scene,floor,render,position,quaternion,fov}>}
 */
export function buildViews(gltf, viewMap) {
  const root = rootMatrixOf(gltf);
  const byName = new Map(gltf.nodes.filter(n => n.name).map(n => [n.name, n]));
  return viewMap.map(entry => {
    const node = entry.scene ? byName.get(entry.scene) : undefined;
    return {
      id: entry.id,
      scene: node ? entry.scene : null,
      floor: entry.floor,
      render: entry.render ?? null,
      position: node ? applyRoot(root, node.translation ?? [0, 0, 0]) : null,
      quaternion: node ? applyRootQuat(root, node.rotation ?? [0, 0, 0, 1]) : null,
      fov: entry.fov,
    };
  });
}
