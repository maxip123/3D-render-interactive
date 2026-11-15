import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { PLANS, planPoint, planHeading, FLOOR_STACK } from '../web/src/plans.js';
import { walkOffset, walkSettle, stageMargin } from '../web/src/math.js';

const views = JSON.parse(readFileSync('web/public/views.json', 'utf8'));
const view = id => views.find(v => v.id === id);

describe('planos', () => {
  it('hay un plano por piso y su archivo existe', () => {
    expect(FLOOR_STACK).toEqual(['P2', 'P1', 'PB']);
    for (const id of FLOOR_STACK) expect(existsSync(`web/public/${PLANS[id].src}`)).toBe(true);
  });

  it('todas las vistas interiores caen dentro de su plano', () => {
    for (const v of views.filter(v => PLANS[v.floor])) {
      const p = planPoint(PLANS[v.floor], v.position);
      expect(p.x, v.id).toBeGreaterThan(0.02); expect(p.x, v.id).toBeLessThan(0.99);
      expect(p.y, v.id).toBeGreaterThan(0.05); expect(p.y, v.id).toBeLessThan(0.95);
    }
  });

  it('el baño de planta baja queda a la derecha y la barra del 2.º piso también', () => {
    const bath = planPoint(PLANS.PB, view('pb-d').position);
    expect(bath.x).toBeGreaterThan(0.78);                 // los baños ocupan el extremo derecho del plano
    const first = planPoint(PLANS.PB, view('pb-a').position);
    expect(first.x).toBeLessThan(0.25); expect(first.y).toBeGreaterThan(0.7);   // junto a la escalera, abajo a la izquierda
  });

  it('el rumbo sigue hacia dónde mira la cámara, en grados horarios desde la derecha del plano', () => {
    expect(planHeading(view('pb-a').quaternion)).toBeCloseTo(-15, 0);   // mira a la derecha, apenas hacia arriba
    const b = planHeading(view('pb-b').quaternion);
    expect(Math.abs(b)).toBeGreaterThan(155);                           // mira a la izquierda
    expect(planHeading(view('pb-d').quaternion)).toBeGreaterThan(45);   // hacia abajo a la derecha (los lavatorios)
  });
});

describe('arrastre para caminar', () => {
  it('arrastrar a la izquierda avanza y a la derecha retrocede', () => {
    expect(walkOffset(-100, 1000, true, true, 1)).toBeCloseTo(0.1);
    expect(walkOffset(250, 1000, true, true, 1)).toBeCloseTo(-0.25);
  });
  it('la ganancia hace que no haga falta arrastrar todo el ancho', () => {
    expect(walkOffset(-500, 1000, true, true, 2)).toBe(1);
  });
  it('no pasa de los extremos ni va hacia donde no hay clip', () => {
    expect(walkOffset(-5000, 1000, true, true)).toBe(1);
    expect(walkOffset(5000, 1000, true, true)).toBe(-1);
    expect(walkOffset(-300, 1000, false, true)).toBe(0);
    expect(walkOffset(300, 1000, true, false)).toBe(0);
    expect(walkOffset(-300, 0, true, true)).toBe(0);
  });
  it('al soltar llega a la vista vecina si se pasó el umbral; si no, vuelve', () => {
    expect(walkSettle(0.31)).toBe(1);
    expect(walkSettle(-0.5)).toBe(-1);
    expect(walkSettle(0.2)).toBe(0);
    expect(walkSettle(-0.1)).toBe(0);
  });
});

describe('margen del escenario', () => {
  it('deja menos franja en pantallas angostas', () => {
    expect(stageMargin(1280)).toBe(64);
    expect(stageMargin(375)).toBe(48);
  });
});

describe('caja del render', () => {
  it('en escritorio deja aire a los costados; en pantallas angostas va de borde a borde', async () => {
    const { renderBox, stageGutter } = await import('../web/src/math.js');
    expect(stageGutter(1280)).toBe(32);
    expect(stageGutter(375)).toBe(0);
    expect(renderBox(800, 600, 64, 32)).toEqual({ x: 32, y: 64, w: 736, h: 472 });
    expect(renderBox(800, 600, 64)).toEqual({ x: 0, y: 64, w: 800, h: 472 });
  });
});
