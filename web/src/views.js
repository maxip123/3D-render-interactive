// Vistas guardadas: vuelo de cámara a la escena y fundido al render original.
import * as THREE from 'three';
import { fitRect, verticalFovFor, createFlight } from './math.js';

const FLY_MS = 1400;
const FREE_FOV = 50;

/**
 * @param viewer  el visor de scene.js
 * @param views   contenido de views.json
 * @param img     <img> superpuesto donde se muestra el render
 * @param onState (state: 'free'|'flying'|'render'|'model', view|null) => void
 * @returns {{ open(id), flyTo({position,target}), showRender(on: boolean), state(): string, current(): object|null }}
 */
export function initViews(viewer, views, img, onState) {
  const { camera, controls, renderer } = viewer;
  const flight = createFlight();
  let state = 'free', current = null;

  const set = (next, view = current) => { state = next; current = view; onState?.(state, current); };
  const cameraPose = () => ({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov });
  const apply = pose => {
    camera.position.fromArray(pose.position);
    camera.quaternion.fromArray(pose.quaternion);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
  };
  const viewport = () => ({ w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight });
  const fovFor = view => {
    const { w, h } = viewport();
    const aspect = img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1402 / 1122;
    return verticalFovFor(view.fov, aspect, w / h);
  };
  const layout = () => {
    if (!img.naturalWidth) return;
    const { w, h } = viewport();
    const r = fitRect(img.naturalWidth, img.naturalHeight, w, h);
    Object.assign(img.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  };
  const hide = () => img.classList.remove('visible');

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
    current = view;
    img.onload = () => { layout(); if (state === 'render' && current === view && view.position) apply({ ...cameraPose(), fov: fovFor(view) }); };
    img.src = `/renders/${view.render}`;
    img.alt = `Render original: ${view.id}`;
    if (!view.position) {            // render sin escena en el modelo: solo la imagen
      flight.cancel(); layout(); img.classList.add('visible'); set('render', view);
      return;
    }
    fly({ position: view.position, quaternion: view.quaternion, fov: fovFor(view) }, () => {
      layout(); img.classList.add('visible'); set('render', view);
    });
  }

  function flyTo({ position, target }) {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...position), new THREE.Vector3(...target), camera.up);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const dist = new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...target));
    fly({ position, quaternion: q.toArray(), fov: FREE_FOV }, () => { handBackToControls(dist); set('free', null); });
  }

  function showRender(on) {
    if (state !== 'render' && state !== 'model') return;
    img.classList.toggle('visible', on);
    set(on ? 'render' : 'model');
  }

  // Cualquier gesto sobre el modelo devuelve el control a la persona.
  controls.addEventListener('start', () => {
    if (state === 'flying') { flight.cancel(); handBackToControls(); set('free', null); }
    else if (state === 'render' || state === 'model') { hide(); handBackToControls(); set('free', null); }
  });
  viewer.onFrame(dt => flight.tick(dt * 1000));
  window.addEventListener('resize', () => {
    layout();
    if ((state === 'render' || state === 'model') && current?.position) apply({ ...cameraPose(), fov: fovFor(current) });
  });

  return { open, flyTo, showRender, state: () => state, current: () => current, setFov(deg) { if (current) { current.fov = deg; apply({ ...cameraPose(), fov: fovFor(current) }); } } };
}
