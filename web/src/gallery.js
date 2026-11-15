// Modo liviano: recorre los renders originales sin cargar el modelo 3D.
import { fitRect, renderBox, groupViews, stageMargin, stageGutter } from './math.js';
import { frameRender } from './frame.js';
import { clipFor } from './walk.js';

/**
 * @param views     contenido de views.json
 * @param img       <img> donde se muestra el render
 * @param viewport  () => ({ w, h }) tamaño actual del escenario
 * @param onState   (state: 'render', view) => void
 * @param base      prefijo de rutas del sitio
 * @param walk      recorrido con clips entre vistas (initWalk), opcional
 * @param onWalk    (tramo: [desdeId, hastaId, avance 0..1] | null) => void, mientras se camina
 * @returns {{ open(id), go(id), step(dir: 1|-1), current(): object|null, first(): object|null, layout(), stop(), start(id) }}
 */
export function initGallery(views, img, viewport, onState, base = '/', walk = null, onWalk = null) {
  const order = groupViews(views).flatMap(g => g.items);
  let current = null, active = true;
  const beside = (view, dir) => order[order.indexOf(view) + dir] ?? null;

  const layout = () => {
    if (!img.naturalWidth) return;
    const { w, h } = viewport();
    const box = renderBox(w, h, stageMargin(w), stageGutter(w));
    const r = fitRect(img.naturalWidth, img.naturalHeight, box.w, box.h);
    frameRender(img, { x: box.x + r.x, y: box.y + r.y, w: r.w, h: r.h });
  };

  // Deja lista la vista para caminar hacia sus vecinas del mismo piso.
  function arm(view) {
    const nx = beside(view, 1), pv = beside(view, -1);
    walk?.arm(clipFor(view.id, nx?.id), clipFor(pv?.id, view.id), {
      progress: d => onWalk?.(d > 0 ? [view.id, nx.id, d] : d < 0 ? [pv.id, view.id, 1 + d] : null),
      commit: dir => {
        current = dir > 0 ? nx : pv;
        onState?.('render', current);
        open(current.id, true);
      },
    });
  }

  // seamless: un clip terminó en este render, así que se cambia sin fundido.
  function open(id, seamless = false) {
    const view = order.find(v => v.id === id);
    if (!view || !active) return;
    if (!seamless) { walk?.arm(null, null, null); img.classList.remove('visible'); }
    current = view;
    img.onload = () => {
      if (current !== view || !active) return;
      layout();
      img.classList.add('visible');
      onState?.('render', view);
      arm(view);
    };
    img.alt = `Render original: ${view.id}`;
    img.src = `${base}renders/${view.render}`;
  }

  // Va a una vista; si es la siguiente del piso, camina hasta ella.
  function go(id) {
    walk?.finish();                                     // si iba caminando, llega ya
    if (!current || id === current.id) return current ? undefined : open(id);
    if (beside(current, 1)?.id === id && walk?.advance()) return;
    open(id);
  }

  return {
    open: id => open(id), go, layout,
    step(dir) {
      if (!current) return;
      go(order[(order.indexOf(current) + dir + order.length) % order.length].id);
    },
    current: () => current,
    first: () => order[0] ?? null,
    stop() { active = false; img.onload = null; walk?.arm(null, null, null); },   // el modo 3D toma el control de la imagen
    start(id) { active = true; open(id); },                                         // y al salir del 3D se lo devuelve
  };
}
