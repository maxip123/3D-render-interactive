// Convierte el GLB del arquitecto en un GLB liviano para la web.
import { mkdirSync, statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, dedup, instance, weld, compactPrimitive, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { surfaceFor } from './lib/materials.js';

const SRC = process.argv[2] ?? 'santiago mercado.glb';
const OUT = 'web/public/model/entreaguas.glb';
const DENSE = 5000;                 // piezas simplificadas: se reducen a RATIO
const MEDIUM = 1500;                // piezas medianas: se reducen a MEDIUM_RATIO
const MEDIUM_RATIO = Number(process.env.MEDIUM_RATIO ?? 0.45);
const RATIO = Number(process.env.RATIO ?? 0.15);
const ERROR = Number(process.env.ERROR ?? 0.004);
const CHAIR_RATIO = Number(process.env.CHAIR_RATIO ?? RATIO);
const CHAIRS = /Cherry Highgloss|Sollos_Cadeira/;

await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const t0 = Date.now();
const step = name => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${name}`);
const doc = await io.read(SRC);

step('materiales a metal/rugosidad'); await doc.transform(metalRough());
step('acabados por material');
for (const ext of doc.getRoot().listExtensionsUsed()) if (/KHR_materials_(specular|ior)/.test(ext.extensionName)) ext.dispose();
for (const mat of doc.getRoot().listMaterials()) {
  const { metallic, roughness } = surfaceFor(mat.getName());
  mat.setMetallicFactor(metallic).setRoughnessFactor(roughness);
}
// Una de las texturas de la silla gris es una grilla de prueba de UV que quedó
// en el componente original; en los renders esa parte es tela gris.
for (const mat of doc.getRoot().listMaterials()) {
  if (/Munick.*Tecido Cinza_6/.test(mat.getName())) mat.setBaseColorTexture(null).setBaseColorFactor([0.33, 0.35, 0.37, 1]);
}
// Las piezas sin material y con volumen redondeado son los bultos de vegetación
// del modelo (en SketchUp están en blanco); el resto queda blanco (luminarias, marcos).
const plant = doc.createMaterial('Vegetación').setBaseColorFactor([0.13, 0.26, 0.09, 1]).setRoughnessFactor(0.9).setMetallicFactor(0).setDoubleSided(true);
const white = doc.createMaterial('Blanco').setBaseColorFactor([0.85, 0.83, 0.8, 1]).setRoughnessFactor(0.6).setMetallicFactor(0).setDoubleSided(true);
let plants = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  if (prim.getMaterial()) continue;
  const pos = prim.getAttribute('POSITION'), min = pos.getMin([]), max = pos.getMax([]);
  const dims = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const tris = prim.getIndices().getCount() / 3;
  if (process.env.DEBUG_PLANTS) console.log(tris, dims.map(d => d.toFixed(2)).join(' x '));
  // Medidas locales en pulgadas (unidad interna de SketchUp).
  const isPlant = tris >= 150 && Math.min(...dims) >= 12 && Math.max(...dims) >= 24 && Math.max(...dims) <= 260;
  prim.setMaterial(isPlant ? plant : white);
  if (isPlant) plants++;
}
console.log(`  ${plants} volúmenes de vegetación`);

step('duplicados');                    await doc.transform(dedup());
step('soldar vértices');               await doc.transform(weld());

// SketchUp exporta cada cara con normales y coordenadas de textura propias, así
// que casi toda arista es una "costura" y el simplificador normal no colapsa
// nada. El modo Permissive permite colapsar a través de esas costuras
// conservando los vértices originales (y con ellos su textura).
step('simplificar mallas densas');
let before = 0, after = 0, count = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices();
    if (!idx || idx.getCount() / 3 < MEDIUM) continue;
    const name = prim.getMaterial()?.getName() ?? '';
    const ratio = idx.getCount() / 3 < DENSE ? MEDIUM_RATIO : CHAIRS.test(name) ? CHAIR_RATIO : RATIO;
    const indices = new Uint32Array(idx.getArray());
    const positions = new Float32Array(prim.getAttribute('POSITION').getArray());
    const target = Math.floor(indices.length * ratio / 3) * 3;
    const [out] = MeshoptSimplifier.simplify(indices, positions, 3, target, ERROR, ['Permissive']);
    idx.setArray(out);
    compactPrimitive(prim);
    before += indices.length / 3; after += out.length / 3; count++;
  }
}
console.log(`  ${count} piezas simplificadas: ${before} -> ${after} triángulos (sin contar repeticiones)`);

step('duplicados e instancias');       await doc.transform(dedup(), instance({ min: 3 }));
step('limpieza');                      await doc.transform(prune({ keepLeaves: true }));
step('texturas a WebP 2048');          await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048] }));
step('compresión Meshopt');            await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

mkdirSync('web/public/model', { recursive: true });
await io.write(OUT, doc);
step(`listo: ${OUT} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
