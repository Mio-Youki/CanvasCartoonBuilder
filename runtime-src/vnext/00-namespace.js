/* ToSampool Runtime vNext source module: shared namespace. */
(function (global) {
  'use strict';

  const existing = global.ToSampoolRuntimeVNext || {};
  const modules = existing.modules || Object.create(null);
  global.ToSampoolRuntimeVNext = existing;
  existing.modules = modules;
  const blendModes = Object.freeze(new Set(['multiply', 'darken', 'screen', 'lighten', 'overlay', 'soft-light', 'difference', 'luminosity', 'saturation', 'hue', 'color', 'lighter']));
  modules.blend = Object.freeze({ toCanvas: value => blendModes.has(value) ? value : 'source-over' });
  existing.VERSION = 1;
})(typeof window !== 'undefined' ? window : globalThis);
