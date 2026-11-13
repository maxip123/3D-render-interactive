// Vista exterior interactiva: un clip corto que rodea la fachada y que la
// persona recorre arrastrando. El clip parte del render original, así que en
// reposo se ve el render nítido y el video aparece solo al arrastrar.
import { scrubTime } from './math.js';

/**
 * @param video  <video> superpuesto al render
 * @param img    <img> del render (el video copia su posición)
 * @param hint   elemento con la indicación "Arrastra…"
 * @param url    dirección del clip
 * @returns {{ enable(on: boolean) }}
 */
export function initExterior(video, img, hint, url) {
  let enabled = false, loaded = false;
  let drag = null;                 // { x, time } al empezar a arrastrar
  let target = 0, seeking = false; // se busca un cuadro por vez, siempre el más reciente pedido

  const place = () => {
    for (const k of ['left', 'top', 'width', 'height']) video.style[k] = img.style[k];
  };
  const seek = () => {
    if (seeking || Math.abs(video.currentTime - target) < 0.01) return;
    seeking = true;
    video.currentTime = target;
  };
  video.addEventListener('seeked', () => { seeking = false; seek(); });

  const show = () => { place(); video.classList.add('visible'); };
  const rest = () => { video.classList.remove('visible'); };   // vuelve a verse el render original

  video.addEventListener('pointerdown', e => {
    if (!enabled || !loaded) return;
    video.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, time: video.currentTime };
    hint.classList.add('gone');
    show();
  });
  video.addEventListener('pointermove', e => {
    if (!drag) return;
    target = scrubTime(drag.time, e.clientX - drag.x, video.clientWidth, video.duration);
    seek();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    if (target < 0.05) rest();
  };
  video.addEventListener('pointerup', end);
  video.addEventListener('pointercancel', end);
  addEventListener('resize', () => { if (enabled) place(); });

  return {
    enable(on) {
      enabled = on;
      video.classList.toggle('active', on);
      hint.hidden = !on;
      if (!on) { drag = null; rest(); return; }
      place();
      if (!loaded && !video.src) {
        video.addEventListener('loadeddata', () => { loaded = true; }, { once: true });
        video.src = url;           // se descarga recién cuando se muestra la fachada
        video.load();
      }
    },
  };
}
