// Funciones puras compartidas por el visor. Sin dependencias del DOM ni de Three.js.

const LOAD_ERRORS = {
  webgl: 'Tu navegador no admite gráficos 3D (WebGL).',
  network: 'No se pudo descargar el modelo. Revisa tu conexión y recarga.',
  parse: 'El archivo del modelo está dañado.',
};

/** Mensaje para la persona cuando el visor no puede arrancar. */
export function describeLoadError(err) {
  return LOAD_ERRORS[err?.kind] ?? LOAD_ERRORS.network;
}

/** Altura del plano de corte para una selección de piso; null = sin corte. */
export function clipHeightFor(floors, selection) {
  return floors[selection]?.clipY ?? null;
}

const TILT = 35 * Math.PI / 180;

const FIT = 1.15;                          // aire alrededor del piso encuadrado

/**
 * Cámara cenital inclinada 35° sobre un piso, a la distancia justa para que la
 * huella entera quepa en pantalla, a lo ancho y a lo hondo.
 * @param bounds {{min:number[], max:number[]}} @param floor {{floorY:number, box?:{min:number[],max:number[]}}}
 * @returns {{position:number[], target:number[]}}
 */
export function topDownPose(bounds, floor, aspect, fovDeg = FREE_FOV) {
  // Huella propia del piso [x, z] si existe; si no, la caja de todo el modelo.
  const lo = floor.box ? floor.box.min : [bounds.min[0], bounds.min[2]];
  const hi = floor.box ? floor.box.max : [bounds.max[0], bounds.max[2]];
  const target = [(lo[0] + hi[0]) / 2, floor.floorY, (lo[1] + hi[1]) / 2];
  const hx = (hi[0] - lo[0]) / 2, hz = (hi[1] - lo[1]) / 2;
  const tanV = Math.tan(fovDeg * Math.PI / 360), tanH = tanV * aspect;
  // El borde cercano queda hz·sen(35°) más cerca de la cámara, y por perspectiva es el que se ve más grande.
  const dist = hz * Math.sin(TILT) + FIT * Math.max(hx / tanH, hz * Math.cos(TILT) / tanV);
  return { position: [target[0], target[1] + dist * Math.cos(TILT), target[2] + dist * Math.sin(TILT)], target };
}

/** Rectángulo de una imagen contenida y centrada en una caja, sin recortar ni deformar. */
export function fitRect(imgW, imgH, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale, h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Campo de visión del recorrido libre. */
export const FREE_FOV = 50;

/** Franja libre sobre y bajo el render, según el ancho del escenario. */
export function stageMargin(stageW) {
  return stageW < 700 ? 48 : 64;
}

/**
 * Avance del recorrido interior tras arrastrar `dxPx`: de -1 (vista anterior)
 * a 1 (vista siguiente); 0 es la vista actual. Arrastrar la imagen a la
 * izquierda avanza. Solo se mueve hacia donde hay clip.
 */
export function walkOffset(dxPx, widthPx, hasNext, hasPrev, gain = 1.4) {
  if (!(widthPx > 0)) return 0;
  return Math.min(hasNext ? 1 : 0, Math.max(hasPrev ? -1 : 0, -dxPx / widthPx * gain));
}

/** Dónde termina el recorrido al soltar: en la vista vecina (±1) o de vuelta en la actual (0). */
export function walkSettle(offset, threshold = 0.3) {
  return Math.abs(offset) >= threshold ? Math.sign(offset) : 0;
}

/**
 * Zona del escenario donde cabe el render: deja franjas iguales arriba y abajo
 * para el pie de foto y, si se pide, aire a los costados.
 */
export function renderBox(viewportW, viewportH, margin, gutter = 0) {
  const m = Math.min(margin, viewportH / 3);
  return { x: gutter, y: m, w: viewportW - 2 * gutter, h: viewportH - 2 * m };
}

/** Aire a cada lado del render, según el ancho del escenario. */
export function stageGutter(stageW) {
  return stageW < 520 ? 0 : 32;          // en un celular el render va de borde a borde
}

/**
 * Campo de visión vertical que debe usar la cámara (a pantalla completa) para
 * que el modelo coincida con un render que ocupa `renderH` de los `viewportH`
 * píxeles de alto, centrado. `fovAtImage` es el fov vertical del propio render.
 */
export function verticalFovFor(fovAtImage, renderH, viewportH) {
  const half = Math.tan(fovAtImage * Math.PI / 360) * viewportH / renderH;
  return 2 * Math.atan(half) * 180 / Math.PI;
}

const FLOOR_ORDER = ['EXT', 'PB', 'P1', 'P2'];

/** Agrupa por piso las vistas que tienen render, en orden EXT, PB, P1, P2. */
export function groupViews(views) {
  return FLOOR_ORDER
    .map(floor => ({ floor, items: views.filter(v => v.floor === floor && v.render) }))
    .filter(g => g.items.length > 0);
}

const ease = t => t * t * (3 - 2 * t);

function slerp(a, b, t) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = dot < 0 ? -1 : 1; dot = Math.abs(dot);
  let wa = 1 - t, wb = t;
  if (dot < 0.9995) {
    const th = Math.acos(dot), s = Math.sin(th);
    wa = Math.sin((1 - t) * th) / s; wb = Math.sin(t * th) / s;
  }
  const q = a.map((v, i) => wa * v + wb * sign * b[i]);
  const len = Math.hypot(...q);
  return q.map(v => v / len);
}

/**
 * Vuelo de cámara entre dos poses {position:[3], quaternion:[4], fov}.
 * Quien lo usa llama a tick(ms) en cada cuadro. Un start nuevo cancela el anterior.
 */
export function createFlight() {
  let job = null;
  return {
    get active() { return job !== null; },
    start(from, to, ms, onUpdate, onDone) { job = { from, to, ms, t: 0, onUpdate, onDone }; },
    cancel() { job = null; },
    tick(dtMs) {
      if (!job) return;
      const j = job;
      j.t += dtMs;
      if (j.t >= j.ms) {
        job = null;
        j.onUpdate({ position: [...j.to.position], quaternion: [...j.to.quaternion], fov: j.to.fov });
        j.onDone?.();
        return;
      }
      const k = ease(j.t / j.ms);
      j.onUpdate({
        position: j.from.position.map((v, i) => v + (j.to.position[i] - v) * k),
        quaternion: slerp(j.from.quaternion, j.to.quaternion, k),
        fov: j.from.fov + (j.to.fov - j.from.fov) * k,
      });
    },
  };
}

/**
 * Instante del clip de la fachada tras arrastrar `dxPx` píxeles. Arrastrar la
 * imagen hacia la izquierda equivale a mover la cámara a la derecha (avanza el
 * clip); el ancho completo de la imagen recorre el clip entero.
 */
export function scrubTime(startTime, dxPx, widthPx, duration) {
  if (!(widthPx > 0) || !(duration > 0)) return startTime;
  return Math.min(duration, Math.max(0, startTime - dxPx / widthPx * duration));
}

/**
 * Posición en el recorrido de la fachada, de -1 a 1: 0 es el render original,
 * +1 el final del clip hacia la derecha y -1 el final del clip hacia la
 * izquierda. Arrastrar la imagen a la izquierda mueve la cámara a la derecha.
 */
export function scrubPosition(startPos, dxPx, widthPx, hasLeft = true) {
  if (!(widthPx > 0)) return startPos;
  return Math.min(1, Math.max(hasLeft ? -1 : 0, startPos - dxPx / widthPx));
}
