# Entreaguas Web 3D — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un sitio estático que muestra el modelo 3D real de Entreaguas Resto Bar con recorrido libre, selector de piso y 13 vistas que funden al render original.

**Architecture:** Un paso de preparación en Node convierte el GLB del arquitecto en un GLB liviano y extrae las cámaras de escena a `views.json`. Un visor Vite + Three.js consume esos dos archivos generados y los 13 renders. La lógica calculable (coordenadas, encuadre, cortes de piso) vive en funciones puras con pruebas; lo visual se verifica en el navegador contra los renders.

**Tech Stack:** Node 22, Vite, Three.js (versión actual estable, fijada exacta en `package.json`), `@gltf-transform/core|extensions|functions`, `meshoptimizer`, `sharp`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-entreaguas-web-3d-design.md`

## Global Constraints

- `santiago mercado.glb`, `resto-bar.skp`, los `.jpeg` y los `.pdf` de la raíz no se modifican ni se mueven.
- Sin servicios pagos ni Higgsfield. Sin generación con IA.
- GLB web: menos de 20 MB y menos de 1,5 millones de triángulos dibujados; no usa `KHR_materials_pbrSpecularGlossiness`.
- Texturas: 2048 px como máximo, WebP.
- Los renders se muestran sin recortar ni deformar: proporción original intacta.
- Textos de la interfaz en español.
- JavaScript sin framework, módulos ES. Un solo `package.json` en la raíz.
- Git: `git init` en la Tarea 1 con `.gitignore` que excluye `node_modules/`, `web/dist/`, `*.skp`, `*.pdf` y `santiago mercado.glb`. Un commit por tarea.

## Review Focus

1. **Pantalla vertical de celular con render apaisado (1402×1122):** el render debe verse entero con bandas, nunca recortado; la cámara del modelo debe encuadrar lo mismo que el render detrás de él. → prueba en Tarea 5 (`fitRect`, `verticalFovFor`).
2. **Tocar otra vista mientras la cámara vuela:** el vuelo anterior se cancela y gana el último toque; no quedan dos renders superpuestos. → prueba en Tarea 5 (`createFlight`).
3. **El modelo no carga (archivo ausente, red cortada) o no hay WebGL:** mensaje claro en español en vez de pantalla negra. → prueba en Tarea 3 (`describeLoadError`).
4. **Una vista sin render o un render sin escena en `views.json`:** el visor la muestra como imagen suelta o la omite, no se rompe. → prueba en Tarea 1 (`buildViews`) y Tarea 5 (`groupViews`).
5. **Equipo lento:** si los cuadros por segundo caen, se apagan sombras y baja la resolución en vez de trabarse. → prueba en Tarea 6 (`nextQuality`).

---

## Estructura de archivos

```
package.json  vite.config.js  .gitignore
tools/
  lib/glb.js            leer JSON de un GLB; transformar puntos por la matriz raíz
  lib/views.js          buildViews(): nodos de escena -> entradas de views.json
  extract-views.mjs     CLI: escribe web/public/views.json
  optimize.mjs          CLI: escribe web/public/model/entreaguas.glb
  check-model.mjs       CLI: valida el GLB optimizado
  view-map.json         correspondencia escena -> render + fov (se edita en Tarea 5)
  floors.json           alturas de corte por piso (se mide en Tarea 4)
web/
  index.html
  src/main.js           arranque y cableado
  src/scene.js          renderer, luces, carga
  src/floors.js         selector de piso
  src/views.js          vistas, vuelo, fundido
  src/ui.js             controles en pantalla
  src/math.js           funciones puras compartidas
  src/quality.js        degradación por rendimiento
  src/style.css
  public/renders/       copia de los 13 renders con nombres normalizados
