// Mide la altura de cada piso a partir de las mallas con material de piso.
import { writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const FLOOR = /Flooring Parquet|Tiles Simple 03|Tiles L02/;
const HEADROOM = Number(process.env.HEADROOM ?? 2.3);   // el corte pasa sobre los muebles y bajo el cielorraso
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('santiago mercado.glb');
const bands = new Map();
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    if (!FLOOR.test(prim.getMaterial()?.getName() ?? '')) continue;
    const pos = prim.getAttribute('POSITION'), min = pos.getMin([]), max = pos.getMax([]);
    let lo = Infinity, hi = -Infinity; const xs = [], zs = [];
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
      const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
      lo = Math.min(lo, wy); hi = Math.max(hi, wy);
      xs.push(m[0] * x + m[4] * y + m[8] * z + m[12]); zs.push(m[2] * x + m[6] * y + m[10] * z + m[14]);
    }
    if (hi - lo > 0.5) continue;                       // no es una losa horizontal
    const key = Math.round(hi * 2) / 2;                // bandas de 0,5 m
    const b = bands.get(key) ?? { n: 0, top: -Infinity, tris: 0, min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
    b.min = [Math.min(b.min[0], ...xs), Math.min(b.min[1], ...zs)]; b.max = [Math.max(b.max[0], ...xs), Math.max(b.max[1], ...zs)];
    b.n++; b.top = Math.max(b.top, hi); b.tris += prim.getIndices().getCount() / 3;
    bands.set(key, b);
  }
}
const sorted = [...bands.entries()].sort((a, b) => a[0] - b[0]);
for (const [k, b] of sorted) console.log(`banda ${k} m: ${b.n} piezas, tope ${b.top.toFixed(2)} m`);
if (process.argv.includes('--write')) {
  const tops = sorted.map(([, b]) => b.top), boxes = sorted.map(([, b]) => ({ min: b.min.map(v => +v.toFixed(2)), max: b.max.map(v => +v.toFixed(2)) }));
  if (tops.length !== 3) throw new Error(`se esperaban 3 pisos y hay ${tops.length} bandas; revisar a mano`);
  const floors = Object.fromEntries(['PB', 'P1', 'P2'].map((id, i) => [id, { floorY: +tops[i].toFixed(2), clipY: +(tops[i] + HEADROOM).toFixed(2), box: boxes[i] }]));
  const json = JSON.stringify(floors, null, 2);
  writeFileSync('tools/floors.json', json); writeFileSync('web/public/floors.json', json);
  console.log(json);
}
