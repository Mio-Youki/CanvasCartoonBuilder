(function (global) {
  'use strict';

  const presets = Object.freeze([
    Object.freeze({
      id: 'rain', name: '雨',
      parts: Object.freeze([{ type: 'line', x: 0, y: 0, x2: 0, y2: 5, stroke: '#8fb8e8', strokeWidth: 1 }]),
      particle: Object.freeze({ count: 60, rate: 60, life: 1.2, speed: 160, dir: 90, spread: 0, gravity: 260, wind: 30, spin: 0, spinSpeed: 0, sizeVar: .1, alpha: .7, fade: true, seed: 1 }),
    }),
    Object.freeze({
      id: 'snow', name: '雪',
      parts: Object.freeze([{ type: 'rect', x: 0, y: 0, w: 2, h: 2, fill: '#eef4ff' }]),
      particle: Object.freeze({ count: 30, rate: 30, life: 3, speed: 18, dir: 90, spread: 35, gravity: 0, wind: 12, spin: 0, spinSpeed: 120, sizeVar: .6, alpha: .9, fade: true, seed: 1 }),
    }),
    Object.freeze({
      id: 'sparks', name: '火星',
      parts: Object.freeze([{ type: 'rect', x: 0, y: 0, w: 2, h: 2, fill: '#ffd66c' }]),
      particle: Object.freeze({ count: 50, rate: 0, burst: true, life: 1.2, speed: 70, dir: 270, spread: 360, gravity: 120, wind: 0, spin: 0, spinSpeed: 0, sizeVar: .35, alpha: 1, fade: true, seed: 1 }),
    }),
    Object.freeze({
      id: 'dust', name: '光尘',
      parts: Object.freeze([{ type: 'rect', x: 0, y: 0, w: 3, h: 3, fill: 'rgba(150,170,190,0.25)' }]),
      particle: Object.freeze({ count: 20, rate: 8, life: 5, speed: 4, dir: 0, spread: 90, gravity: 0, wind: 6, spin: 0, spinSpeed: 0, sizeVar: .8, alpha: .5, fade: true, seed: 1 }),
    }),
  ]);

  global.EditorParticleRegistry = Object.freeze({ version: 1, presets });
})(typeof window !== 'undefined' ? window : globalThis);
