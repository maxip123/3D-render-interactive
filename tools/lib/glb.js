import { openSync, readSync, closeSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';

/** Devuelve el bloque JSON de un archivo .glb sin cargar el binario. */
export function readGlbJson(path) {
  const fd = openSync(path, 'r');
  try {
    const head = Buffer.alloc(20);
    readSync(fd, head, 0, 20, 0);
    if (head.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${path} no es un GLB`);
    const len = head.readUInt32LE(12);
    const body = Buffer.alloc(len);
    readSync(fd, body, 0, len, 20);
    return JSON.parse(body.toString('utf8'));
  } finally {
    closeSync(fd);
  }
}

/** Transforma un punto por una matriz glTF (column-major). */
export function applyRoot(rootMatrix, p) {
  const v = new Vector3(...p).applyMatrix4(new Matrix4().fromArray(rootMatrix));
  return [v.x, v.y, v.z];
}

/** Compone la rotación de la matriz raíz con un cuaternión local [x,y,z,w]. */
export function applyRootQuat(rootMatrix, q) {
  const rootQ = new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(rootMatrix));
  const out = rootQ.multiply(new Quaternion(...q)).normalize();
  return [out.x, out.y, out.z, out.w];
}

const IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

/** Matriz del primer nodo raíz de la escena (identidad si no tiene). */
export function rootMatrixOf(gltf) {
  const root = gltf.nodes[gltf.scenes[0].nodes[0]];
  return root.matrix ?? IDENTITY;
}
