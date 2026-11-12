// Degradación por rendimiento: si el equipo va lento, se apagan sombras y baja
// la resolución en vez de trabarse.

/** Nivel siguiente (0–2) según los cuadros por segundo promedio. */
export function nextQuality(level, avgFps) {
  if (avgFps < 24) return Math.max(0, level - 1);
  if (avgFps > 50) return Math.min(2, level + 1);
  return level;
}

/** Acumula cuadros y entrega el promedio de fps cada 2 s (null mientras tanto). */
export function createFpsMeter(windowSeconds = 2) {
  let time = 0, frames = 0;
  return {
    sample(dt) {
      if (dt > 0.5) return null;            // pestaña oculta o pausa: no cuenta
      time += dt; frames++;
      if (time < windowSeconds) return null;
      const fps = frames / time;
      time = 0; frames = 0;
      return fps;
    },
    reset() { time = 0; frames = 0; },
  };
}

const LEVELS = [
  { shadows: false, pixelRatio: 1 },
  { shadows: false, pixelRatio: 1.5 },
  { shadows: true, pixelRatio: 2 },
];

export function applyQuality(viewer, level) {
  const { shadows, pixelRatio } = LEVELS[level];
  viewer.renderer.shadowMap.enabled = shadows;
  viewer.sun.castShadow = shadows;
  viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatio));
  viewer.resize();
  // Activar o desactivar sombras exige recompilar los materiales.
  viewer.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
}

/**
 * Vigila el rendimiento y ajusta la calidad. `isBusy()` evita medir durante un vuelo.
 * Una vez que hubo que bajar, no vuelve a subir por encima de ese nivel (evita oscilar).
 */
export function watchQuality(viewer, isBusy) {
  const meter = createFpsMeter();
  let level = matchMedia('(pointer: coarse)').matches ? 1 : 2;
  let ceiling = 2;
  applyQuality(viewer, level);
  viewer.onFrame(dt => {
    if (isBusy()) return meter.reset();
    const fps = meter.sample(dt);
    if (fps === null) return;
    const next = Math.min(nextQuality(level, fps), ceiling);
    if (next === level) return;
    if (next < level) ceiling = next;
    level = next;
    applyQuality(viewer, level);
  });
  return { level: () => level };
}