tests/                  *.test.js (Vitest)
```

---

### Task 1: Proyecto y extracción de vistas

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `tools/lib/glb.js`, `tools/lib/views.js`, `tools/extract-views.mjs`, `tools/view-map.json`
- Test: `tests/glb.test.js`, `tests/views-build.test.js`

**Interfaces:**
- Produces:
  - `readGlbJson(path: string): object` — el bloque JSON del GLB.
  - `applyRoot(rootMatrix: number[16], p: [x,y,z]): [x,y,z]` — glTF column-major.
  - `applyRootQuat(rootMatrix: number[16], q: [x,y,z,w]): [x,y,z,w]`
  - `buildViews(gltfJson, viewMap): View[]`
  - `View = { id, scene: string|null, floor: 'PB'|'P1'|'P2'|'EXT', render: string|null, position: [x,y,z]|null, quaternion: [x,y,z,w]|null, fov: number }`
  - `tools/view-map.json`: `[{ id, scene, floor, render, fov }]`, 13 entradas, `fov` inicial 60. Correspondencia inicial por nombre: `PB-Vista 1..4`→`pb-a..d`, `PA1-Vista 1`,`PA1-Vista 2`,`PA-Vista 3`,`PA-Vista 4`→`p1-a..d`, `PA2-Vista1`,`PA2-Vista 2..4`→`p2-a..d`, `Escena21`→`fachada`. Es provisional; la Tarea 5 la corrige.
  - `npm run views` escribe `web/public/views.json`.

- [ ] **Step 1:** `npm init`, instalar dependencias del Tech Stack con versión exacta, scripts `dev` (`vite web`), `build`, `test` (`vitest run`), `views`, `optimize`, `check`. `git init` y `.gitignore` según Global Constraints.
- [ ] **Step 2: Pruebas que fallan**

```js
// tests/glb.test.js
const ROOT = [1,0,0,0, 0,4.49e-11,-1,0, 0,1,4.49e-11,0, 0,0,0,1];
test('applyRoot pasa de Z arriba a Y arriba', () => {
  const p = applyRoot(ROOT, [136.0814, 34.0256, 1.5]);
  expect(p[0]).toBeCloseTo(136.0814); expect(p[1]).toBeCloseTo(1.5); expect(p[2]).toBeCloseTo(-34.0256);
});
test('readGlbJson lee el modelo real', () => {
  const j = readGlbJson('santiago mercado.glb');
  expect(j.nodes.some(n => n.name === 'PB-Vista 1')).toBe(true);
});
// tests/views-build.test.js
test('vista con escena existente trae posición convertida', () => { /* PB-Vista 1 -> position[1] ≈ 1.5 */ });
test('escena inexistente deja position y quaternion en null, conserva render', () => {});
test('entrada sin render deja render null y no lanza', () => {});
test('devuelve una View por entrada del mapa, en el mismo orden', () => {});
```

- [ ] **Step 3:** `npm test` → falla por funciones no definidas.
- [ ] **Step 4:** Implementar `glb.js` y `views.js`. La orientación de la escena se compone con la rotación de la matriz raíz; el nodo de escena de SketchUp mira por su eje −Z local con +Y arriba (se confirma visualmente en Tarea 5; si no, se corrige ahí con una rotación fija y su prueba).
- [ ] **Step 5:** `npm test` → pasa. `npm run views` → `web/public/views.json` con 13 entradas.
- [ ] **Step 6:** Commit `chore: proyecto y extracción de vistas`.

---

### Task 2: Optimización del modelo

**Files:**
- Create: `tools/optimize.mjs`, `tools/check-model.mjs`, `tools/lib/stats.js`
- Test: `tests/stats.test.js`

**Interfaces:**
- Consumes: `readGlbJson`.
- Produces:
  - `modelStats(gltfJson, byteLength): { bytes, drawnTriangles, materials, extensionsUsed: string[], maxTextureNote }` — `drawnTriangles` cuenta cada malla una vez por nodo que la usa (incluye `EXT_mesh_gpu_instancing`).
  - `checkStats(stats): string[]` — lista de incumplimientos; vacía si cumple los límites de Global Constraints.
  - `npm run optimize` → `web/public/model/entreaguas.glb`. `npm run check` → sale con código 1 e imprime los incumplimientos si los hay.

- [ ] **Step 1: Pruebas que fallan**

```js
test('checkStats acepta 19 MB y 1.4 M triángulos sin extensión antigua', () => { expect(checkStats(ok)).toEqual([]); });
test('checkStats rechaza 21 MB', () => { expect(checkStats({...ok, bytes: 21e6})).toHaveLength(1); });
test('checkStats rechaza 1.6 M triángulos', () => {});
test('checkStats rechaza KHR_materials_pbrSpecularGlossiness', () => {});
test('modelStats del original da 5 678 081 triángulos y 53 materiales', () => {});
```

- [ ] **Step 2:** `npm test` → falla.
- [ ] **Step 3:** Implementar `stats.js` y `check-model.mjs`.
- [ ] **Step 4:** Implementar `optimize.mjs` con gltf-transform, en este orden: `metalRough()`, `dedup()`, `instance()`, `weld()`, `simplify()` solo sobre mallas con más de 5 000 triángulos (ratio 0.25, error 0.001), `prune()`, `textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048] })`, `meshopt()`. Conserva los nodos de escena vacíos (no deben podarse: excluirlos de `prune` con `keepLeaves: true`).
- [ ] **Step 5:** `npm run optimize && npm run check` → sin incumplimientos. Si excede triángulos, bajar el ratio de `simplify` a 0.15 solo para los materiales de sillas (`Cherry Highgloss 300cm`, `_Sollos_Cadeira …`); si aun así excede, registrar el valor real y avisar al usuario antes de seguir.
- [ ] **Step 6:** `npm run views` contra el GLB optimizado da las mismas posiciones que contra el original (agregar esta comparación como prueba en `tests/views-build.test.js`).
- [ ] **Step 7:** Commit `feat: optimización del modelo`.

---

### Task 3: Visor base y verificación del modelo crudo

**Files:**
- Create: `web/index.html`, `web/src/main.js`, `web/src/scene.js`, `web/src/math.js`, `web/src/style.css`
- Test: `tests/load-error.test.js`

**Interfaces:**
- Produces:
  - `createViewer(canvas): Promise<{ scene, camera, renderer, controls, model, bounds: Box3, onFrame(fn), setClipHeight(y|null) }>`
  - `describeLoadError(err: { kind: 'webgl'|'network'|'parse', status?: number }): string` (en `math.js`) — mensajes: `'Tu navegador no admite gráficos 3D (WebGL).'`, `'No se pudo descargar el modelo. Revisa tu conexión y recarga.'`, `'El archivo del modelo está dañado.'`
  - `?model=raw` en la URL carga `/@fs/…/santiago mercado.glb` solo en desarrollo.

- [ ] **Step 1: Prueba que falla** — tres casos de `describeLoadError` con los textos exactos de arriba, más `kind` desconocido → texto de red.
- [ ] **Step 2:** `npm test` → falla.
- [ ] **Step 3:** Implementar. `GLTFLoader` con `MeshoptDecoder`; `OrbitControls` con amortiguación; `ACESFilmicToneMapping`, salida sRGB; `RoomEnvironment` como entorno teñido cálido; una `DirectionalLight` color `#ffd2a1` baja desde el lado de los ventanales con sombras; materiales cuyo nombre contiene `vidrio`, `Glass` o `Agua` → transparentes, sin escritura de profundidad. Cámara inicial: tres cuartos exterior calculada desde `bounds`. Barra de progreso con el `onProgress` del loader. Detección de WebGL antes de crear el renderer.
- [ ] **Step 4:** `npm test` → pasa. `npm run dev`; abrir en el navegador; consola sin errores; el modelo se ve y se orbita.
- [ ] **Step 5: Verificación del modelo crudo (spec, verificación 1).** Capturar el modelo desde arriba y desde las posiciones de `PB-Vista 1`, `PA1-Vista 1` y `PA2-Vista1`; comparar con `PB A`, `1 piso A`, `2 Piso A` y anotar en `docs/superpowers/notes/faltantes-modelo.md` qué elementos de los renders no están en el modelo (vegetación, velas, vajilla, tiras LED). **Informar al usuario y esperar su visto bueno antes de la Tarea 4.**
- [ ] **Step 6:** Commit `feat: visor base`.

