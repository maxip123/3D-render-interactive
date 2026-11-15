// Controles en pantalla. No toca la escena: solo dibuja y avisa por callbacks.
import { groupViews } from './math.js';
import { initMap, FLOOR_NAMES } from './map.js';
import { clipFor } from './walk.js';

const letterOf = view => view.id.split('-')[1]?.toUpperCase() ?? '';

/** Nombre legible de una vista: "Planta baja · vista A". */
export function viewLabel(view) {
  const letter = letterOf(view);
  return letter ? `${FLOOR_NAMES[view.floor]} · vista ${letter}` : FLOOR_NAMES[view.floor];
}

/**
 * @param handlers {{ onFloor(id), onView(id), onStep(dir: 1|-1), onToggle(showRender: boolean), onClose(), onEnter3D(), onExit3D() }}
 * @returns {{ setFloor(id), setState(state, view), setWalk(tramo|null) }}
 */
export function initUI(views, handlers, base = '/') {
  const $ = id => document.getElementById(id);
  const caption = $('caption'), toggle = $('toggle'), actions = $('view-actions'), hint = $('view-hint');
  const order = groupViews(views).flatMap(g => g.items);
  const walkable = view => {
    const i = order.indexOf(view);
    return !!(clipFor(view.id, order[i + 1]?.id) || clipFor(order[i - 1]?.id, view.id));
  };

  const map = initMap($('map'), views, base, { onView: handlers.onView, onFloor: handlers.onFloor, label: viewLabel });
  let state = 'free', view = null, cut = 'ALL';

  toggle.addEventListener('click', () => handlers.onToggle(state !== 'render'));
  $('close-view').addEventListener('click', () => handlers.onClose());
  $('enter-3d').addEventListener('click', () => handlers.onEnter3D());
  $('whole').addEventListener('click', () => handlers.onFloor('ALL'));
  $('exit-3d').addEventListener('click', () => handlers.onExit3D());
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') handlers.onStep(1);
    else if (e.key === 'ArrowLeft') handlers.onStep(-1);
  });

  function draw() {
    const gallery = document.body.classList.contains('gallery');
    const inView = state === 'render' || state === 'model';
    document.body.dataset.state = state;
    caption.hidden = false;
    map.setCurrent(state === 'free' ? null : view);

    $('view-floor').textContent = view ? FLOOR_NAMES[view.floor] : FLOOR_NAMES[cut] ?? 'Edificio completo';
    $('view-letter').textContent = view && letterOf(view) ? `Vista ${letterOf(view)}` : '';

    actions.hidden = gallery || !inView;
    toggle.textContent = state === 'render' ? 'Ver modelo' : 'Ver render';
    toggle.hidden = !view?.position;      // sin escena en el modelo no hay nada que alternar

    const tip = gallery
      ? (view?.floor === 'EXT' ? 'Arrastra para rodear la fachada' : view && walkable(view) ? 'Arrastra para caminar' : '')
      : state === 'free' ? 'Arrastra para girar · rueda o pellizco para acercar' : '';
    $('view-hint-text').textContent = tip;
    hint.hidden = !tip;
  }

  return {
    setFloor(id) { cut = id; map.setFloor(id); draw(); },
    setState(next, v) { state = next; view = v ?? null; draw(); },
    setWalk: leg => map.setWalk(leg),
  };
}
