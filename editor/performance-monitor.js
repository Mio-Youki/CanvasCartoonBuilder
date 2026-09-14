(function (global) {
  'use strict';
  function percentile(values, p) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
  }
  function create() {
    let mode = 'auto', samples = [], autoInterval = 82;
    function interval() { return mode === 'full' ? 82 : mode === 'draft' ? 166 : autoInterval; }
    function record(ms) {
      if (!Number.isFinite(ms)) return;
      samples.push(ms); if (samples.length > 90) samples.shift();
      if (mode !== 'auto' || samples.length < 8) return;
      const p95 = percentile(samples, .95);
      if (p95 > 70) autoInterval = 166;
      else if (p95 > 38) autoInterval = Math.max(autoInterval, 125);
      else if (p95 < 24) autoInterval = 82;
      else if (p95 < 32 && autoInterval > 125) autoInterval = 125;
    }
    function setMode(next) { mode = ['auto', 'full', 'draft'].includes(next) ? next : 'auto'; samples = []; autoInterval = 82; }
    function pixelDivMultiplier() {
      if (mode === 'draft') return 2;
      if (mode === 'auto' && autoInterval >= 166) return 2;
      return 1;
    }
    function snapshot() {
      const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      const p95 = percentile(samples, .95), ms = interval();
      return { mode, samples: samples.length, avg, p95, interval: ms, targetFps: Math.round(1000 / ms), pixelDivMultiplier: pixelDivMultiplier() };
    }
    return Object.freeze({ interval, record, setMode, snapshot, pixelDivMultiplier });
  }
  function maskArea(mask, w, h) {
    if (!mask || mask.type === 'none') return w * h;
    if (mask.type === 'poly' && Array.isArray(mask.points) && mask.points.length) {
      const xs = mask.points.map(p => +p[0] || 0), ys = mask.points.map(p => +p[1] || 0);
      return Math.max(1, Math.min(w, Math.max(...xs) - Math.min(...xs))) * Math.max(1, Math.min(h, Math.max(...ys) - Math.min(...ys)));
    }
    return Math.max(1, Math.min(w, +mask.w || w)) * Math.max(1, Math.min(h, +mask.h || h));
  }
  // 保守估算 CPU 像素循环的工作量；用于提示瓶颈，不参与场景渲染或序列化。
  function estimate(scene, multiplier) {
    scene = scene || {}; multiplier = Math.max(1, +multiplier || 1);
    const w = Math.max(1, +scene.w || 320), h = Math.max(1, +scene.h || 180);
    let workPixels = 0, passes = 0;
    const add = (area, div, count) => { const n = Math.max(1, +div || 1) * multiplier; workPixels += Math.max(1, area / (n * n)) * (count || 1); passes += count || 1; };
    const fx = scene.fx || {};
    const globalPixel = fx.palette && fx.palette !== 'none' || +fx.hue || +fx.brightness || (fx.contrast != null && +fx.contrast !== 1) || (fx.saturation != null && +fx.saturation !== 1);
    if (globalPixel) add(w * h, fx.pixelDiv, 1);
    (fx.layers || []).forEach(layer => {
      if (!layer || layer.hidden) return;
      const pixel = layer.palette && layer.palette !== 'none' || +layer.hue || +layer.brightness || (layer.contrast != null && +layer.contrast !== 1) || (layer.saturation != null && +layer.saturation !== 1);
      if (pixel) add(maskArea(layer.mask, w, h), layer.pixelDiv, 1);
    });
    (scene.images || []).forEach(image => {
      const style = image && image.style || {}, motion = style.samplingMotion || {}, imageFx = style.imageFx || {};
      const threshold = !!motion.thresholdPulse || imageFx.mode === 'threshold', dither = !!motion.ditherDrift || imageFx.mode === 'halftone';
      if (threshold || dither) add(Math.max(1, (+image.w || 1) * (+image.h || 1)), image.pixelDiv, (threshold ? 1 : 0) + (dither ? 1 : 0));
    });
    return { canvasPixels: w * h, workPixels: Math.round(workPixels), passes };
  }
  global.EditorPerformance = Object.freeze({ create, estimate });
})(typeof window !== 'undefined' ? window : globalThis);
