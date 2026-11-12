import { createViewer, hasWebGL } from './scene.js';
import { describeLoadError } from './math.js';
import * as THREE from 'three';
import { initFloors } from './floors.js';

const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const loadingBar = document.getElementById('loading-bar');

function fail(err) {
  loading.classList.add('error');
  loadingText.textContent = describeLoadError(err);
}

async function start() {
  if (!hasWebGL()) return fail({ kind: 'webgl' });
  let viewer;
  try {
    viewer = await createViewer(document.getElementById('stage'), {
      modelUrl: '/model/entreaguas.glb',
      onProgress: f => { loadingBar.style.width = `${Math.round(f * 100)}%`; },
    });
  } catch (err) {
    console.error(err);
    return fail(err);
  }
  const floorsData = await fetch('/floors.json').then(r => r.json());
  const floors = initFloors(viewer, floorsData);
  const moveTo = pose => {
    viewer.camera.position.fromArray(pose.position);
    viewer.controls.target.fromArray(pose.target);
  };
  moveTo(floors.select('ALL'));
  loading.classList.add('done');
  if (import.meta.env.DEV) window.__floor = id => moveTo(floors.select(id));
  if (import.meta.env.DEV) {
    window.__viewer = viewer;   // para depurar desde la consola
    window.__pick = (x, y) => {
      const r = new THREE.Raycaster();
      const el = viewer.renderer.domElement;
      r.setFromCamera(new THREE.Vector2(x / el.clientWidth * 2 - 1, -(y / el.clientHeight) * 2 + 1), viewer.camera);
      const hit = r.intersectObject(viewer.model, true)[0];
      if (!hit) return null;
      const g = hit.object.geometry;
      const box = new THREE.Box3().setFromObject(hit.object).getSize(new THREE.Vector3());
      return { material: hit.object.material.name, tris: (g.index ? g.index.count : g.attributes.position.count) / 3,
        instanced: hit.object.isInstancedMesh ? hit.object.count : 0, size: box.toArray().map(n => +n.toFixed(2)), uv: hit.uv?.toArray().map(n => +n.toFixed(2)),
        tex: hit.object.material.map ? [hit.object.material.map.image.width, hit.object.material.map.image.height] : null };
    };
  }
}

start();
