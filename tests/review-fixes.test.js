// Pruebas de los hallazgos de la revisión final.
import { test, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { initFloors } from '../web/src/floors.js';
import { initViews } from '../web/src/views.js';
import { verticalFovFor, renderBox } from '../web/src/math.js';

const floorsData = {
  PB: { floorY: 0, clipY: 2.3, box: { min: [130, -41], max: [161, -32] } },
  P1: { floorY: 5.1, clipY: 7.4, box: { min: [123, -39], max: [151, -33] } },
  P2: { floorY: 8.6, clipY: 10.9, box: { min: [116, -39], max: [140, -33] } },
};

function fakeViewer({ w = 800, h = 600 } = {}) {
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
  const controls = new THREE.EventDispatcher(); controls.target = new THREE.Vector3();
  const frames = [];
  return {
    camera, controls, frames,
    renderer: { domElement: { clientWidth: w, clientHeight: h } },
    bounds: new THREE.Box3(new THREE.Vector3(107, 0, -41), new THREE.Vector3(164, 19, -32)),
    setClipHeight() {}, freeze() {}, onFrame: fn => frames.push(fn),
    homePose: () => ({ position: new THREE.Vector3(), target: new THREE.Vector3() }),
    run(ms) { for (const fn of frames) fn(ms / 1000); },
  };
}
function fakeImg() {
  const classes = new Set();
  return { style: {}, naturalWidth: 0, naturalHeight: 0, complete: false, onload: null, src: '', alt: '',
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) },
    load() { this.naturalWidth = 1402; this.naturalHeight = 1122; this.complete = true; this.onload?.(); } };
}
const VIEWS = [
  { id: 'pb-a', floor: 'PB', render: 'pb-a.jpg', position: [136, 1.5, -34], quaternion: [0, 0, 0, 1], fov: 46 },
  { id: 'p2-a', floor: 'P2', render: 'p2-a.jpg', position: [117, 10, -34], quaternion: [0, 0.7071, 0, 0.7071], fov: 50 },
];
beforeEach(() => { globalThis.window = { addEventListener() {} }; });

test('la cámara de piso no depende del fov que dejó la vista abierta', () => {
  const v = fakeViewer();
  const floors = initFloors(v, floorsData);
  const normal = floors.select('PB');
  v.camera.fov = 100;
  expect(floors.select('PB').position).toEqual(normal.position);
});

test('arrastrar fuera de un render devuelve el fov libre de 50°', () => {
  const v = fakeViewer({ w: 375, h: 812 }); const img = fakeImg();
  const views = initViews(v, VIEWS, img, () => {});
  views.open('pb-a'); img.load(); v.run(2000);
  expect(views.state()).toBe('render');
  expect(v.camera.fov).toBeGreaterThan(60);
  v.controls.dispatchEvent({ type: 'start' });
  expect(views.state()).toBe('free');
  expect(v.camera.fov).toBe(50);
});

test('el render no se muestra hasta que su imagen cargó', () => {
  const v = fakeViewer(); const img = fakeImg();
  const views = initViews(v, VIEWS, img, () => {});
  views.open('pb-a'); v.run(2000);
  expect(img.classList.contains('visible')).toBe(false);
  img.load();
  expect(img.classList.contains('visible')).toBe(true);
  expect(views.state()).toBe('render');
});

test('al cambiar de vista se oculta el render anterior antes de cargar el nuevo', () => {
  const v = fakeViewer(); const img = fakeImg();
  const views = initViews(v, VIEWS, img, () => {});
  views.open('pb-a'); img.load(); v.run(2000);
  views.open('p2-a');
  expect(img.classList.contains('visible')).toBe(false);
  v.run(2000);                       // llegó, pero la imagen nueva aún no cargó
  expect(img.classList.contains('visible')).toBe(false);
  img.load();
  expect(img.classList.contains('visible')).toBe(true);
  expect(views.current().id).toBe('p2-a');
});

test('renderBox reserva franjas iguales arriba y abajo para los controles', () => {
  expect(renderBox(800, 600, 76)).toEqual({ x: 0, y: 76, w: 800, h: 448 });
});
test('renderBox nunca deja menos de un tercio de la altura', () => {
  expect(renderBox(812, 180, 76).h).toBe(60);
});
test('verticalFovFor: el render ocupa parte de la altura y abarca su fov', () => {
  const v = verticalFovFor(60, 448, 600);
  const half = Math.tan(v * Math.PI / 360) * (448 / 600);
  expect(2 * Math.atan(half) * 180 / Math.PI).toBeCloseTo(60, 3);
  expect(verticalFovFor(60, 600, 600)).toBeCloseTo(60);
});
