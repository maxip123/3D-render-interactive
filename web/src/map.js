// Mapa del restaurante: los planos de planta apilados como el edificio, con un
// marcador por vista. No toca la escena: solo dibuja y avisa por callbacks.
import { PLANS, FLOOR_STACK, planPoint, planHeading } from './plans.js';
import { clipFor } from './walk.js';

export const FLOOR_NAMES = { EXT: 'Fachada', PB: 'Planta baja', P1: '1.º piso', P2: '2.º piso' };
const SVG = 'http://www.w3.org/2000/svg';

function el(tag, className, props = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return Object.assign(node, props);
}

/**
 * @param root      <nav> donde se arma el mapa
 * @param views     contenido de views.json
 * @param base      prefijo de rutas del sitio
 * @param handlers  { onView(id), onFloor(id), label(view): string }
 * @returns {{ setCurrent(view|null), setFloor(id|null), setWalk(tramo|null) }}
 */
export function initMap(root, views, base, { onView, onFloor, label }) {
  const pins = new Map(), floors = new Map(), spots = new Map();

  FLOOR_STACK.forEach((id, i) => {
    const plan = PLANS[id];
    const items = views.filter(v => v.floor === id && v.render && v.position);
    const section = el('section', 'floor');
    section.dataset.floor = id;
    section.style.setProperty('--i', i);

    const name = el('button', 'floor-name', { type: 'button', textContent: FLOOR_NAMES[id] });
    name.addEventListener('click', () => onFloor(id));
    const head = el('h2');
    head.append(name);

    const plate = el('div', 'plate');
    plate.style.aspectRatio = `${plan.w} / ${plan.h}`;
    plate.addEventListener('click', e => { if (!e.target.closest('.pin')) onFloor(id); });
    plate.append(el('img', 'plan', { src: base + plan.src, alt: `Plano del ${FLOOR_NAMES[id].toLowerCase()}`, width: plan.w, height: plan.h, draggable: false, decoding: 'async' }));

    // Tramos que se pueden caminar: una línea entre vistas seguidas que tienen clip.
    const route = document.createElementNS(SVG, 'svg');
    route.setAttribute('class', 'route');
    route.setAttribute('viewBox', `0 0 ${plan.w} ${plan.h}`);
    route.setAttribute('aria-hidden', 'true');
    for (const v of items) spots.set(v.id, planPoint(plan, v.position));
    items.forEach((v, k) => {
      const to = items[k + 1];
      if (!to || !clipFor(v.id, to.id)) return;
      const a = spots.get(v.id), b = spots.get(to.id), line = document.createElementNS(SVG, 'line');
      for (const [attr, val] of [['x1', a.x * plan.w], ['y1', a.y * plan.h], ['x2', b.x * plan.w], ['y2', b.y * plan.h]]) line.setAttribute(attr, val);
      route.append(line);
    });

    const walker = el('span', 'walker', { hidden: true });
    const peek = el('figure', 'peek', { hidden: true });
    const peekImg = el('img', '', { alt: '', width: 320, height: 256 });
    const peekName = el('figcaption');
    peek.append(peekImg, peekName);
    const showPeek = (view, spot) => {
      if (pins.get(view.id).getAttribute('aria-current') === 'true') return;   // ya se está viendo
      peekImg.src = `${base}renders/thumbs/${view.render}`;
      peekName.textContent = label(view);
      peek.style.setProperty('--x', spot.x);
      peek.style.setProperty('--y', spot.y);
      peek.hidden = false;
    };

    plate.append(route, walker);
    for (const view of items) {
      const spot = spots.get(view.id);
      const pin = el('button', 'pin', { type: 'button' });
      pin.setAttribute('aria-label', label(view));
      pin.style.left = `${spot.x * 100}%`;
      pin.style.top = `${spot.y * 100}%`;
      pin.style.setProperty('--dir', `${planHeading(view.quaternion)}deg`);
      pin.append(el('span', 'cone'), el('span', 'dot', { textContent: view.id.split('-')[1].toUpperCase() }));
      pin.addEventListener('click', () => { peek.hidden = true; onView(view.id); });
      pin.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showPeek(view, spot); });
      pin.addEventListener('pointerleave', () => { peek.hidden = true; });
      pin.addEventListener('focus', () => { if (pin.matches(':focus-visible')) showPeek(view, spot); });
      pin.addEventListener('blur', () => { peek.hidden = true; });
      pins.set(view.id, pin);
      plate.append(pin);
    }
    plate.append(peek);

    section.append(head, plate);
    root.append(section);
    floors.set(id, { section, name, walker });
  });

  const facadeView = views.find(v => v.floor === 'EXT' && v.render);
  let facade = null;
  if (facadeView) {
    facade = el('button', 'facade', { type: 'button' });
    const text = el('span', 'facade-text');
    text.append(el('strong', '', { textContent: FLOOR_NAMES.EXT }), el('span', '', { textContent: 'Vista exterior' }));
    facade.append(el('img', '', { src: `${base}renders/thumbs/${facadeView.render}`, alt: '', width: 320, height: 256, draggable: false }), text);
    facade.addEventListener('click', () => onView(facadeView.id));
    root.append(facade);
  }

  // En pantallas chicas el mapa se desplaza: lo que se abre queda a la vista.
  const reveal = node => {
    const box = root.getBoundingClientRect(), r = node.getBoundingClientRect();
    const dy = r.bottom > box.bottom ? r.bottom - box.bottom + 12 : r.top < box.top ? r.top - box.top - 8 : 0;
    if (dy) root.scrollBy({ top: dy, behavior: 'smooth' });
  };

  let current = null, cut = null, revealed;
  const light = () => {
    const lit = PLANS[current?.floor] ? current.floor : current ? null : cut;   // en la fachada o sin piso elegido, todos encendidos
    for (const [id, f] of floors) f.section.dataset.lit = String(!lit || lit === id);
  };

  return {
    /** Vista abierta (o null): resalta su marcador y su piso. */
    setCurrent(view) {
      current = view;
      for (const [id, pin] of pins) pin.setAttribute('aria-current', String(view?.id === id));
      facade?.setAttribute('aria-current', String(!!view && view.id === facadeView.id));
      light();
      const shown = view && (floors.get(view.floor)?.section ?? (view.id === facadeView?.id ? facade : null));
      if (shown && revealed !== undefined && shown !== revealed) reveal(shown);   // la primera vista no mueve el mapa
      revealed = shown || null;
    },
    /** Piso cortado en el modelo 3D (o null si se ve el edificio entero). */
    setFloor(id) {
      cut = PLANS[id] ? id : null;
      for (const [fid, f] of floors) f.name.setAttribute('aria-pressed', String(fid === cut));
      light();
    },
    /** Punto que avanza entre dos marcadores mientras se camina: [desdeId, hastaId, 0..1] o null. */
    setWalk(leg) {
      for (const f of floors.values()) f.walker.hidden = true;
      if (!leg) return;
      const [from, to, t] = leg, a = spots.get(from), b = spots.get(to);
      const floor = floors.get(views.find(v => v.id === from)?.floor);
      if (!a || !b || !floor || t <= 0 || t >= 1) return;
      floor.walker.style.left = `${(a.x + (b.x - a.x) * t) * 100}%`;
      floor.walker.style.top = `${(a.y + (b.y - a.y) * t) * 100}%`;
      floor.walker.hidden = false;
    },
  };
}
