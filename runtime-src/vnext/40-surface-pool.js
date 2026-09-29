/* ToSampool Runtime vNext source module: reusable local effect surfaces. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function makeCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
    }
    return null;
  }
  function create() {
    const free = new Map();
    let peakPixels = 0, acquires = 0, reuses = 0, backingSizeWrites = 0, workPixels = 0, pixelPasses = 0;
    function acquire(width, height) {
      width = Math.max(1, Math.ceil(width)); height = Math.max(1, Math.ceil(height));
      const key = `${width}x${height}`;
      const bucket = free.get(key);
      const reused = !!(bucket && bucket.length), canvas = reused ? bucket.pop() : makeCanvas(width, height);
      if (!canvas) throw new Error('当前环境无法创建离屏 Canvas');
      // Reassigning an unchanged Canvas dimension clears and reallocates its backing
      // store. Every consumer explicitly clears/draws its working surface, so reuse
      // must retain the existing backing store instead.
      if (canvas.width !== width) { canvas.width = width; backingSizeWrites += 1; }
      if (canvas.height !== height) { canvas.height = height; backingSizeWrites += 1; }
      acquires += 1; if (reused) reuses += 1;
      peakPixels = Math.max(peakPixels, width * height);
      return canvas;
    }
    function release(canvas) {
      if (!canvas) return;
      const key = `${canvas.width}x${canvas.height}`;
      const bucket = free.get(key) || []; bucket.push(canvas); free.set(key, bucket);
    }
    function beginFrame(){workPixels=0;pixelPasses=0;}
    function notePixels(width,height,passes){passes=Math.max(1,+passes||1);workPixels+=Math.max(1,Math.round(width))*Math.max(1,Math.round(height))*passes;pixelPasses+=passes;}
    function clear() { free.clear(); peakPixels = 0; acquires = 0; reuses = 0; backingSizeWrites = 0; beginFrame(); }
    return Object.freeze({ acquire, release, beginFrame, notePixels, clear, stats: () => ({ peakPixels, acquires, reuses, backingSizeWrites, workPixels, pixelPasses }) });
  }
  api.modules.surfaces = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
