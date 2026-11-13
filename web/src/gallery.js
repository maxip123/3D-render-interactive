// Modo liviano: recorre los renders originales sin cargar el modelo 3D.
import { fitRect, renderBox, groupViews } from './math.js';

const MARGIN = 76;                         // misma franja para controles que usa el modo 3D

/**
 * @param views     contenido de views.json
 * @param img       <img> donde se muestra el render
 * @param viewport  () => ({ w, h }) tamaño actual de la pantalla
 * @param onState   (state: 'render', view) => void
 * @param base      prefijo de rutas del sitio
 * @returns {{ open(id), step(dir: 1|-1), current(): object|null, first(): object|null, layout(), stop() }}
 */
export function initGallery(views, img, viewport, onState, base = '/') {
  const order = groupViews(views).flatMap(g => g.items);
  let current = null, active = true;

  const layout = () => {
    if (!img.naturalWidth) return;
    const { w, h } = viewport();
    const box = renderBox(w, h, MARGIN);
    const r = fitRect(img.naturalWidth, img.naturalHeight, box.w, box.h);
    Object.assign(img.style, { left: `${box.x + r.x}px`, top: `${box.y + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  };

  function open(id) {
    const view = order.find(v => v.id === id);
    if (!view || !active) return;
    current = view;
    img.classList.remove('visible');
    img.onload = () => {
      if (current !== view || !active) return;
      layout();
      img.classList.add('visible');
      onState?.('render', view);
    };
    img.alt = `Render original: ${view.id}`;
    img.src = `${base}renders/${view.render}`;
  }

  return {
    open, layout,
    step(dir) {
      if (!current) return;
      const i = order.indexOf(current);
      open(order[(i + dir + order.length) % order.length].id);
    },
    current: () => current,
    first: () => order[0] ?? null,
    stop() { active = false; img.onload = null; },   // el modo 3D toma el control de la imagen
  };
}
