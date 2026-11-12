export const LIMITS = { bytes: 20e6, drawnTriangles: 1.5e6, banned: 'KHR_materials_pbrSpecularGlossiness' };

/** Mide un GLB a partir de su JSON: peso, triángulos realmente dibujados, materiales. */
export function modelStats(gltf, byteLength) {
  const acc = gltf.accessors ?? [];
  const trisOf = mesh => mesh.primitives.reduce((sum, p) => {
    if ((p.mode ?? 4) !== 4) return sum;
    const count = p.indices !== undefined ? acc[p.indices].count : acc[p.attributes.POSITION].count;
    return sum + Math.floor(count / 3);
  }, 0);
  const meshTris = (gltf.meshes ?? []).map(trisOf);
  let drawnTriangles = 0;
  for (const node of gltf.nodes ?? []) {
    if (node.mesh === undefined) continue;
    const inst = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
    const copies = inst ? acc[Object.values(inst)[0]].count : 1;
    drawnTriangles += meshTris[node.mesh] * copies;
  }
  return {
    bytes: byteLength,
    drawnTriangles,
    materials: (gltf.materials ?? []).length,
    extensionsUsed: gltf.extensionsUsed ?? [],
  };
}

/** Lista de incumplimientos respecto de los límites del proyecto (vacía si cumple). */
export function checkStats(stats) {
  const out = [];
  if (stats.bytes >= LIMITS.bytes) out.push(`pesa ${(stats.bytes / 1e6).toFixed(1)} MB; el límite es 20 MB`);
  if (stats.drawnTriangles >= LIMITS.drawnTriangles) out.push(`dibuja ${stats.drawnTriangles} triángulos; el límite es 1 500 000`);
  if (stats.extensionsUsed.includes(LIMITS.banned)) out.push(`usa ${LIMITS.banned}, que el visor no lee`);
  return out;
}
