# Entreaguas Resto Bar — visor web 3D (especificación de diseño)

Fecha: 2026-11-12

## Objetivo

Una página web donde cualquier persona pueda recorrer el modelo 3D real de
Entreaguas Resto Bar desde cualquier ángulo, y saltar a las vistas de los 13
renders originales viéndolos tal cual fueron entregados.

Éxito significa:

- La geometría y los materiales son los del modelo del arquitecto, no una
  reconstrucción.
- Cada render original se puede ver sin modificar, alineado con la cámara del
  modelo desde la que se hizo.
- Carga y se maneja con fluidez en una laptop común y en un celular reciente.
- No cuesta dinero: sin Higgsfield ni servicios pagos.

## Material de partida

| Archivo | Qué es | Uso |
|---|---|---|
| `santiago mercado.glb` | Exportación del modelo (SimLab GLTF), 52 MB | Fuente de la geometría. No se modifica. |
| `resto-bar.skp` | Modelo original SketchUp 2026 | Respaldo. No se usa en la web. |
| `fachada.jpeg`, `PB A–D`, `1 piso A–D`, `2 piso A–D` | 13 renders finales | Vistas exactas dentro del visor. |
| `PB.pdf`, `PA.pdf`, `PA1.pdf` | Plantas | Referencia para verificar pisos. |

Lo que se midió en el GLB:

- 5,68 millones de triángulos en 2107 mallas, 53 materiales, 37 texturas (22 MB).
- Las sillas y mesas están repetidas como mallas separadas, sin instanciar:
  solo el material de las sillas de madera suma 2,4 millones de triángulos.
- Los materiales usan la extensión `KHR_materials_pbrSpecularGlossiness`, que
  Three.js ya no lee; hay que convertirlos a metal/rugosidad.
- No hay cámaras, pero las 24 escenas de SketchUp vienen como nodos vacíos con
  posición y orientación: `PB-Vista 1–4`, `PA1-Vista 1–2`, `PA-Vista 3–4`,
  `PA2-Vista1` y `PA2-Vista 2–4`, `Escena21–23`, plantas y cortes.
- Unidades en metros, eje Z hacia arriba bajo una matriz raíz que lo pasa a Y.

## Límite conocido de fidelidad

Los renders finales tienen iluminación, vegetación y probablemente utilería
(velas, vajilla) agregadas en el motor de render. Eso no viaja en el modelo.
Por lo tanto:

- En las 13 vistas, lo que se muestra es el render original: fidelidad exacta.
- En el recorrido libre se ve el modelo real con luz cálida rehecha en el
  navegador: mismo espacio y materiales, aspecto cercano pero no idéntico.

Qué elementos faltan exactamente en el modelo se confirma al cargarlo por
primera vez (paso de verificación 1) y se informa antes de seguir.

## Arquitectura

Sitio estático. Dos partes separadas por un archivo intermedio.

```
Santiago/
  santiago mercado.glb          original, intacto
  tools/
    optimize.mjs                GLB original -> GLB web
    extract-views.mjs           nodos de escena -> views.json
    check-model.mjs             valida el resultado
  web/
    index.html
    src/
      main.js                   arranque y cableado
      scene.js                  renderer, luces, carga del modelo
      floors.js                 selector de piso
      views.js                  vistas guardadas y fundido al render
      ui.js                     controles en pantalla
    public/
      model/entreaguas.glb      generado
      views.json                generado
      renders/*.jpg             los 13 renders
```

### 1. Preparación del modelo (`tools/`)

`optimize.mjs` usa `@gltf-transform` y produce `web/public/model/entreaguas.glb`:

1. Convierte materiales a metal/rugosidad.
2. Elimina duplicados e instancia las mallas repetidas (sillas, mesas).
3. Suelda vértices y simplifica solo el mobiliario denso, con tolerancia baja
   para no deformar siluetas.
4. Reduce texturas a 2048 px como máximo y las pasa a WebP.
5. Comprime la geometría con Meshopt.

Metas: menos de 20 MB y menos de 1,5 millones de triángulos dibujados. Si la
simplificación daña alguna pieza visible, se excluye esa pieza y se acepta más
peso.