---

### Task 4: Selector de piso

**Files:**
- Create: `web/src/floors.js`, `tools/floors.json`, `tools/measure-floors.mjs`
- Modify: `web/src/math.js`, `web/src/main.js`
- Test: `tests/floors.test.js`

**Interfaces:**
- Consumes: `viewer.setClipHeight(y|null)`, `viewer.bounds`.
- Produces:
  - `tools/floors.json`: `{ PB: { floorY, clipY }, P1: {…}, P2: {…} }` en metros, sistema del visor. Se copia a `web/public/floors.json`.
  - `clipHeightFor(floors, selection: 'ALL'|'PB'|'P1'|'P2'): number|null` — `ALL` → `null`; un piso → su `clipY`.
  - `topDownPose(bounds, floor): { position, target }` — cámara cenital inclinada 35° sobre el piso elegido.
  - `initFloors(viewer, floors, onChange)`.

- [ ] **Step 1:** `measure-floors.mjs` lista la altura Y mínima de las mallas con materiales de piso (`Flooring Parquet Parallel D01 120cm`, `Tiles Simple 03 100cm`, `Tiles L02 200cm`) agrupada en bandas; de ahí salen los tres `floorY`. `clipY` de cada piso = `floorY` del piso siguiente − 0,05; para `P2`, `bounds.max.y` − 0,05 medido bajo la cubierta. Escribir `floors.json` con los valores medidos.
- [ ] **Step 2: Pruebas que fallan** — `clipHeightFor` para las cuatro selecciones; selección desconocida → `null`; `topDownPose` apunta al centro en planta de `bounds` y queda por encima de `clipY`.
- [ ] **Step 3:** `npm test` → falla. Implementar. El corte usa `renderer.clippingPlanes` con un plano horizontal. → pasa.
- [ ] **Step 4:** En el navegador: cada piso muestra su interior desde arriba y coincide con `PB.pdf`, `PA.pdf`, `PA1.pdf` (barra, escalera, mesas en su lugar).
- [ ] **Step 5:** Commit `feat: selector de piso`.

