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

/**
 * Cámara cenital inclinada 35° sobre un piso, a la distancia justa para que el
 * largo del edificio quepa en el ancho de la pantalla.
 * @param bounds {{min:number[], max:number[]}} @param floor {{floorY:number, box?:{min:number[],max:number[]}}}
 * @returns {{position:number[], target:number[]}}
 */
export function topDownPose(bounds, floor, aspect, fovDeg = 50) {
  // Huella propia del piso [x, z] si existe; si no, la caja de todo el modelo.
  const lo = floor.box ? floor.box.min : [bounds.min[0], bounds.min[2]];
  const hi = floor.box ? floor.box.max : [bounds.max[0], bounds.max[2]];
  const target = [(lo[0] + hi[0]) / 2, floor.floorY, (lo[1] + hi[1]) / 2];
  const halfSpan = (hi[0] - lo[0]) / 2 * 1.15;
  const halfH = Math.atan(Math.tan(fovDeg * Math.PI / 360) * aspect);
  const dist = halfSpan / Math.tan(halfH);
  return { position: [target[0], target[1] + dist * Math.cos(TILT), target[2] + dist * Math.sin(TILT)], target };
}
