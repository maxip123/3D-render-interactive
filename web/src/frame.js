// Rectángulo del render en pantalla. Lo que va encima (clips, zona de arrastre,
// pie de foto) se alinea desde CSS con las variables --r-x, --r-y, --r-w y --r-h.

/** Coloca el <img> del render y publica su rectángulo. */
export function frameRender(img, r) {
  Object.assign(img.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  const root = globalThis.document?.documentElement;
  if (!root) return;
  for (const k of ['x', 'y', 'w', 'h']) root.style.setProperty(`--r-${k}`, `${r[k]}px`);
}