---

### Task 5: Vistas guardadas y fundido al render

**Files:**
- Create: `web/src/views.js`, `web/public/renders/*.jpg` (copias: `fachada.jpg`, `pb-a.jpg`…`p2-d.jpg`)
- Modify: `web/src/math.js`, `web/src/main.js`, `tools/view-map.json`
- Test: `tests/views-math.test.js`, `tests/flight.test.js`

**Interfaces:**
- Consumes: `views.json` (`View[]`), `viewer`.
- Produces (en `math.js`):
  - `fitRect(imgW, imgH, boxW, boxH): { x, y, w, h }` — contener, centrado.
  - `verticalFovFor(fovAtImageAspect, imgAspect, viewportAspect): number` — fov vertical de la cámara para que el modelo cubra lo mismo que el render dentro de su rectángulo contenido.
  - `groupViews(views): { floor, items: View[] }[]` — orden `EXT, PB, P1, P2`; omite entradas sin `render`.
  - `createFlight(): { start(from, to, ms, onUpdate, onDone), cancel(), active: boolean }` — interpolación de posición (lerp) y orientación (slerp) con suavizado; `start` durante un vuelo cancela el anterior sin llamar a su `onDone`.
- Produces (en `views.js`): `initViews(viewer, views, ui)`; estado `'free' | 'flying' | 'render' | 'model'`.

- [ ] **Step 1: Pruebas que fallan**

