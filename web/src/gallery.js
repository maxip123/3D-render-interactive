// Modo liviano: recorre los renders originales sin cargar el modelo 3D.
import { fitRect, renderBox, groupViews } from './math.js';
import { clipFor } from './walk.js';

const MARGIN = 76;                         // misma franja para controles que usa el modo 3D

/**
 * @param views     contenido de views.json
 * @param img       <img> donde se muestra el render
 * @param viewport  () => ({ w, h }) tamaño actual de la pantalla
 * @param onState   (state: 'render', view) => void
 * @param base      prefijo de rutas del sitio
 * @param walk      recorrido con clips entre vistas (initWalk), opcional
 * @returns {{ open(id), step(dir: 1|-1), current(): object|null, first(): object|null, layout(), stop() }}
 */
export function initGallery(views, img, viewport, onState, base = '/', walk = null) {
  const order = groupViews(views).flatMap(g => g.items);
  let current = null, active = true;
  const after = view => order[(order.indexOf(view) + 1) % order.length];

  const layout = () => {
    if (!img.naturalWidth) return;
    const { w, h } = viewport();
    const box = renderBox(w, h, MARGIN);
    const r = fitRect(img.naturalWidth, img.naturalHeight, box.w, box.h);
    Object.assign(img.style, { left: `${box.x + r.x}px`, top: `${box.y + r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  };

  // seamless: el clip ya terminó en este render, así que se cambia sin fundido.
  function open(id, seamless = false) {
    const view = order.find(v => v.id === id);
    if (!view || !active) return;
    if (!seamless) walk?.cancel();
    current = view;
    if (!seamless) img.classList.remove('visible');
    img.onload = () => {
      if (current !== view || !active) return;
      layout();
      img.classList.add('visible');
      walk?.hide();
      onState?.('render', view);
      walk?.preload(clipFor(view.id, after(view).id));
    };
    img.alt = `Render original: ${view.id}`;
    img.src = `${base}renders/${view.render}`;
  }

  return {
    open: id => open(id), layout,
    step(dir) {
      if (!current) return;
      walk?.finish();                                   // tocar de nuevo saltea el clip en curso
      const next = order[(order.indexOf(current) + dir + order.length) % order.length];
      const clip = dir === 1 ? clipFor(current.id, next.id) : null;
      if (clip && walk?.play(clip, () => open(next.id, true))) {
        current = next;
        onState?.('render', next);
      } else open(next.id);
    },
    current: () => current,
    first: () => order[0] ?? null,
    stop() { active = false; img.onload = null; walk?.cancel(); },   // el modo 3D toma el control de la imagen
  };
}
