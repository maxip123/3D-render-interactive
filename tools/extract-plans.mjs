// Extrae el plano de cada PDF y lo guarda como WebP con transparencia para el
// mapa de la web. LayOut exporta, por archivo, una sola imagen RGB comprimida
// con Flate. El fondo (negro o blanco, conectado al borde) se vuelve
// transparente y el plano sale recortado a su contorno.
// Uso: node tools/extract-plans.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const PLANS = [
  { id: 'pb', pdf: 'PB.pdf' },
  { id: 'p1', pdf: 'PA.pdf' },
  { id: 'p2', pdf: 'PA1.pdf' },
];
const OUT = 'web/public/planos', WORK_WIDTH = 2400;

/** Imagen del plano dentro del PDF: { width, height, rgb }. */
export function readPlanImage(path) {
  const buf = readFileSync(path);
  const head = buf.toString('latin1', 0, 4096);
  const m = /<<\/Subtype\/Image\/Width (\d+)\/Height (\d+)[^>]*\/Filter\/FlateDecode\/Length (\d+)>>\s*stream\r?\n/.exec(head);
  if (!m) throw new Error(`${path}: no se encontró la imagen del plano`);
  const width = Number(m[1]), height = Number(m[2]);
  const start = m.index + m[0].length;
  const rgb = inflateSync(buf.subarray(start, start + Number(m[3])));
  if (rgb.length !== width * height * 3) throw new Error(`${path}: la imagen no es RGB de 8 bits`);
  return { width, height, rgb };
}

/**
 * Máscara de opacidad (0 o 255 por píxel): transparente el fondo casi negro o
 * casi blanco que está conectado con el borde de la imagen; opaco el resto.
 */
export function backgroundMatte(rgb, width, height, dark = 14, light = 238) {
  const isBg = i => {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    return Math.max(r, g, b) <= dark || Math.min(r, g, b) >= light;
  };
  const alpha = new Uint8Array(width * height).fill(255);
  const stack = [];
  const visit = i => { if (alpha[i] && isBg(i)) { alpha[i] = 0; stack.push(i); } };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < width * (height - 1)) visit(i + width);
  }
  return alpha;
}

/** Caja que encierra los píxeles opacos de la máscara. */
export function alphaBox(alpha, width, height) {
  let x0 = width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!alpha[row + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(OUT, { recursive: true });
  for (const { id, pdf } of PLANS) {
    const { width, height, rgb } = readPlanImage(pdf);
    const { data, info } = await sharp(rgb, { raw: { width, height, channels: 3 }, limitInputPixels: false })
      .resize({ width: WORK_WIDTH }).raw().toBuffer({ resolveWithObject: true });
    const alpha = backgroundMatte(data, info.width, info.height);
    const box = alphaBox(alpha, info.width, info.height);
    // RGBA ya recortado, armado a mano: sharp aplica extract antes que joinChannel y los desalinea.
    const rgba = Buffer.alloc(box.width * box.height * 4);
    for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
      const src = (y + box.top) * info.width + x + box.left, dst = (y * box.width + x) * 4;
      rgba[dst] = data[src * 3]; rgba[dst + 1] = data[src * 3 + 1]; rgba[dst + 2] = data[src * 3 + 2]; rgba[dst + 3] = alpha[src];
    }
    const out = await sharp(rgba, { raw: { width: box.width, height: box.height, channels: 4 } })
      .webp({ quality: 80, alphaQuality: 90 })
      .toFile(`${OUT}/${id}.webp`);
    console.log(`${pdf} ${width}x${height} -> ${id}.webp ${out.width}x${out.height} (${Math.round(out.size / 1024)} kB)`);
  }
}
