// Modo 3D completo. Se descarga solo cuando la persona lo pide (import dinámico),
// junto con Three.js y el modelo.
import * as THREE from 'three';
import { createViewer } from './scene.js';
import { initFloors } from './floors.js';
import { initViews } from './views.js';
import { watchQuality } from './quality.js';

/**
 * @returns {Promise<{ openView(id), step(dir), selectFloor(id), toggleRender(on), close(), current(): object|null, run(on: boolean) }>}
 */
export async function start3D({ base, canvas, img, viewsData, order, getJson, onProgress, ui }) {
  const [viewer, floorsData] = await Promise.all([
    createViewer(canvas, { modelUrl: `${base}model/entreaguas.glb`, onProgress }),
    getJson(`${base}floors.json`),
  ]);

  const floors = initFloors(viewer, floorsData, id => ui.setFloor(id));
  const views = initViews(viewer, viewsData, img, (state, view) => ui.setState(state, view));

  const home = floors.select('ALL');
  viewer.camera.position.fromArray(home.position);
  viewer.controls.target.fromArray(home.target);
  const quality = watchQuality(viewer, () => views.state() === 'flying');

  if (import.meta.env.DEV) {
    Object.assign(window, { __viewer: viewer, __views: views, __floors: floors, __quality: quality, THREE });
    if (new URLSearchParams(location.search).has('calibrar')) calibrate(views);
  }

  // Las vistas interiores necesitan el edificio sin cortar.
  const openView = id => { floors.select('ALL'); views.open(id); };
  return {
    openView,
    step(dir) {
      const i = order.indexOf(views.current());
      if (i >= 0) openView(order[(i + dir + order.length) % order.length].id);
    },
    selectFloor: id => views.flyTo(floors.select(id)),
    toggleRender: on => views.showRender(on),
    close: () => views.flyTo(floors.select(floors.current())),
    current: () => views.current(),
    run: on => viewer.run(on),
  };
}

/** Modo de ajuste (solo desarrollo): render al 50 % y teclas [ ] para cambiar el fov de la vista abierta. */
function calibrate(views) {
  document.body.classList.add('calibrar');
  const badge = document.createElement('output');
  badge.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:4px 10px;z-index:20;font:14px monospace';
  document.body.append(badge);
  addEventListener('keydown', e => {
    const v = views.current();
    if (!v || (e.key !== '[' && e.key !== ']')) return;
    views.setFov(+(v.fov + (e.key === ']' ? 0.5 : -0.5)).toFixed(1));
    badge.textContent = `${v.id}  fov ${v.fov}`;
  });
}
