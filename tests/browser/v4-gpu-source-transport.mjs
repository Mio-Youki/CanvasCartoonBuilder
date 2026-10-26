#!/usr/bin/env node
// Transport-only diagnostic. No production shader/Player path is replaced.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => p && existsSync(p));
if (!edge) throw new Error('Edge not found');
const photoData = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
  await page.goto('about:blank');
  const bitmapAlpha = process.argv.includes('--bitmap-alpha');
  const result = await page.evaluate(async ({data, bitmapAlpha}) => {
    const photo = await new Promise((done, fail) => {
      const image = new Image(); image.onload = () => done(image); image.onerror = fail; image.src = data;
    });
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const summary = values => {
      const sorted = values.slice().sort((a, b) => a - b);
      return { median: +sorted[Math.ceil(sorted.length * .5) - 1].toFixed(3),
        p95: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(3), max: +sorted.at(-1).toFixed(3) };
    };
    const compare = (a, b, w, h) => {
      const x = a.getContext('2d').getImageData(0, 0, w, h).data;
      const y = b.getContext('2d').getImageData(0, 0, w, h).data;
      let rgb = 0, alpha = 0, premultipliedMax = 0;
      for (let i = 0; i < x.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          rgb += Math.abs(x[i + c] - y[i + c]);
          premultipliedMax = Math.max(premultipliedMax,
            Math.abs(Math.round(x[i + c] * x[i + 3] / 255) - Math.round(y[i + c] * y[i + 3] / 255)));
        }
        alpha += Math.abs(x[i + 3] - y[i + 3]);
      }
      return { rgb: +(rgb / (w * h * 3)).toFixed(4), alpha: +(alpha / (w * h)).toFixed(4), premultipliedMax };
    };
    const rows = [];
    const modes = ['canvas-static', 'canvas-redraw-identical', 'canvas-animated',
      'offscreen-redraw-identical', 'bitmap-static', 'texture-reuse-static'];
    if (bitmapAlpha) modes.push('bitmap-premultiplied');
    let renderer;
    for (let repetition = 0; repetition < 2; repetition++) {
      const order = repetition ? modes.slice().reverse() : modes;
      for (const [w, h] of [[640, 360], [1920, 1080]]) for (const mode of order) {
        const source = mode.startsWith('offscreen') ? new OffscreenCanvas(w, h) : canvas(w, h);
        const sourceCtx = source.getContext('2d');
        const paint = phase => {
          sourceCtx.clearRect(0, 0, w, h); sourceCtx.globalAlpha = .8;
          sourceCtx.drawImage(photo, 0, 0, w, h); sourceCtx.globalAlpha = 1;
          sourceCtx.fillStyle = '#ed795b'; sourceCtx.fillRect(w * .07, h * .09, w * .15, h * .13);
          sourceCtx.fillStyle = '#517bb8'; sourceCtx.fillRect(w * .79, h * .7, w * .14, h * .17);
          sourceCtx.fillStyle = '#f5d565'; sourceCtx.beginPath();
          sourceCtx.ellipse(w * (.5 + Math.sin(phase) * .04), h * .5, w * .07, h * .1, 0, 0, Math.PI * 2); sourceCtx.fill();
        };
        paint(0);
        let bitmap = null, bitmapPreparationMs = 0;
        if (mode.startsWith('bitmap')) {
          const start = performance.now();
          bitmap = await createImageBitmap(source, { imageOrientation: 'flipY', premultiplyAlpha: mode === 'bitmap-premultiplied' ? 'premultiply' : 'none', colorSpaceConversion: 'none' });
          bitmapPreparationMs = performance.now() - start;
        }
        const output = canvas(w, h), target = canvas(w, h), targetCtx = target.getContext('2d');
        target.style.width = '960px'; target.style.height = `${h / w * 960}px`; document.body.replaceChildren(target);
        const gl = output.getContext('webgl2', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
        if (!gl) throw new Error('WebGL2 unavailable');
        const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        if (!timer) throw new Error('GPU timer unavailable');
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        const compile = (type, text) => {
          const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s;
        };
        const vertex = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));gl_Position=vec4(p[gl_VertexID],0,1);}');
        const fragment = compile(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;uniform sampler2D image;uniform vec2 size;uniform bool sourcePremultiplied;out vec4 color;void main(){color=texture(image,gl_FragCoord.xy/size);if(sourcePremultiplied&&color.a>0.0)color.rgb/=color.a;}');
        const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        gl.deleteShader(vertex); gl.deleteShader(fragment); gl.useProgram(program);
        gl.uniform1i(gl.getUniformLocation(program, 'image'), 0); gl.uniform2f(gl.getUniformLocation(program, 'size'), w, h);
        gl.uniform1i(gl.getUniformLocation(program, 'sourcePremultiplied'), mode === 'bitmap-premultiplied' ? 1 : 0);
        const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
        for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
        for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.viewport(0, 0, w, h);
        const upload = () => gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap || source);
        const metrics = {}, queries = [], gaps = [];
        const add = (key, value) => (metrics[key] || (metrics[key] = [])).push(value);
        const measure = (key, fn, active) => {
          let query;
          if (active && (key === 'upload' || key === 'draw')) { query = gl.createQuery(); gl.beginQuery(timer.TIME_ELAPSED_EXT, query); }
          const start = performance.now(); fn(); const elapsed = performance.now() - start;
          if (query) { gl.endQuery(timer.TIME_ELAPSED_EXT); queries.push({ key, query }); }
          if (active) add(key, elapsed);
        };
        upload(); // Initialization and first upload are outside playback timing.
        const render = (frame, active) => {
          const start = performance.now();
          if (mode.includes('redraw')) measure('sourcePaint', () => paint(0), active);
          else if (mode === 'canvas-animated') measure('sourcePaint', () => paint(frame / 60), active);
          if (mode !== 'texture-reuse-static') measure('upload', upload, active);
          measure('draw', () => gl.drawArrays(gl.TRIANGLES, 0, 3), active);
          measure('validation', () => { if (gl.getError() !== gl.NO_ERROR) throw new Error('GL error'); }, active);
          measure('canvasOutput', () => { targetCtx.clearRect(0, 0, w, h); targetCtx.drawImage(output, 0, 0); }, active);
          if (active) add('completeCall', performance.now() - start);
        };
        for (let i = 0; i < 8; i++) render(i, false);
        let previous = 0;
        for (let i = 8; i < 72; i++) {
          const time = await new Promise(requestAnimationFrame); if (previous) gaps.push(time - previous); previous = time; render(i, true);
        }
        gl.finish(); await new Promise(done => setTimeout(done, 60));
        const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT), device = {};
        for (const { key, query } of queries) {
          if (!disjoint && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) (device[key] || (device[key] = [])).push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(query);
        }
        const expected = canvas(w, h); expected.getContext('2d').drawImage(source, 0, 0);
        const visual = compare(expected, target, w, h);
        rows.push({ repetition, size: `${w}x${h}`, mode, bitmapPreparationMs: +bitmapPreparationMs.toFixed(3),
          mainThreadMs: Object.fromEntries(Object.entries(metrics).map(([key, values]) => [key, summary(values)])),
          deviceMs: Object.fromEntries(Object.entries(device).map(([key, values]) => [key, { ...summary(values), samples: values.length }])),
          frameGapMs: summary(gaps), over25msPercent: +(gaps.filter(x => x > 25).length / gaps.length * 100).toFixed(2),
          disjoint, error: gl.getError(), queryCount: queries.length, visual });
        bitmap?.close(); gl.deleteTexture(texture); gl.deleteProgram(program); gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
    return { renderer, framesPerCase: 64, repetitions: 2, bitmapAlpha, rows };
  }, {data: photoData, bitmapAlpha});
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.rows.length, bitmapAlpha ? 28 : 24);
  for (const row of result.rows) {
    assert.equal(row.error, 0); assert.equal(row.disjoint, false);
    assert.equal(row.deviceMs.draw.samples, 64);
    assert.equal(row.queryCount, row.mode === 'texture-reuse-static' ? 64 : 128);
    if (row.mode !== 'texture-reuse-static') assert.equal(row.deviceMs.upload.samples, 64);
    assert.ok(row.visual.rgb < .6 && row.visual.alpha < .05 && row.visual.premultipliedMax <= 2, JSON.stringify(row));
  }
  if (process.argv.includes('--write-report')) writeFileSync(resolve(root, `docs/architecture/v4-gpu-source-transport${bitmapAlpha ? '-bitmap-alpha' : ''}-result.json`), JSON.stringify(result, null, 2) + '\n');
} finally { await browser.close(); }
