// Vistas guardadas: vuelo de cámara a la escena y fundido al render original.
import * as THREE from 'three';
import { fitRect, renderBox, verticalFovFor, createFlight, FREE_FOV } from './math.js';

const FLY_MS = 1400;
const MARGIN = 76;                         // franja libre para los controles, arriba y abajo
const DEFAULT_SIZE = [1402, 1122];         // tamaño de los renders mientras la imagen no cargó

/**
 * @param viewer  el visor de scene.js
 * @param views   contenido de views.json
 * @param img     <img> superpuesto donde se muestra el render
 * @param onState (state: 'free'|'flying'|'render'|'model', view|null) => void
 * @returns {{ open(id), flyTo({position,target}), showRender(on: boolean), setFov(deg), state(): string, current(): object|null }}
 */
export function initViews(viewer, views, img, onState) {
  const { camera, controls, renderer } = viewer;
  const flight = createFlight();
  let state = 'free', current = null;
  let arrived = false, loaded = false;     // el render aparece solo cuando se cumplen las dos

  const set = (next, view = current) => { state = next; current = view; onState?.(state, current); };
  const cameraPose = () => ({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov });
  const setFov = fov => { if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } };
  const apply = pose => {
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    setFov(pose.fov);
  };

  // Rectángulo del render en pantalla: entero, centrado y sin quedar bajo los controles.
  const renderRect = () => {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const [iw, ih] = img.naturalWidth ? [img.naturalWidth, img.naturalHeight] : DEFAULT_SIZE;
    const box = renderBox(w, h, MARGIN);
    const r = fitRect(iw, ih, box.w, box.h);
    return { x: box.x + r.x, y: box.y + r.y, w: r.w, h: r.h, viewportH: h };
  };
  const fovFor = view => { const r = renderRect(); return verticalFovFor(view.fov, r.h, r.viewportH); };
  const layout = () => {
    const r = renderRect();
    Object.assign(img.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  };
  const hide = () => img.classList.remove('visible');
  const showWhenReady = view => {
    if (current !== view || !arrived || !loaded) return;
    layout();
    if (view.position) setFov(fovFor(view));
    img.classList.add('visible');
    set('render', view);
  };

  // Deja el pivote de órbita delante de la cámara para que soltarla no la haga saltar.
  const handBackToControls = (distance = 3) => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.copy(camera.position).addScaledVector(fwd, distance);
    viewer.freeze(false);
  };

  function fly(to, done) {
    hide();
    viewer.freeze(true);
    set('flying');
    flight.start(cameraPose(), to, FLY_MS, apply, done);
  }

  function open(id) {
    const view = views.find(v => v.id === id);
    if (!view || !view.render) return;
    hide();
    current = view; arrived = false; loaded = false;
    img.onload = () => { if (current === view) { loaded = true; showWhenReady(view); } };
    img.alt = `Render original: ${view.id}`;
    img.src = `${import.meta.env?.BASE_URL ?? '/'}renders/${view.render}`;
    if (!view.position) {            // render sin escena en el modelo: solo la imagen
      flight.cancel(); arrived = true; set('flying', view); showWhenReady(view);
      return;
    }
    fly({ position: view.position, quaternion: view.quaternion, fov: fovFor(view) }, () => { arrived = true; showWhenReady(view); });
  }

  function flyTo({ position, target }) {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...position), new THREE.Vector3(...target), camera.up);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const dist = new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...target));
    current = null;
    fly({ position, quaternion: q.toArray(), fov: FREE_FOV }, () => { handBackToControls(dist); set('free', null); });
  }

  function showRender(on) {
    if (state !== 'render' && state !== 'model') return;
    img.classList.toggle('visible', on);
    set(on ? 'render' : 'model');
  }

  // Cualquier gesto sobre el modelo devuelve el control a la persona, con el fov normal.
  controls.addEventListener('start', () => {
    if (state === 'free') return;
    flight.cancel(); hide(); setFov(FREE_FOV); handBackToControls(); set('free', null);
  });
  viewer.onFrame(dt => flight.tick(dt * 1000));
  window.addEventListener('resize', () => {
    if (state !== 'render' && state !== 'model') return;
    layout();
    if (current?.position) setFov(fovFor(current));
  });

  return {
    open, flyTo, showRender, state: () => state, current: () => current,
    setFov(deg) { if (current) { current.fov = deg; setFov(fovFor(current)); } },
  };
}
