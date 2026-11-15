import { test, expect } from 'vitest';
import { initGallery } from '../web/src/gallery.js';

function fakeImg() {
  const classes = new Set();
  return { style: {}, naturalWidth: 0, naturalHeight: 0, onload: null, src: '', alt: '',
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    load() { this.naturalWidth = 1402; this.naturalHeight = 1122; this.onload?.(); } };
}
const V = (id, floor, render = `${id}.jpg`) => ({ id, floor, render, position: null, quaternion: null, fov: 50 });
const VIEWS = [V('p2-a', 'P2'), V('pb-a', 'PB'), V('sin', 'PB', null), V('fachada', 'EXT')];
const setup = () => {
  const img = fakeImg(), states = [];
  const g = initGallery(VIEWS, img, () => ({ w: 800, h: 600 }), (s, v) => states.push([s, v?.id]), '/');
  return { img, g, states };
};

test('abrir una vista la muestra cuando su imagen cargó, entera y bajo la franja superior', () => {
  const { img, g, states } = setup();
  g.open('pb-a');
  expect(img.src).toBe('/renders/pb-a.jpg');
  expect(img.classList.contains('visible')).toBe(false);
  img.load();
  expect(img.classList.contains('visible')).toBe(true);
  expect(states.at(-1)).toEqual(['render', 'pb-a']);
  expect(img.style.top).toBe('64px');
  expect(img.style.height).toBe('472px');
});
test('al cambiar de vista se oculta la anterior hasta que carga la nueva', () => {
  const { img, g } = setup();
  g.open('pb-a'); img.load();
  g.open('p2-a');
  expect(img.classList.contains('visible')).toBe(false);
  expect(g.current().id).toBe('p2-a');
});
test('siguiente y anterior recorren EXT, PB, P1, P2 en círculo y saltan vistas sin render', () => {
  const { g } = setup();
  g.open('fachada');
  g.step(1); expect(g.current().id).toBe('pb-a');
  g.step(1); expect(g.current().id).toBe('p2-a');
  g.step(1); expect(g.current().id).toBe('fachada');
  g.step(-1); expect(g.current().id).toBe('p2-a');
});
test('una vista inexistente o sin render no cambia nada', () => {
  const { g } = setup();
  g.open('fachada'); g.open('sin'); g.open('nada');
  expect(g.current().id).toBe('fachada');
});
test('first() devuelve la primera vista en orden de galería', () => {
  expect(setup().g.first().id).toBe('fachada');
});

// Recorrido de mentira: guarda con qué clips se armó y deja disparar los avisos a mano.
function fakeWalk() {
  const w = { armed: null, hooks: null, advanced: 0, canAdvance: true,
    arm(next, prev, hooks) { w.armed = [next, prev]; w.hooks = hooks; },
    advance() { if (!w.hooks || !w.armed[0] || !w.canAdvance) return false; w.advanced++; return true; },
    finish() {}, busy: () => false };
  return w;
}
const PB = [V('pb-a', 'PB'), V('pb-b', 'PB'), V('pb-c', 'PB')];
const walking = () => {
  const img = fakeImg(), walk = fakeWalk(), states = [], legs = [];
  const g = initGallery(PB, img, () => ({ w: 800, h: 600 }), (s, v) => states.push(v.id), '/', walk, leg => legs.push(leg));
  return { img, walk, states, legs, g };
};

test('cada vista se arma con el clip hacia la siguiente y el que llega desde la anterior', () => {
  const { img, walk, g } = walking();
  g.open('pb-a'); img.load();
  expect(walk.armed).toEqual(['pb-a-b', null]);
  g.open('pb-b');
  expect(walk.armed).toEqual([null, null]);          // mientras carga no se puede arrastrar
  img.load();
  expect(walk.armed).toEqual(['pb-b-c', 'pb-a-b']);
});

test('ir a la vista siguiente camina hasta ella y cambia de render sin fundido', () => {
  const { img, walk, states, g } = walking();
  g.open('pb-a'); img.load();
  g.go('pb-b');
  expect(walk.advanced).toBe(1);
  expect(g.current().id).toBe('pb-a');                // todavía va caminando
  walk.hooks.commit(1);
  expect(g.current().id).toBe('pb-b');
  expect(states.at(-1)).toBe('pb-b');
  expect(img.src).toBe('/renders/pb-b.jpg');
  expect(img.classList.contains('visible')).toBe(true);   // el último cuadro del clip sigue encima
});

test('arrastrar hacia atrás vuelve a la vista anterior', () => {
  const { img, walk, g } = walking();
  g.open('pb-b'); img.load();
  walk.hooks.commit(-1);
  expect(g.current().id).toBe('pb-a');
  expect(img.src).toBe('/renders/pb-a.jpg');
});

test('ir hacia atrás o salteando vistas no camina: abre con fundido', () => {
  const { img, walk, g } = walking();
  g.open('pb-b'); img.load();
  g.step(-1);
  expect(walk.advanced).toBe(0);
  expect(g.current().id).toBe('pb-a');
  img.load();
  g.go('pb-c');
  expect(walk.advanced).toBe(0);
  expect(img.classList.contains('visible')).toBe(false);
});

test('mientras se camina avisa el tramo y el avance para el mapa', () => {
  const { img, walk, legs, g } = walking();
  g.open('pb-b'); img.load();
  walk.hooks.progress(0.4);
  expect(legs.at(-1)).toEqual(['pb-b', 'pb-c', 0.4]);
  walk.hooks.progress(-0.25);
  expect(legs.at(-1)).toEqual(['pb-a', 'pb-b', 0.75]);
  walk.hooks.progress(0);
  expect(legs.at(-1)).toBeNull();
});

test('tras detenerse (modo 3D) no abre nada, y al reanudar vuelve a mostrar la vista pedida', () => {
  const { img, walk, g } = walking();
  g.open('pb-a'); img.load();
  g.stop();
  g.open('pb-b');
  expect(g.current().id).toBe('pb-a');
  expect(walk.armed).toEqual([null, null]);
  g.start('pb-c');
  expect(g.current().id).toBe('pb-c');
  img.load();
  expect(img.classList.contains('visible')).toBe(true);
  expect(walk.armed).toEqual([null, 'pb-b-c']);
});
