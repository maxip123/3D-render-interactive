// Planos de planta y cómo se ubican las vistas sobre ellos. Sin dependencias del DOM.
// Cada plano sale de tools/extract-plans.mjs. x0/x1 son las coordenadas X del
// modelo en los bordes izquierdo y derecho de la imagen, y z0 la Z del borde
// superior (calibrado superponiendo el plano a una vista cenital del modelo).

export const PLANS = {
  PB: { src: 'planos/pb.webp', w: 2307, h: 650, x0: 130.25, x1: 161.55, z0: -41.35 },
  P1: { src: 'planos/p1.webp', w: 2400, h: 610, x0: 122.2, x1: 151.73, z0: -39.9 },
  P2: { src: 'planos/p2.webp', w: 2400, h: 688, x0: 115.6, x1: 140.16, z0: -39.55 },
};

/** Pisos de arriba hacia abajo, como en el edificio. */
export const FLOOR_STACK = ['P2', 'P1', 'PB'];

/** Posición de una cámara sobre el plano, en fracciones (0–1) del ancho y del alto de la imagen. */
export function planPoint(plan, position) {
  const scale = plan.w / (plan.x1 - plan.x0);          // píxeles por metro
  return { x: (position[0] - plan.x0) * scale / plan.w, y: (position[2] - plan.z0) * scale / plan.h };
}

/** Huella del plano en el modelo: { min: [x, z], max: [x, z] }, o null si no hay plano. */
export function planBox(plan) {
  if (!plan) return null;
  const z1 = plan.z0 + (plan.x1 - plan.x0) * plan.h / plan.w;
  return { min: [plan.x0, plan.z0], max: [plan.x1, z1] };
}

/** Rumbo de la cámara sobre el plano: grados en sentido horario desde la derecha de la imagen. */
export function planHeading(quaternion) {
  const [x, y, z, w] = quaternion;
  const fx = -2 * (x * z + w * y), fz = -(1 - 2 * (x * x + y * y));   // el eje −Z de la cámara, en planta
  return Math.atan2(fz, fx) * 180 / Math.PI;
}
