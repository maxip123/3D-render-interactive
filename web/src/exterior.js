// Vista exterior interactiva: dos clips cortos que rodean la fachada (uno hacia
// cada lado) y que la persona recorre arrastrando. Ambos parten del render
// original, así que en reposo se ve el render nítido y el video aparece solo
// al arrastrar.
import { scrubPosition } from './math.js';

/** Un clip que se recorre por búsqueda: siempre va al último instante pedido. */
function scrubber(video) {
  let target = 0, seeking = false, loaded = false;
  const seek = () => {
    if (!loaded || seeking || Math.abs(video.currentTime - target) < 0.01) return;
    seeking = true;
    video.currentTime = target;
  };
  video.addEventListener('seeked', () => { seeking = false; seek(); });
  video.addEventListener('loadeddata', () => { loaded = true; seek(); }, { once: true });
  return {
    get ready() { return loaded; },
    load(url) { if (!video.src) { video.src = url; video.load(); } },
    go(fraction) { target = fraction * (video.duration || 0); seek(); },
  };
}

/**
 * @param right  <video> del giro a la derecha; va encima y recibe el arrastre
 * @param left   <video> del giro a la izquierda, o null si no hay clip
 * @param img    <img> del render (los videos copian su posición)
 * @param hint   elemento con la indicación "Arrastra…"
 * @param urls   { right: string, left?: string }
 * @returns {{ enable(on: boolean), position(): number }}
 */
export function initExterior(right, left, img, hint, urls) {
  const clips = { right: scrubber(right), left: left && urls.left ? scrubber(left) : null };
  let enabled = false, pos = 0, drag = null;

  const place = () => {
    for (const v of [right, left]) if (v) for (const k of ['left', 'top', 'width', 'height']) v.style[k] = img.style[k];
  };
  // pos > 0: clip derecho; pos < 0: clip izquierdo; cerca de 0: render original.
  const render = () => {
    const resting = Math.abs(pos) < 0.012 && !drag;
    right.classList.toggle('visible', !resting && pos >= 0);
    left?.classList.toggle('visible', !resting && pos < 0);
    if (pos >= 0) clips.right.go(pos); else clips.left.go(-pos);
  };

  right.addEventListener('pointerdown', e => {
    if (!enabled || !clips.right.ready) return;
    right.setPointerCapture?.(e.pointerId);
    drag = { x: e.clientX, pos };
    hint.classList.add('gone');
    place(); render();
  });
  right.addEventListener('pointermove', e => {
    if (!drag) return;
    pos = scrubPosition(drag.pos, e.clientX - drag.x, right.clientWidth, !!clips.left?.ready);
    render();
  });
  const end = () => { if (drag) { drag = null; render(); } };
  right.addEventListener('pointerup', end);
  right.addEventListener('pointercancel', end);
  addEventListener('resize', () => { if (enabled) place(); });

  return {
    position: () => pos,
    enable(on) {
      enabled = on;
      right.classList.toggle('active', on);
      hint.hidden = !on;
      if (!on) { drag = null; pos = 0; render(); return; }
      place();
      clips.right.load(urls.right);          // se descargan recién cuando se muestra la fachada
      clips.left?.load(urls.left);
    },
  };
}
