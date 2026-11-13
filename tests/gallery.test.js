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
  expect(img.style.top).toBe('76px');
  expect(img.style.height).toBe('448px');
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
