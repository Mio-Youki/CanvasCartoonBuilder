/* ToSampool Runtime vNext: bounded, deterministic grain frame bank. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const frames = new Map();
  const budget = 40 * 1024 * 1024;
  let bytes = 0, builds = 0;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = value => Math.max(1, Math.round(finite(value, 1)));
  function canvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    if (global.document && global.document.createElement) {
      const result = global.document.createElement('canvas');
      result.width = width; result.height = height;
      return result;
    }
    return null;
  }
  function tick(config, time) {
    const motion = config && config.motion;
    if (!motion || !motion.enabled) return 0;
    const steps = Math.max(1, Math.min(120, Math.round(finite(motion.steps, 8))));
    return api.modules.motion.refresh({...motion,steps},time,{frames:8});
  }
  function build(width, height, seed, colorMode, frameTick) {
    const result = canvas(width, height);
    if (!result) return null;
    const ctx = result.getContext('2d');
    if (!ctx || typeof ctx.createImageData !== 'function') return null;
    const pixels = ctx.createImageData(width, height), data = pixels.data;
    let state = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(frameTick + 1, 0x85ebca6b) ^ 0xa341316c) >>> 0;
    if (!state) state = 1;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
    for (let i = 0; i < data.length; i += 4) {
      data[i] = random() & 255;
      data[i + 1] = colorMode === 'rgb' ? random() & 255 : data[i];
      data[i + 2] = colorMode === 'rgb' ? random() & 255 : data[i];
      data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    builds += 1;
    return result;
  }
  function frame(width, height, config, time) {
    const cell = Math.min(16, positive(config && config.size));
    const workWidth = Math.max(1, Math.ceil(width / cell)), workHeight = Math.max(1, Math.ceil(height / cell));
    const seed = Math.round(finite(config && config.seed, 1));
    const mode = config && config.colorMode === 'rgb' ? 'rgb' : 'mono';
    const frameTick = tick(config, time);
    const key = [workWidth, workHeight, seed, mode, frameTick].join(':');
    if (frames.has(key)) {
      const entry = frames.get(key);
      frames.delete(key); frames.set(key, entry);
      return entry.canvas;
    }
    const result = build(workWidth, workHeight, seed, mode, frameTick);
    if (!result) return null;
    const cost = workWidth * workHeight * 4;
    if (cost <= budget) {
      while (bytes + cost > budget && frames.size) {
        const oldest = frames.keys().next().value;
        bytes -= frames.get(oldest).bytes;
        frames.delete(oldest);
      }
      frames.set(key, { canvas: result, bytes: cost });
      bytes += cost;
    }
    return result;
  }
  function stats() { return { frames: frames.size, bytes, budget, builds }; }
  api.modules.grain = Object.freeze({ frame, tick, stats });
})(typeof window !== 'undefined' ? window : globalThis);
