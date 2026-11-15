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
  const inGallery = () => document.body.classList.contains('gallery');

  // El escenario es el área del canvas: todo menos el panel del mapa.
  const stageSize = () => { const r = canvas.getBoundingClientRect(); return { w: r.width, h: r.height }; };
  const exterior = initExterior($('orbit'), $('orbit-left'), img, {
    right: `${BASE}exterior/fachada-derecha.mp4`,
    // Sin clip izquierdo: el intento generado giró hacia el mismo lado (ver higgsfield/).
  });
  const walk = initWalk([$('walk-a'), $('walk-b')], $('pad'), BASE);
  const gallery = initGallery(viewsData, img, stageSize, (s, v) => {
    ui.setState(s, v);
    exterior.enable(v.id === 'fachada');     // solo la fachada tiene clip para rodearla
  }, BASE, walk, leg => ui.setWalk(leg));

  async function enter3D() {
    if (entering || !inGallery()) return;
    const resume = gallery.current();
    exterior.enable(false);
    if (app) {                                  // ya estaba cargado: se retoma sin esperar
      gallery.stop();
      img.classList.remove('visible');
      document.body.classList.remove('gallery');
      app.run(true);
      ui.setState('free', null);
      if (resume) app.openView(resume.id);
      return;
    }
    if (!hasWebGL()) return fail({ kind: 'webgl' });
    entering = true;
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
    entering = false;
    document.body.classList.remove('gallery');
    ui.setState('free', null);
    loading.classList.add('done');
    if (resume) app.openView(resume.id);       // sigue en la misma vista, ahora con el modelo detrás
  }

  // Vuelve del 3D al recorrido guiado por los renders, en la vista que estaba abierta.
  function exit3D() {
    if (!app || inGallery()) return;
    const resume = app.current() ?? gallery.current() ?? gallery.first();
    app.run(false);
    img.classList.remove('visible');
    document.body.classList.add('gallery');
    ui.setFloor('ALL');
    gallery.start(resume.id);
  }

  // En la galería, salir de la vista actual apaga el clip de la fachada antes del fundido.
  const leave = id => { if (id !== gallery.current()?.id) exterior.enable(false); };
  const ui = initUI(viewsData, {
    onView: id => { if (!inGallery()) return app.openView(id); leave(id); gallery.go(id); },
    onStep: dir => { if (!inGallery()) return app.step(dir); leave(null); gallery.step(dir); },
    onFloor: id => {
      if (!inGallery()) return app.selectFloor(id);
      const first = order.find(v => v.floor === id);
      if (first && gallery.current()?.floor !== id) { leave(first.id); gallery.go(first.id); }
    },
    onToggle: on => app?.toggleRender(on),
    onClose: () => app?.close(),
    onEnter3D: enter3D,
    onExit3D: exit3D,
  }, BASE);

  document.body.classList.add('gallery');
  addEventListener('resize', () => { if (inGallery()) gallery.layout(); });
  const first = gallery.first();
  if (first) gallery.open(first.id);
  loading.classList.add('done');
}

start().catch(fail);
