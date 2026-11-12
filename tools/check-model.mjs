import { statSync } from 'node:fs';
import { readGlbJson } from './lib/glb.js';
import { modelStats, checkStats } from './lib/stats.js';

const file = process.argv[2] ?? 'web/public/model/entreaguas.glb';
const stats = modelStats(readGlbJson(file), statSync(file).size);
console.log(`${file}: ${(stats.bytes / 1e6).toFixed(1)} MB, ${stats.drawnTriangles} triángulos, ${stats.materials} materiales, extensiones: ${stats.extensionsUsed.join(', ') || 'ninguna'}`);
const problems = checkStats(stats);
for (const p of problems) console.error('INCUMPLE: ' + p);
process.exit(problems.length ? 1 : 0);
