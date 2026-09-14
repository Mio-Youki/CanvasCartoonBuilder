(function (global) {
  'use strict';

  const transientKeys = Object.freeze(new Set([
    '_img', '_asset', '_imageFxCache', '_editorImageFxCache', '_programFn',
    '_programSource', '_fontSource', '_textRasterToken', '_imageLoadPromise',
    '_imageLoadRef',
  ]));

  function createReplacer(options) {
    const preserveLinkedDataUrls = !!(options && options.preserveLinkedDataUrls);
    return function sceneReplacer(key, value) {
      if (transientKeys.has(key)) return undefined;
      // History snapshots can reconnect linked images through srcId, so omit their heavy data URL.
      // Saved scenes preserve it to remain self-contained outside the editor.
      if (key === 'src' && !preserveLinkedDataUrls && typeof value === 'string' && value.indexOf('data:') === 0 && this && this.srcId) return undefined;
      // A font connection is editor metadata; the rasterized text image is the portable render source.
      if (key === 'source' && this && typeof this.id === 'string' && this.id.indexOf('font_') === 0) return undefined;
      return value;
    };
  }

  function stringify(scene, options) {
    options = options || {};
    return JSON.stringify(scene, createReplacer(options), options.space == null ? 0 : options.space);
  }

  global.EditorSceneSerializer = Object.freeze({ transientKeys, createReplacer, stringify });
})(typeof window !== 'undefined' ? window : globalThis);
