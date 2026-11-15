// Arranque. La página abre en modo liviano (solo renders); Three.js y el modelo
// se descargan recién cuando la persona toca "Recorrer en 3D".
import { describeLoadError, groupViews } from './math.js';
import { initGallery } from './gallery.js';
import { initUI } from './ui.js';
import { initExterior } from './exterior.js';
import { initWalk } from './walk.js';

const BASE = import.meta.env.BASE_URL;
const $ = id => document.getElementById(id);
const loading = $('loading'), loadingText = $('loading-text'), loadingBar = $('loading-bar');

function showLoading(text) {
  loading.classList.remove('done', 'error');
  loadingBar.style.width = '0';
  loadingText.textContent = text;
}
function fail(err) {
  console.error(err);
  loading.classList.remove('done');
  loading.classList.add('error');
  loadingText.textContent = describeLoadError(err);
}

const getJson = url => fetch(url).then(r => {
  if (!r.ok) throw { kind: 'network', status: r.status };
  return r.json();
});

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

async function start() {
  const viewsData = await getJson(`${BASE}views.json`);
  const order = groupViews(viewsData).flatMap(g => g.items);
  const canvas = $('stage'), img = $('render');
  let app = null, entering = false;

  const exterior = initExterior($('orbit'), $('orbit-left'), img, $('orbit-hint'), {
    right: `${BASE}exterior/fachada-derecha.mp4`,
    // Sin clip izquierdo: el intento generado giró hacia el mismo lado (ver higgsfield/).
  });
  const gallery = initGallery(viewsData, img, () => ({ w: innerWidth, h: innerHeight }), (s, v) => {
    ui.setState(s, v);
    exterior.enable(v.id === 'fachada');     // solo la fachada tiene clip para rodearla
  }, BASE, initWalk($('walk'), img, BASE));

  async function enter3D() {
    if (app || entering) return;
    if (!hasWebGL()) return fail({ kind: 'webgl' });
    entering = true;
    const resume = gallery.current();
    exterior.enable(false);
    showLoading('Cargando el modelo 3D…');
    try {
      const { start3D } = await import('./app3d.js');
      gallery.stop();
      img.classList.remove('visible');
      app = await start3D({
        base: BASE, canvas, img, viewsData, order, getJson, ui,
        onProgress: f => { loadingBar.style.width = `${Math.round(f * 100)}%`; },
      });
    } catch (err) {
      entering = false;
      return fail(err);
    }
    document.body.classList.remove('gallery');
    ui.setState('free', null);
    loading.classList.add('done');
    if (resume) app.openView(resume.id);       // sigue en la misma vista, ahora con el modelo detrás
  }

  const ui = initUI(viewsData, {
    onView: id => { exterior.enable(false); app ? app.openView(id) : gallery.open(id); },
    onStep: dir => { exterior.enable(false); app ? app.step(dir) : gallery.step(dir); },
    onFloor: id => app?.selectFloor(id),
    onToggle: on => app?.toggleRender(on),
    onClose: () => app?.close(),
    onEnter3D: enter3D,
  });

  document.body.classList.add('gallery');
  addEventListener('resize', () => { if (!app) gallery.layout(); });
  const first = gallery.first();
  if (first) gallery.open(first.id);
  loading.classList.add('done');
}

start().catch(fail);
