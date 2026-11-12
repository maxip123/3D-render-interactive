// El exportador deja todos los materiales con el mismo brillo genérico (0.5/0.5),
// que en el visor se traduce en superficies espejadas y lavadas. Aquí se asigna
// un acabado creíble según el nombre del material.
const RULES = [
  [/mirror/i,                                             { metallic: 1,   roughness: 0.03 }],
  [/tecido|sofa|tela|fabric/i,                            { metallic: 0,   roughness: 0.95 }],
  [/metal|steel|alumin|cocina industrial|torneira/i,      { metallic: 0.9, roughness: 0.35 }],
  [/porcelain|lavavo|cuba/i,                              { metallic: 0,   roughness: 0.25 }],
  [/madera|madeira|wood|cherry|parquet|mesa/i,            { metallic: 0,   roughness: 0.45 }],
  [/piedra|stone|tiles|muro|canteros|asphalt/i,           { metallic: 0,   roughness: 0.85 }],
];
const DEFAULT = { metallic: 0, roughness: 0.75 };

/** Acabado (metálico / rugosidad) para un material según su nombre. */
export function surfaceFor(name) {
  for (const [re, surface] of RULES) if (re.test(name ?? '')) return { ...surface };
  return { ...DEFAULT };
}
