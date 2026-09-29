/* ToSampool Runtime vNext source module: public self-contained API. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  api.apiVersion = 1;
  api.capabilities = Object.freeze({ fixedTimeRender: 1, deterministicFrames: 1, vnextBase: 1, objectEffects: 0, objectDecorateBase: 1, objectSamplingBase: 1, samplingField: 1, halftone: 1, namedPalettes: 1, textureOverlay: 1, lightEffects: 1, imageAssets: 1, backgroundLayers: 1, groupTransforms: 1, programMotion: 1, sceneTransitions: 1, sharedSpriteParticles: 1, registeredBuiltins: 1, staticMasks: 1, alphaMasks: 1, elementMasks: 1, sceneEffects: 1 });
  api.createRuntime = api.modules.renderer.createRuntime;
  api.renderTo = function renderTo(target, scene, t, options) { return api.createRuntime(scene).renderTo(target, t, options); };
  Object.freeze(api.modules);
  Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
