// Miniaturas de los renders para la tira de vistas.
import { readdirSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
const dir = 'web/public/renders';
mkdirSync(`${dir}/thumbs`, { recursive: true });
for (const f of readdirSync(dir).filter(f => f.endsWith('.jpg'))) {
  await sharp(`${dir}/${f}`).resize(320).jpeg({ quality: 72 }).toFile(`${dir}/thumbs/${f}`);
}
console.log('miniaturas listas');
