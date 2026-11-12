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
