import { describe, it, expect } from 'vitest';
import { clipFor, CLIPS } from '../web/src/walk.js';

describe('clipFor', () => {
  it('devuelve el clip entre dos vistas seguidas del mismo piso', () => {
    expect(clipFor('pb-a', 'pb-b')).toBe('pb-a-b');
    expect(clipFor('p1-c', 'p1-d')).toBe('p1-c-d');
  });

  it('no hay clip hacia atrás, salteando vistas ni entre pisos', () => {
    expect(clipFor('pb-b', 'pb-a')).toBeNull();
    expect(clipFor('pb-a', 'pb-c')).toBeNull();
    expect(clipFor('pb-d', 'p1-a')).toBeNull();
    expect(clipFor('fachada', 'pb-a')).toBeNull();
  });

  it('solo usa clips que existen', () => {
    expect(clipFor('p2-a', 'p2-b', [])).toBeNull();
    expect(clipFor('p2-a', 'p2-b', ['p2-a-b'])).toBe('p2-a-b');
    expect(clipFor('p2-a', 'p2-b')).toBe('p2-a-b');      // los tres pisos tienen todos sus tramos
  });

  it('la lista de clips coincide con los archivos de recorrido/', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('web/public/recorrido').map(f => f.replace(/\.mp4$/, '')).sort();
    expect([...CLIPS].sort()).toEqual(files);
  });
});