```js
test('render 1402x1122 en pantalla 390x844 se contiene con bandas', () => {
  expect(fitRect(1402,1122,390,844)).toEqual({ x:0, y: expect.closeTo(265.9,1), w:390, h: expect.closeTo(312.1,1) });
});
test('mismo aspecto: verticalFovFor devuelve el fov original', () => {});
test('pantalla más alta que el render: fov vertical mayor que el original', () => {});
test('groupViews ordena EXT, PB, P1, P2 y omite vistas sin render', () => {});
test('groupViews conserva vistas con render y sin posición', () => {});
test('segundo start cancela el primero: onDone del primero no se llama', () => {});
test('cancel deja active en false', () => {});
```

- [ ] **Step 2:** `npm test` → falla. Implementar `math.js` y `createFlight`. → pasa.
- [ ] **Step 3:** Implementar `views.js`: al elegir una vista con posición, vuelo de 1,4 s y luego el render aparece con fundido de 0,6 s en un `<img>` posicionado con `fitRect`; con vista sin posición, solo el render. Botón `Render / Modelo` alterna la opacidad. Cualquier gesto de órbita en estado `render` o `model` vuelve a `free` y retira la imagen. Cambio de tamaño de ventana recalcula `fitRect` y el fov.
- [ ] **Step 4: Calce (spec, verificación 4).** Con `?calibrar` en la URL: el render se muestra al 50 % y las teclas `[` `]` cambian el fov mostrando su valor. Para cada una de las 13 vistas: confirmar a ojo qué escena corresponde a qué render, corregir `tools/view-map.json`, ajustar `fov` hasta que muros, aberturas y muebles coincidan, `npm run views`. Guardar una captura por vista en `docs/superpowers/notes/calce/`. Una vista que no calce con ninguna escena queda con `scene: null` y se informa.
- [ ] **Step 5:** Commit `feat: vistas guardadas`.

---

### Task 6: Interfaz, rendimiento y verificación final

**Files:**
- Create: `web/src/ui.js`, `web/src/quality.js`
- Modify: `web/src/main.js`, `web/src/style.css`, `web/index.html`
- Test: `tests/quality.test.js`

**Interfaces:**
- Consumes: `initFloors`, `initViews`, `groupViews`, `viewer.onFrame`.
- Produces:
  - `nextQuality(level: 0|1|2, avgFps: number): 0|1|2` — baja un nivel si `avgFps < 24`, sube si `avgFps > 50`, nunca sale de 0–2. Nivel 2: sombras y pixel ratio hasta 2; nivel 1: sin sombras, hasta 1,5; nivel 0: sin sombras, 1.
  - `applyQuality(viewer, level)`.

- [ ] **Step 1: Pruebas que fallan** — `nextQuality(2, 20) === 1`, `(0, 10) === 0`, `(1, 55) === 2`, `(2, 60) === 2`, `(1, 30) === 1`.
- [ ] **Step 2:** `npm test` → falla. Implementar. El promedio se toma cada 2 s; no se evalúa durante un vuelo. → pasa.
- [ ] **Step 3:** Usar la skill `frontend-design:frontend-design` para la interfaz: título `Entreaguas Resto Bar`, botones de piso `Todo · PB · 1.º piso · 2.º piso`, tira de miniaturas agrupada por piso (horizontal con desplazamiento en celular), botón `Render / Modelo`, ayuda breve `Arrastra para girar · pellizca o rueda para acercar`. Paleta tomada de los renders (madera, piedra, bordó). Áreas táctiles de 44 px como mínimo; todo operable con teclado.
- [ ] **Step 4: Verificación final (spec, verificación 5).** `npm test`, `npm run check`, `npm run build`. En el navegador, a tamaño escritorio y a 375×812: órbita, los cuatro botones de piso y las 13 vistas, consola sin errores. Capturas de ambas medidas.
- [ ] **Step 5:** Commit `feat: interfaz y rendimiento`.
