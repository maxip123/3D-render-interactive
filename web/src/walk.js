// Recorrido interior: al pasar a la vista siguiente del mismo piso se reproduce un
// clip corto que camina de un render al otro. Cada clip empieza en el render de
// origen y termina en el de destino, así que el corte con las imágenes no se nota.

/** Clips disponibles en public/recorrido/ (falta p2-a-b). */
export const CLIPS = ['pb-a-b', 'pb-b-c', 'pb-c-d', 'p1-a-b', 'p1-b-c', 'p1-c-d', 'p2-b-c', 'p2-c-d'];

/** Nombre del clip que va de una vista a la siguiente del mismo piso, o null. */
export function clipFor(fromId, toId, clips = CLIPS) {
  const a = /^(\w+)-([a-d])$/.exec(fromId ?? ''), b = /^(\w+)-([a-d])$/.exec(toId ?? '');
  if (!a || !b || a[1] !== b[1] || b[2].charCodeAt(0) - a[2].charCodeAt(0) !== 1) return null;
  const name = `${a[1]}-${a[2]}-${b[2]}`;
  return clips.includes(name) ? name : null;
}

/**
 * @param video  <video> que se superpone al render
 * @param img    <img> del render (el video copia su posición)
 * @param base   prefijo de rutas del sitio
 * @returns {{ preload(name), play(name, onEnd): boolean, finish(), cancel(), hide(), busy(): boolean }}
 */
export function initWalk(video, img, base = '/') {
  const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let onEnd = null;
  const url = name => `${base}recorrido/${name}.mp4`;
  const load = name => {
    const u = url(name);
    if (video.getAttribute('src') !== u) { video.setAttribute('src', u); video.load(); }
  };
  const place = () => { for (const k of ['left', 'top', 'width', 'height']) video.style[k] = img.style[k]; };
  const done = () => { const f = onEnd; onEnd = null; video.pause(); f?.(); };

  video.addEventListener('playing', () => { if (onEnd) video.classList.add('visible'); });
  video.addEventListener('ended', done);
  video.addEventListener('error', () => { if (onEnd) done(); });
  addEventListener('resize', () => { if (onEnd || video.classList.contains('visible')) place(); });

  return {
    preload(name) { if (name && !reduced && !onEnd) load(name); },
    play(name, end) {
      if (!name || reduced) return false;
      onEnd = end;
      load(name);
      place();
      video.currentTime = 0;
      video.play()?.catch?.(() => { if (onEnd) done(); });
      return true;
    },
    finish() { if (onEnd) done(); },                  // saltar al final del clip
    cancel() { onEnd = null; video.pause(); video.classList.remove('visible'); },
    hide() { video.classList.remove('visible'); },
    busy: () => !!onEnd,
  };
}
