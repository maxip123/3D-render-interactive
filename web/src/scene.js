// Renderer, luces y carga del modelo. No sabe nada de pisos, vistas ni interfaz.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const GLASS = /vidrio|glass|agua|translucent/i;

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function loadModel(url, onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => {
    loader.load(url, gltf => resolve(gltf.scene),
      e => { if (e.total) onProgress?.(e.loaded / e.total); },
      err => reject({ kind: err instanceof SyntaxError || /JSON|parse|glTF/i.test(String(err?.message)) ? 'parse' : 'network' }));
  });
}

function prepareMaterials(model) {
  model.traverse(obj => {
    if (!obj.isMesh) return;
    obj.castShadow = obj.receiveShadow = true;
    for (const m of [].concat(obj.material)) {
      m.side = THREE.DoubleSide;           // SketchUp no garantiza caras orientadas
      if (GLASS.test(m.name)) {
        m.transparent = true; m.depthWrite = false;
        m.opacity = Math.min(m.opacity, 0.35); m.roughness = 0.05;
        obj.castShadow = false;
      }
    }
  });
}

/**
 * @returns {Promise<{scene, camera, renderer, controls, model, bounds, sun,
 *   onFrame(fn): void, setClipHeight(y: number|null): void, homePose(): {position, target},
 *   freeze(on: boolean): void, frozen: boolean}>}
 */
export async function createViewer(canvas, { modelUrl, onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1512');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;

  const model = await loadModel(modelUrl, onProgress);
  prepareMaterials(model);
  scene.add(model);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  // Luz cálida de atardecer, baja, entrando en diagonal.
  const sun = new THREE.DirectionalLight('#ffd2a1', 2.4);
  sun.position.copy(center).add(new THREE.Vector3(size.x * 0.35, size.y * 1.6, size.z * 1.4));
  sun.target.position.copy(center);
  const reach = Math.max(size.x, size.z) * 0.75;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: reach * 6 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#ffdfc0', '#3a2a1e', 0.45));

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  // El corte por piso no afecta al pase de sombras: los pisos ocultos seguirían
  // sombreando el interior expuesto, así que con corte activo el sol no proyecta sombra.
  let shadowsWanted = false, clipped = false;
  const syncShadows = () => { sun.castShadow = shadowsWanted && !clipped; };
  const setShadows = on => { shadowsWanted = on; syncShadows(); };
  const setClipHeight = y => {
    clipped = y != null;
    if (clipped) { clip.constant = y; renderer.clippingPlanes = [clip]; }
    else renderer.clippingPlanes = [];
    syncShadows();
  };

  const homePose = () => ({
    position: center.clone().add(new THREE.Vector3(-size.x * 0.25, size.y * 1.7, size.z * 2.4)),
    target: center.clone(),
  });
  const home = homePose();
  camera.position.copy(home.position);
  controls.target.copy(home.target);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  // Con la cámara "congelada" los controles no la reposicionan (vuelos y vistas exactas).
  let frozen = false;
  const frameFns = [];
  let last = performance.now();
  const loop = now => {
    const dt = (now - last) / 1000; last = now;
    for (const fn of frameFns) fn(dt, now);
    if (!frozen) controls.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);
  // Fuera del modo 3D no se dibuja: el modelo queda cargado para volver sin esperar.
  const run = on => { last = performance.now(); renderer.setAnimationLoop(on ? loop : null); if (on) resize(); };

  return { scene, camera, renderer, controls, model, bounds, sun, onFrame: fn => frameFns.push(fn), setClipHeight, setShadows, homePose, resize, run,
    freeze: on => { frozen = on; }, get frozen() { return frozen; } };
}