`extract-views.mjs` lee los nodos de escena y escribe `views.json` con, por
vista: nombre, posición y orientación ya en el sistema del visor, piso, archivo
de render asociado y campo de visión.

- La correspondencia render ↔ escena se decide comparando cada render con la
  vista del modelo. Los nombres sugieren `PB-Vista 1–4` ↔ `PB A–D`, las cuatro
  `PA…` ↔ `1 piso A–D`, `PA2…` ↔ `2 piso A–D` y una `Escena2x` ↔ fachada, pero
  se confirma a ojo, no por nombre.
- El campo de visión no viene en el GLB: se ajusta por vista hasta que el
  modelo calce con el render.
- Una vista sin escena que calce se queda como render suelto en la galería, sin
  vuelo de cámara, y se informa.

### 2. Visor (`web/`)

Vite + Three.js, JavaScript sin framework.

- **Recorrido libre:** órbita, zoom y desplazamiento con ratón y con gestos
  táctiles. Arranca en una vista exterior de tres cuartos.
- **Selector de piso:** Todo / PB / 1.º / 2.º. Al elegir un piso se ocultan los
  niveles de arriba con un plano de corte a la altura de su cielorraso, para
  ver el interior desde arriba. Las alturas se toman del modelo.
- **Vistas guardadas:** tira de 13 miniaturas agrupadas por piso. Al tocar una,
  la cámara vuela a la posición de esa escena y el render original aparece
  fundido encima a pantalla completa, con su proporción intacta. Un control
  alterna render / modelo para comparar. Al mover la cámara, el render se
  retira y se sigue en el modelo.
- **Luz:** mapa de entorno cálido, luz direccional tipo atardecer entrando por
  las ventanas, tono ACES. Las tiras LED y el muro de agua se resuelven con
  materiales emisivos y transparentes. Sombras en escritorio; en celular se
  desactivan si bajan los cuadros por segundo.
- **Carga:** barra de progreso mientras baja el modelo; mensaje claro si el
  navegador no tiene WebGL.

## Fuera de alcance

- Publicación en internet (se decide después; el resultado es una carpeta
  estática lista para subir).
- Caminata en primera persona con colisiones, realidad virtual, mediciones.
- Generación de imágenes, video o 3D con IA.
- Editar el modelo o recrear la vegetación de los renders.

## Verificación

1. **Modelo crudo:** cargar el GLB original en el visor, capturar cada piso y
   anotar qué falta respecto de los renders.
2. **`check-model.mjs`:** el GLB optimizado no usa la extensión antigua, cumple
   las metas de peso y triángulos, y conserva los 53 materiales o justifica
   cada uno que se fusionó.
3. **`views.json`:** las 13 vistas tienen render asociado y archivo existente.
4. **Calce visual:** para cada vista, captura del modelo y del render lado a
   lado; muros, aberturas y muebles deben coincidir en posición.
5. **Uso real:** probar en el navegador órbita, selector de piso y las 13
   vistas, en tamaño escritorio y en tamaño celular, sin errores en consola.

## Cambio posterior (2026-11-13): modo liviano por defecto

La página abre mostrando solo los renders originales (galería con anterior /
siguiente). Three.js y el modelo se descargan recién al tocar "Recorrer en 3D",
y el recorrido continúa en la vista que estaba abierta. Motivo: que abra al
instante y no cargue el 3D en equipos modestos sin que se pida. Se descartó el
recorrido animado con IA (Higgsfield) por costo.

## Cambio posterior (2026-11-15): clips entre vistas interiores

En la galería, "siguiente" dentro de un mismo piso reproduce un clip de 5 s
(Seedance, generado con la prueba gratuita) que va del render de origen al de
destino, encima de la imagen; al terminar queda el render original. Hacia
atrás, entre pisos o donde falta clip, se usa el fundido de siempre. Los clips
están en `web/public/recorrido/` y su lista en `web/src/walk.js`. Falta
`p2-a-b`. Con movimiento reducido no se reproducen. El modo 3D no los usa.
