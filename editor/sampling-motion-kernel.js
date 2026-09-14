(function (global) {
  'use strict';

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function phaseAt(config, time, defaults) {
    config = config || {}; defaults = defaults || {};
    const period = Math.max(.1, +config.period || defaults.period || 2);
    const steps = clamp(Math.round(+config.steps || defaults.steps || 12), 2, 60);
    const normalized = (((time % period) + period) % period) / period;
    const tick = Math.floor(normalized * steps);
    return { period, steps, tick, phase: tick / steps };
  }

  function fieldConfig(group) {
    if (!group) return null;
    if (group.field) return group.field;
    const legacy = group.grainTide;
    if (!legacy) return null;
    return {
      type: 'wave', scale: legacy.scale || 48,
      speed: legacy.speed == null ? 1 : legacy.speed,
      angle: legacy.angle || 0, period: legacy.period || 4,
      steps: legacy.steps || 24, seed: legacy.seed || 1,
      centerX: .5, centerY: .5,
    };
  }

  function fieldTick(group, time) {
    const config = fieldConfig(group);
    return config ? phaseAt(config, time, { period: 4, steps: 24 }).tick : 0;
  }

  function protectAlpha(field, imageData, width, height, edge, sampleDiv) {
    if (!edge || edge.mode !== 'alpha' || !imageData) return field;
    const strength = clamp(+edge.strength || 0, 0, 1);
    if (!strength) return field;
    const count = width * height, distance = new Float32Array(count);
    const alpha = imageData.data, infinity = width + height + 8;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      distance[i] = alpha[i * 4 + 3] < 8 || x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 0 : infinity;
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1);
      if (y) distance[i] = Math.min(distance[i], distance[i - width] + 1);
    }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x < width - 1) distance[i] = Math.min(distance[i], distance[i + 1] + 1);
      if (y < height - 1) distance[i] = Math.min(distance[i], distance[i + width] + 1);
    }
    const protectedWidth = Math.max(1, (+edge.width || 3) / Math.max(1, sampleDiv || 1));
    for (let i = 0; i < count; i++) {
      if (alpha[i * 4 + 3] < 8) { field[i] = 0; continue; }
      const near = Math.max(0, 1 - distance[i] / protectedWidth);
      field[i] *= 1 - near * strength;
    }
    return field;
  }

  function buildField(group, time, width, height, sampleDiv, imageData, options) {
    const config = fieldConfig(group);
    if (!config) return null;
    options = options || {};
    const timing = phaseAt(config, time, { period: 4, steps: 24 });
    const type = config.type || 'wave', angle = (+config.angle || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const scale = Math.max(2, (+config.scale || 48) / Math.max(1, sampleDiv || 1));
    const speed = Number.isFinite(+config.speed) ? +config.speed : 1;
    const seed = Math.round(+config.seed || 1);
    const centerX = clamp(config.centerX == null ? .5 : +config.centerX, 0, 1) * width;
    const centerY = clamp(config.centerY == null ? .5 : +config.centerY, 0, 1) * height;
    const cache = options.cache || {};
    const preparedKey = [width,height,sampleDiv,type,scale,speed,angle,seed,centerX,centerY,JSON.stringify(group.edge||{}),options.sourceKey||''].join('|');
    if (cache.preparedKey !== preparedKey) {
      cache.preparedKey = preparedKey;
      cache.spatial = new Float32Array(width * height);
      cache.attenuation = null;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        let q = 0;
        if (type === 'radial') q = Math.hypot(x - centerX, y - centerY) / scale;
        else if (type === 'wave') {
          const along = (x * cos + y * sin) / scale;
          const across = (-x * sin + y * cos) / scale;
          q = along + .18 * Math.sin((across * .47 + seed * .137) * Math.PI * 2);
        }
        cache.spatial[y * width + x] = q + seed * .031;
      }
      if (group.edge && imageData) {
        cache.attenuation = new Float32Array(width * height);
        cache.attenuation.fill(1);
        protectAlpha(cache.attenuation, imageData, width, height, group.edge, sampleDiv);
      }
      cache.field = new Float32Array(width * height);
    }
    const offset = timing.phase * speed, field = cache.field;
    for (let i = 0; i < field.length; i++) {
      field[i] = (.5 + .5 * Math.sin((cache.spatial[i] - offset) * Math.PI * 2)) * (cache.attenuation ? cache.attenuation[i] : 1);
    }
    return { tick: timing.tick, field, preparedKey };
  }

  function grainTide(config, fieldFrame) {
    if (!config || !fieldFrame) return null;
    return {
      tick: fieldFrame.tick, field: fieldFrame.field,
      amount: clamp(+config.amount || 0, 0, 1),
      coarseness: clamp(Math.round(+config.coarseness || 5), 2, 12),
      targets: config.targets || 'combined',
    };
  }

  function applyGrain(imageData, width, height, tide) {
    if (!tide || tide.amount <= 0) return imageData;
    const data = imageData.data, source = new Uint8ClampedArray(data);
    const span = Math.max(1, tide.coarseness - 1);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const cell = 1 + Math.floor(tide.field[y * width + x] * tide.amount * span);
      if (cell <= 1) continue;
      const sourceX = Math.min(width - 1, Math.floor(x / cell) * cell);
      const sourceY = Math.min(height - 1, Math.floor(y / cell) * cell);
      const to = (y * width + x) * 4, from = (sourceY * width + sourceX) * 4;
      data[to] = source[from]; data[to + 1] = source[from + 1];
      data[to + 2] = source[from + 2]; data[to + 3] = source[from + 3];
    }
    return imageData;
  }

  function applyThreshold(imageData, options) {
    const data = imageData.data, fieldFrame = options.fieldFrame, tide = options.tide;
    const tideThreshold = tide && (tide.targets === 'combined' || tide.targets === 'threshold');
    for (let i = 0, pixel = 0; i < data.length; i += 4, pixel++) {
      let threshold = options.threshold;
      if (options.sharedField) threshold = options.base + (options.threshold - options.base) * (.2 + .8 * fieldFrame.field[pixel]);
      if (tideThreshold) threshold += (tide.field[pixel] - .5) * 96 * tide.amount;
      threshold = clamp(threshold, 0, 255);
      const luminance = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114;
      const color = luminance < threshold ? options.dark : options.light;
      data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2];
    }
    return imageData;
  }

  function drawDither(context, imageData, width, height, options) {
    const data = imageData.data, cell = options.cell, fieldFrame = options.fieldFrame, tide = options.tide;
    context.clearRect(0, 0, width, height);
    for (let y = -cell + options.phaseY; y < height; y += cell) for (let x = -cell + options.phaseX; x < width; x += cell) {
      let sum = 0, count = 0, alpha = 0;
      const y0 = Math.max(0, Math.floor(y)), y1 = Math.min(height, Math.ceil(y + cell));
      const x0 = Math.max(0, Math.floor(x)), x1 = Math.min(width, Math.ceil(x + cell));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const p = (yy * width + xx) * 4;
        sum += data[p] * .299 + data[p + 1] * .587 + data[p + 2] * .114;
        alpha += data[p + 3]; count++;
      }
      if (!count) continue;
      const fieldIndex = clamp(Math.floor(y + cell / 2), 0, height - 1) * width + clamp(Math.floor(x + cell / 2), 0, width - 1);
      const tideDots = tide && (tide.targets === 'combined' || tide.targets === 'dots');
      const field = fieldFrame ? fieldFrame.field[fieldIndex] : .5;
      const fieldScale = tideDots ? .65 + field * tide.amount * .7 : options.sharedField ? .65 + field * .7 : 1;
      const radius = (1 - sum / count / 255) * cell * .52 * fieldScale, opacity = alpha / count / 255;
      if (opacity > 0) {
        context.globalAlpha = opacity; context.fillStyle = options.light;
        context.fillRect(x, y, cell, cell);
      }
      if (radius > .15 && opacity > 0) {
        context.fillStyle = options.dark; context.beginPath();
        context.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2); context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  global.SamplingMotionKernel = Object.freeze({
    version: 1, phaseAt, fieldConfig, fieldTick, buildField,
    grainTide, applyGrain, applyThreshold, drawDither,
  });
})(typeof window !== 'undefined' ? window : globalThis);
