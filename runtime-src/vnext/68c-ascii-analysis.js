/* CPU ASCII analysis. One reusable working set per Player surface pool. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const pools = new WeakMap();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const weights = sigma => Array.from({ length: 5 }, (_, i) => Math.exp(-((i - 2) ** 2) / (2 * sigma * sigma)));
  const w1 = weights(1), w2 = weights(1.6);
  const sum1 = w1.reduce((a, b) => a + b, 0), sum2 = w2.reduce((a, b) => a + b, 0);

  function stateFor(surfaces) {
    let state = pools.get(surfaces);
    if (!state) {
      state = { edge: null, cell: null, edgeAllocations: 0, cellAllocations: 0 };
      pools.set(surfaces, state);
      surfaces.onClear(() => pools.delete(surfaces));
    }
    return state;
  }

  function directions(pixels, width, height, columns, rows, config, validWidth, validHeight, surfaces) {
    const state = stateFor(surfaces);
    let work = state.edge;
    if (!work || work.width !== width || work.height !== height || work.columns !== columns || work.rows !== rows) {
      work = state.edge = {
        width, height, columns, rows,
        luma: new Float32Array(width * height),
        h1: new Float32Array(width * height), h2: new Float32Array(width * height),
        dog: new Uint8Array(width * height),
        votes: new Uint16Array(columns * rows * 4), result: new Int8Array(columns * rows)
      };
      state.edgeAllocations++;
    }
    const { luma, h1, h2, dog, votes, result } = work;
    const lastX = clamp(Math.floor(validWidth) - 1, 0, width - 1);
    const lastY = clamp(Math.floor(validHeight) - 1, 0, height - 1);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = (Math.min(y, lastY) * width + Math.min(x, lastX)) * 4;
      luma[y * width + x] = (.2126 * pixels[p] + .7152 * pixels[p + 1] + .0722 * pixels[p + 2]) / 255 * pixels[p + 3] / 255;
    }
    // Share source reads between the two Gaussian passes, preserving Float32 rounding.
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const base = y * width;
      const a = luma[base + Math.max(0, x - 2)], b = luma[base + Math.max(0, x - 1)], c = luma[base + x];
      const d = luma[base + Math.min(width - 1, x + 1)], e = luma[base + Math.min(width - 1, x + 2)];
      h1[base + x] = (a*w1[0] + b*w1[1] + c*w1[2] + d*w1[3] + e*w1[4]) / sum1;
      h2[base + x] = (a*w2[0] + b*w2[1] + c*w2[2] + d*w2[3] + e*w2[4]) / sum2;
    }
    const threshold = .001 + (1 - clamp(finite(config.edgeSensitivity, .75), 0, 1)) * .04;
    for (let y = 0; y < height; y++) {
      const a = Math.max(0, y - 2) * width, b = Math.max(0, y - 1) * width, c = y * width;
      const d = Math.min(height - 1, y + 1) * width, e = Math.min(height - 1, y + 2) * width;
      for (let x = 0; x < width; x++) {
        const narrow = Math.fround((h1[a+x]*w1[0] + h1[b+x]*w1[1] + h1[c+x]*w1[2] + h1[d+x]*w1[3] + h1[e+x]*w1[4]) / sum1);
        const wide = Math.fround((h2[a+x]*w2[0] + h2[b+x]*w2[1] + h2[c+x]*w2[2] + h2[d+x]*w2[3] + h2[e+x]*w2[4]) / sum2);
        dog[c + x] = narrow - wide >= threshold ? 1 : 0;
      }
    }
    votes.fill(0); result.fill(-1);
    const tangent = Math.SQRT2 - 1;
    for (let y = 0; y < height; y++) {
      const above = Math.max(0, y - 1) * width, center = y * width, below = Math.min(height - 1, y + 1) * width;
      const row = Math.floor(y / 4) * columns;
      for (let x = 0; x < width; x++) {
        const left = Math.max(0, x - 1), right = Math.min(width - 1, x + 1);
        const a = dog[above+left], b = dog[above+x], c = dog[above+right], d = dog[center+left];
        const e = dog[center+right], f = dog[below+left], g = dog[below+x], h = dog[below+right];
        const gx = c + 2*e + h - a - 2*d - f, gy = f + 2*g + h - a - 2*b - c;
        if (!gx && !gy) continue;
        // Equivalent four tangent sectors; integer Sobel gradients cannot hit the irrational boundary.
        const direction = Math.abs(gx) < Math.abs(gy)*tangent ? 0 : Math.abs(gy) < Math.abs(gx)*tangent ? 1 : gx*gy > 0 ? 2 : 3;
        votes[(row + Math.floor(x / 4))*4 + direction]++;
      }
    }
    const minimum = Math.max(1, Math.ceil(clamp(finite(config.edgeCoverage, .25), 0, 1) * 16));
    for (let i = 0; i < result.length; i++) {
      let best = 0;
      for (let d = 1; d < 4; d++) if (votes[i*4+d] > votes[i*4+best]) best = d;
      if (votes[i*4+best] >= minimum) result[i] = best;
    }
    return result;
  }

  function cells(pixels, alphaPixels, columns, rows, detail, glyphs, config, directionsByCell, surfaces) {
    const state = stateFor(surfaces);
    let work = state.cell;
    if (!work || work.columns !== columns || work.rows !== rows) {
      work = state.cell = { columns, rows, colors: new Uint8Array(columns*rows*4), indices: new Uint8Array(columns*rows*4) };
      state.cellAllocations++;
    }
    const { colors, indices } = work;
    colors.fill(0); indices.fill(0);
    const width = columns * detail, exposure = Math.max(0, finite(config.exposure, 1));
    const attenuation = Math.max(.01, finite(config.attenuation, 1)), inverse = !!config.invert;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      let red = 0, green = 0, blue = 0, weight = 0;
      for (let y = 0; y < detail; y++) for (let x = 0; x < detail; x++) {
        const p = ((row*detail+y)*width + column*detail+x)*4, a = pixels[p+3] / 255;
        red += pixels[p]*a; green += pixels[p+1]*a; blue += pixels[p+2]*a; weight += a;
      }
      const p = (row * columns + column) * 4;
      // Keep partial final cells and representative Alpha independent from edge padding.
      if (!weight) {
        if (!alphaPixels[p+3]) continue;
        red = alphaPixels[p]; green = alphaPixels[p+1]; blue = alphaPixels[p+2]; weight = 1;
      }
      red /= weight; green /= weight; blue /= weight;
      let brightness = Math.pow(clamp((.2126*red + .7152*green + .0722*blue)/255*exposure, 0, 1), attenuation);
      if (inverse) brightness = 1 - brightness;
      const direction = directionsByCell && directionsByCell[row*columns+column];
      const glyph = direction != null && direction >= 0 && glyphs.edges[direction] >= 0 ? glyphs.edges[direction] : glyphs.lut[Math.round(brightness*255)];
      colors[p] = Math.round(red); colors[p+1] = Math.round(green); colors[p+2] = Math.round(blue); colors[p+3] = 255;
      indices[p] = glyph % 256; indices[p+1] = Math.floor(glyph / 256); indices[p+2] = alphaPixels[p+3]; indices[p+3] = 255;
    }
    // Borrowed views: valid until this pool's next ASCII apply; consumed synchronously.
    return work;
  }

  function statistics(surfaces) {
    const state = pools.get(surfaces), edge = state?.edge, cell = state?.cell;
    const bytes = values => values.reduce((sum, value) => sum + (value?.byteLength || 0), 0);
    return Object.freeze({
      edgeBytes: edge ? bytes([edge.luma, edge.h1, edge.h2, edge.dog, edge.votes, edge.result]) : 0,
      cellBytes: cell ? bytes([cell.colors, cell.indices]) : 0,
      edgeAllocations: state?.edgeAllocations || 0, cellAllocations: state?.cellAllocations || 0
    });
  }
  api.modules.asciiAnalysis = Object.freeze({ directions, cells, statistics });
})(typeof window !== 'undefined' ? window : globalThis);
