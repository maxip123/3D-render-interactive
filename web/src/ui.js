// Controles en pantalla. No toca la escena: solo dibuja y avisa por callbacks.
import { groupViews } from './math.js';
import { FLOOR_OPTIONS } from './floors.js';

const FLOOR_TITLES = { EXT: 'Fachada', PB: 'Planta baja', P1: '1.º piso', P2: '2.º piso' };
const LETTERS = { a: 'A', b: 'B', c: 'C', d: 'D' };

/** Nombre legible de una vista: "Planta baja · vista A". */
export function viewLabel(view) {
  const letter = LETTERS[view.id.split('-')[1]];
  return letter ? `${FLOOR_TITLES[view.floor]} · vista ${letter}` : FLOOR_TITLES[view.floor];
}

/**
 * @param handlers {{ onFloor(id), onView(id), onToggle(showRender: boolean), onClose() }}
 * @returns {{ setFloor(id), setState(state, view) }}
 */
export function initUI(views, handlers) {
  const $ = id => document.getElementById(id);
  const floors = $('floors'), strip = $('strip'), bar = $('view-bar'), toggle = $('toggle'), hint = $('hint');

  for (const opt of FLOOR_OPTIONS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = opt.label; b.dataset.floor = opt.id;
    b.setAttribute('aria-pressed', String(opt.id === 'ALL'));
    b.addEventListener('click', () => handlers.onFloor(opt.id));
    floors.append(b);
  }

  for (const group of groupViews(views)) {
    const section = document.createElement('section');
    const h = document.createElement('h2'); h.textContent = FLOOR_TITLES[group.floor];
    const row = document.createElement('div'); row.className = 'row';
    for (const view of group.items) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.view = view.id; b.title = viewLabel(view);
      const img = document.createElement('img');
      img.src = `/renders/thumbs/${view.render}`; img.alt = viewLabel(view); img.loading = 'lazy';
      b.append(img);
      b.addEventListener('click', () => handlers.onView(view.id));
      row.append(b);
    }
    section.append(h, row); strip.append(section);
  }

  toggle.addEventListener('click', () => handlers.onToggle(toggle.getAttribute('aria-pressed') !== 'true'));
  $('close-view').addEventListener('click', () => handlers.onClose());
  const dismissHint = () => hint.classList.add('gone');
  $('stage').addEventListener('pointerdown', dismissHint, { once: true });

  for (const id of ['top', 'strip', 'hint']) $(id).hidden = false;

  return {
    setFloor(id) {
      for (const b of floors.children) b.setAttribute('aria-pressed', String(b.dataset.floor === id));
    },
    setState(state, view) {
      const inView = state === 'render' || state === 'model';
      bar.hidden = !inView;
      if (inView || state === 'flying') dismissHint();
      if (inView) {
        $('view-name').textContent = viewLabel(view);
        toggle.setAttribute('aria-pressed', String(state === 'render'));
        toggle.textContent = state === 'render' ? 'Ver modelo' : 'Ver render';
        toggle.hidden = !view.position;   // sin escena en el modelo no hay nada que alternar
      }
      for (const b of strip.querySelectorAll('button')) {
        b.setAttribute('aria-current', String(!!view && state !== 'free' && b.dataset.view === view.id));
      }
    },
  };
}
