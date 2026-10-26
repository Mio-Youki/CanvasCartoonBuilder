#!/usr/bin/env node
// Isolated diagnostic; does not change the production renderer.
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
if (!edge) throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const photoData = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?gpu-noise-diagnostic=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ToSampoolRuntimeVNext?.modules?.sampling);
  const results = await page.evaluate(async photoData => {
    const width = 640, height = 360, runtime = window.ToSampoolRuntimeVNext;
    const photo = await new Promise((done, fail) => { const image = new Image(); image.onload = () => done(image); image.onerror = fail; image.src = photoData; });
    const source = document.createElement('canvas'); source.width = width; source.height = height;
    source.getContext('2d').drawImage(photo, 0, 0, width, height);
    const flat = document.createElement('canvas'); flat.width = width; flat.height = height;
    const flatCtx = flat.getContext('2d'); flatCtx.fillStyle = '#808080'; flatCtx.fillRect(0, 0, width, height);
    const glCanvas = document.createElement('canvas'); glCanvas.width = width; glCanvas.height = height;
    const gl = glCanvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL 不可用');
    const vertex = 'attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}';
    const fragment = `precision highp float;varying vec2 uv;uniform sampler2D src,noiseTex;
      uniform vec2 size;uniform float seed,mode;
      float hash(vec2 p){return fract(sin(dot(p+seed,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec4 pixel=texture2D(src,uv);vec2 cell=floor(uv*size);
        float sampleValue=mode<.5?hash(cell):(mode<1.5?hash(mod(cell,vec2(8.0))):texture2D(noiseTex,uv).r);
        float delta=(sampleValue*2.0-1.0)*.18;
        gl_FragColor=vec4(clamp(pixel.rgb+vec3(delta),0.0,1.0),pixel.a);}`;
    const compile = (kind, text) => { const shader = gl.createShader(kind); gl.shaderSource(shader, text); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; };
    const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    gl.useProgram(program); const a = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const upload = image => { const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); return texture; };
    // Same per-row xorshift and byte selection as the production noise-dither path.
    const noise = document.createElement('canvas'); noise.width = width; noise.height = height;
    const noiseCtx = noise.getContext('2d'), noiseImage = noiseCtx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      let state = (Math.imul(8, 0x9e3779b1) ^ Math.imul(1, 0x85ebca6b) ^ Math.imul(y + 1, 0xc2b2ae35)) >>> 0;
      if (!state) state = 1;
      for (let x = 0; x < width; x++) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; const byte = state & 255, i = (y * width + x) * 4; noiseImage.data[i] = noiseImage.data[i+1] = noiseImage.data[i+2] = byte; noiseImage.data[i+3] = 255; }
    }
    noiseCtx.putImageData(noiseImage, 0, 0);
    const noiseTexture = upload(noise);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, noiseTexture); gl.uniform1i(gl.getUniformLocation(program, 'noiseTex'), 1);
    gl.uniform2f(gl.getUniformLocation(program, 'size'), width, height); gl.uniform1f(gl.getUniformLocation(program, 'seed'), 7);
    const gpu = (image, mode) => { gl.activeTexture(gl.TEXTURE0); const input = upload(image); gl.uniform1i(gl.getUniformLocation(program, 'src'), 0); gl.uniform1f(gl.getUniformLocation(program, 'mode'), mode); gl.viewport(0, 0, width, height); gl.drawArrays(gl.TRIANGLES, 0, 3); const output = document.createElement('canvas'); output.width = width; output.height = height; output.getContext('2d').drawImage(glCanvas, 0, 0); gl.deleteTexture(input); return output; };
    const cpu = image => runtime.modules.sampling.noiseDither(image, { enabled: true, amount: 18, size: 1, seed: 7, colorMode: 'mono' }, runtime.modules.surfaces.create(), 0);
    const error = (left, right) => { const a = left.getContext('2d').getImageData(0, 0, width, height).data, b = right.getContext('2d').getImageData(0, 0, width, height).data; let sum = 0; for (let i=0;i<a.length;i+=4) sum += Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]); return +(sum/(width*height*3)).toFixed(3); };
    const rows = [];
    for (const [kind, image] of [['photo', source], ['flat', flat]]) {
      const frames = [cpu(image), gpu(image, 0), gpu(image, 1), gpu(image, 2)];
      const contact = document.createElement('canvas'); contact.id = `gpu-noise-${kind}`; contact.width = width * frames.length; contact.height = height; const ctx = contact.getContext('2d'); frames.forEach((frame, index) => ctx.drawImage(frame, index * width, 0)); contact.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;display:none'; document.body.append(contact);
      rows.push({ kind, variants: ['CPU xorshift', 'GPU float sin-hash', 'GPU bounded sin-hash', 'GPU cached xorshift texture'], meanRgbError: frames.slice(1).map(frame => error(frames[0], frame)) });
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), rows };
  }, photoData);
  for(const row of results.rows){assert.ok(row.meanRgbError[0]>10,`${row.kind}: 原浮点哈希应显著偏离 CPU`);assert.ok(row.meanRgbError[2]<.1,`${row.kind}: 缓存随机纹理应与 CPU 对齐`);}
  console.log(JSON.stringify(results, null, 2));
  for (const kind of ['photo', 'flat']) { await page.evaluate(kind => { document.querySelector(`#gpu-noise-${kind}`).style.display = 'block'; }, kind); await page.locator(`#gpu-noise-${kind}`).screenshot({ path: resolve(root, 'docs/architecture', `v4-gpu-noise-diagnostic-${kind}.png`) }); }
} finally { await browser.close(); }
