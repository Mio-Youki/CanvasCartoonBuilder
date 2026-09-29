/* ToSampool Runtime vNext source module: shared namespace. */
(function (global) {
  'use strict';

  const existing = global.ToSampoolRuntimeVNext || {};
  const modules = existing.modules || Object.create(null);
  global.ToSampoolRuntimeVNext = existing;
  existing.modules = modules;
  existing.VERSION = 1;
})(typeof window !== 'undefined' ? window : globalThis);
