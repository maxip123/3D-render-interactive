import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { readGlbJson } from './lib/glb.js';
import { buildViews } from './lib/views.js';

const optimized = 'web/public/model/entreaguas.glb';
const source = process.argv[2] ?? (existsSync(optimized) ? optimized : 'santiago mercado.glb');
const map = JSON.parse(readFileSync('tools/view-map.json', 'utf8'));
const views = buildViews(readGlbJson(source), map);
mkdirSync('web/public', { recursive: true });
writeFileSync('web/public/views.json', JSON.stringify(views, null, 2));
const missing = views.filter(v => !v.position).map(v => v.id);
console.log(`${views.length} vistas desde ${source}` + (missing.length ? ` — sin escena: ${missing.join(', ')}` : ''));
