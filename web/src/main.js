import * as THREE from 'three';
import { createViewer, hasWebGL } from './scene.js';
import { describeLoadError, groupViews } from './math.js';
import { initFloors } from './floors.js';
import { initViews } from './views.js';
import { initUI } from './ui.js';
import { watchQuality } from './quality.js';

const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const loadingBar = document.getElementById('loading-bar');

function fail(err) {
  loading.classList.add('error');
  loadingText.textContent = describeLoadError(err);
}

const getJson = url => fetch(url).then(r => {
  if (!r.ok) throw { kind: 'network', status: r.status };
  return r.json();
});

async function start() {
  if (!hasWebGL()) return fail({ kind: 'webgl' });
  let viewer, floorsData, viewsData;
  try {
    [viewer, floorsData, viewsData] = await Promise.all([
      createViewer(document.getElementById('stage'), {
        modelUrl: '/model/entreaguas.glb',
        onProgress: f => { loadingBar.style.width = `${Math.round(f * 100)}%`; },
      }),
      getJson('/floors.json'),
      getJson('/views.json'),
    ]);
  } catch (err) {
    console.error(err);
    return fail(err);
  }

  let ui;
  const floors = initFloors(viewer, floorsData, id => ui?.setFloor(id));
  const views = initViews(viewer, viewsData, document.getElementById('render'), (state, view) => ui?.setState(state, view));
  ui = initUI(viewsData, {
    onFloor: id => views.flyTo(floors.select(id)),
    // Las vistas interiores necesitan el edificio sin cortar.
    onView: id => { floors.select('ALL'); views.open(id); },
    onStep: dir => {
      const order = groupViews(viewsData).flatMap(g => g.items);
      const i = order.indexOf(views.current());
      if (i >= 0) views.open(order[(i + dir + order.length) % order.length].id);
    },
    onToggle: showRender => views.showRender(showRender),
    onClose: () => views.flyTo(floors.select(floors.current())),
  });

  const home = floors.select('ALL');
  viewer.camera.position.fromArray(home.position);
  viewer.controls.target.fromArray(home.target);
  const quality = watchQuality(viewer, () => views.state() === 'flying');
  loading.classList.add('done');

  if (new URLSearchParams(location.search).has('calibrar')) calibrate(views);
  if (import.meta.env.DEV) Object.assign(window, { __viewer: viewer, __views: views, __floors: floors, __quality: quality, THREE });
}

/** Modo de ajuste: render al 50 % y teclas [ ] para cambiar el campo de visión de la vista abierta. */
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

start();
