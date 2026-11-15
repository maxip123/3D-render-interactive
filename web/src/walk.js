// Recorrido interior: entre dos vistas seguidas de un piso hay un clip corto que
// camina de un render al otro. La persona lo recorre arrastrando la imagen (a
// la izquierda avanza, a la derecha vuelve) y al soltar llega a la vista vecina
// o regresa. Cada clip empieza y termina en un render, así que el corte no se nota.
import { walkOffset, walkSettle } from './math.js';

/** Clips disponibles en public/recorrido/. */
export const CLIPS = ['pb-a-b', 'pb-b-c', 'pb-c-d', 'p1-a-b', 'p1-b-c', 'p1-c-d', 'p2-a-b', 'p2-b-c', 'p2-c-d'];

/** Nombre del clip que va de una vista a la siguiente del mismo piso, o null. */
export function clipFor(fromId, toId, clips = CLIPS) {
  const a = /^(\w+)-([a-d])$/.exec(fromId ?? ''), b = /^(\w+)-([a-d])$/.exec(toId ?? '');
  if (!a || !b || a[1] !== b[1] || b[2].charCodeAt(0) - a[2].charCodeAt(0) !== 1) return null;
  const name = `${a[1]}-${a[2]}-${b[2]}`;
  return clips.includes(name) ? name : null;
}

const REWIND = 2.5;                        // al volver, el clip retrocede a 2,5× su velocidad

/** Un <video> que se recorre por búsqueda: siempre va a la última fracción pedida. */
function slot(video, url) {
  let name = null, ready = false, seeking = false, frac = 0;
  const at = () => frac * (video.duration || 0);
  const seek = () => {
    if (!ready || seeking || Math.abs(video.currentTime - at()) < 0.01) return;
    seeking = true;
    video.currentTime = at();
  };
  video.addEventListener('seeked', () => { seeking = false; seek(); });
  video.addEventListener('loadeddata', () => { ready = true; seek(); });
  return {
    video,
    get name() { return name; },
    get ready() { return ready; },
    get settled() { return ready && !seeking && Math.abs(video.currentTime - at()) < 0.05; },
    get fraction() { return video.duration ? video.currentTime / video.duration : 0; },
    load(n) {
      if (!n || n === name) return;
      name = n; ready = false; seeking = false;
      video.src = url(n); video.load();
    },
    go(f) { video.pause(); frac = f; seek(); },
    play() { seeking = false; return video.play(); },
  };
}

/**
 * @param videos  dos <video> superpuestos al render
 * @param pad     elemento sobre el render que recibe el arrastre
 * @param base    prefijo de rutas del sitio
 * @returns {{ arm(next, prev, hooks), advance(): boolean, finish(), busy(): boolean }}
 *   hooks: { progress(d: -1..1), commit(dir: 1|-1) }
 */
export function initWalk(videos, pad, base = '/') {
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const slots = videos.map(v => slot(v, name => `${base}recorrido/${name}.mp4`));
  let next = slots[0], prev = slots[1];
  let has = { next: false, prev: false }, hooks = null;
  let d = 0, drag = null, anim = null;      // d: 0 la vista actual, 1 la siguiente, -1 la anterior

  const show = s => { for (const x of slots) x.video.classList.toggle('visible', x === s); };
  const scrub = () => {
    if (d > 0) next.go(d); else if (d < 0) prev.go(1 + d);
    show(d > 0 ? next : d < 0 ? prev : null);
    hooks?.progress?.(d);
  };
  const stop = () => {
    if (!anim) return;
    cancelAnimationFrame(anim.raf);
    anim.slot.video.onended = null;
    anim.slot.video.pause();
    anim = null;
  };
  // Fin del movimiento: en la vista actual se oculta el clip; en una vecina queda
  // su último cuadro hasta que quien escucha `commit` muestre el render nuevo.
  const land = to => {
    stop();
    if (to === 0) { d = 0; show(null); hooks?.progress?.(0); return; }
    const h = hooks; hooks = null;
    pad.classList.remove('armed');
    h?.progress?.(0);
    h?.commit?.(to);
  };

  function settle(to) {
    if (to === d || reduced) return land(to);
    const s = d > 0 || (d === 0 && to > 0) ? next : prev;
    const forward = s === next ? to === 1 : to === 0;
    anim = { slot: s, to, raf: 0 };
    show(s);
    const report = () => { d = s === next ? s.fraction : s.fraction - 1; hooks?.progress?.(d); };
    if (forward) {
      const tick = () => { report(); anim.raf = requestAnimationFrame(tick); };
      s.video.onended = () => land(to);
      s.play()?.catch?.(() => land(to));
      anim.raf = requestAnimationFrame(tick);
    } else {
      let f = s === next ? d : 1 + d, last = performance.now();
      const tick = now => {
        f = Math.max(0, f - (now - last) / 1000 * REWIND / (s.video.duration || 5)); last = now;
        s.go(f); report();
        if (f === 0 && s.settled) return land(to);
        anim.raf = requestAnimationFrame(tick);
      };
      anim.raf = requestAnimationFrame(tick);
    }
  }

  pad.addEventListener('pointerdown', e => {
    if (!hooks || anim || e.button > 0) return;
    try { pad.setPointerCapture(e.pointerId); } catch { /* el puntero ya no está activo */ }
    drag = { x: e.clientX };
    pad.classList.add('dragging');
  });
  pad.addEventListener('pointermove', e => {
    if (!drag) return;
    d = walkOffset(e.clientX - drag.x, pad.clientWidth, has.next && next.ready, has.prev && prev.ready);
    scrub();
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    pad.classList.remove('dragging');
    settle(walkSettle(d));
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);

  return {
    /** Prepara la vista actual: clip hacia la siguiente y clip que llega desde la anterior (o null). */
    arm(nextName, prevName, h) {
      stop();
      d = 0; drag = null; hooks = h ?? null;
      pad.classList.remove('dragging');
      show(null);
      // El clip que se acaba de recorrer queda cargado y cambia de papel.
      if ((nextName && prev.name === nextName) || (prevName && next.name === prevName)) [next, prev] = [prev, next];
      has = { next: !!nextName, prev: !!prevName };
      next.load(nextName); prev.load(prevName);
      if (has.next) next.go(0);
      if (has.prev) prev.go(1);
      pad.classList.toggle('armed', !!hooks && (has.next || has.prev));
    },
    /** Camina sola hasta la vista siguiente. Devuelve false si no hay clip que reproducir. */
    advance() {
      if (!hooks || !has.next || reduced || anim || drag) return false;
      settle(1);
      return true;
    },
    /** Si va camino a una vista vecina, llega ya. */
    finish() { if (anim?.to) land(anim.to); },
    busy: () => !!anim,
  };
}
