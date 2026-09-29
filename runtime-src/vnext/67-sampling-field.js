/* ToSampool Runtime vNext source module: shared sampling grid, field and edge rule. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (x, y, seed, tick) => { let n = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul((seed | 0) + 1, 69069) ^ Math.imul((tick | 0) + 1, 362437)) >>> 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function tick(config, time) { const motion = config && config.motion || {}; return motion.fieldFlow ? Math.floor(time / Math.max(.001, +motion.period || 3) * Math.max(1, Math.round(+motion.steps || 24))) : 0; }
  function edgeDistance(alpha, width, height) {
    const count = width * height, distance = new Float32Array(count), infinity = width + height + 8;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) distance[y * width + x] = alpha[(y * width + x) * 4 + 3] < 8 || !x || !y || x === width - 1 || y === height - 1 ? 0 : infinity;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = y * width + x; if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1); if (y) distance[i] = Math.min(distance[i], distance[i - width] + 1); }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) { const i = y * width + x; if (x < width - 1) distance[i] = Math.min(distance[i], distance[i + 1] + 1); if (y < height - 1) distance[i] = Math.min(distance[i], distance[i + width] + 1); }
    return distance;
  }
  function build(source, uneven, time) {
    uneven = uneven || {}; const fieldCfg = uneven.field || {}, edge = uneven.edge || {};
    const ctx = source.getContext('2d'); let image;
    try { image = ctx.getImageData(0, 0, source.width, source.height); } catch (error) { throw new Error(`采样场读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    const width = source.width, height = source.height, values = new Float32Array(width * height), enabled = !!fieldCfg.enabled, type = fieldCfg.type || 'wave', contrast = clamp(fieldCfg.contrast == null ? .5 : +fieldCfg.contrast, 0, 1), scale = Math.max(4, +fieldCfg.scale || 48), seed = +fieldCfg.seed || 1, motion = uneven.motion || {}, phase = tick(uneven, time), steps = Math.max(1, Math.round(+motion.steps || 24)), flow = motion.fieldFlow ? phase / steps * (+motion.flowSpeed || 0) : 0, angle = (+fieldCfg.direction || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle), centerX = clamp(fieldCfg.centerX == null ? .5 : +fieldCfg.centerX, 0, 1) * width, centerY = clamp(fieldCfg.centerY == null ? .5 : +fieldCfg.centerY, 0, 1) * height;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let raw = .5;
      if (enabled && type === 'wave') raw = .5 + .5 * Math.sin(((x * cos + y * sin) / scale - flow + seed * .031) * Math.PI * 2);
      else if (enabled && type === 'radial') raw = .5 + .5 * Math.sin((Math.hypot(x - centerX, y - centerY) / scale - flow + seed * .031) * Math.PI * 2);
      else if (enabled && type === 'noise') raw = hash(Math.floor(x / scale), Math.floor(y / scale), seed, phase);
      values[y * width + x] = .5 + (raw - .5) * contrast;
    }
    const mode = edge.mode === 'alpha-lock' ? 'contour' : edge.mode === 'edge-only' ? 'interior' : edge.mode === 'inside-only' ? 'off' : edge.mode || 'off';
    if (mode !== 'off') {
      const distance = edgeDistance(image.data, width, height), edgeWidth = Math.max(1, +edge.width || 2);
      for (let i = 0; i < values.length; i++) { const near = clamp(1 - distance[i] / edgeWidth, 0, 1); if (mode === 'contour') values[i] = .5 + (values[i] - .5) * (1 - near); else if (mode === 'interior') values[i] = .5 + (values[i] - .5) * near; }
    }
    return Object.freeze({ width, height, values, field: fieldCfg, edge, tick: phase });
  }
  api.modules.field = Object.freeze({ build, hash });
})(typeof window !== 'undefined' ? window : globalThis);
