#!/usr/bin/env node
// Balanced, same-page repeated transition stress; no production policy change.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => p && existsSync(p));
if (!edge) throw new Error('Edge not found');
const blockFrames = Number((process.argv.find(s => s.startsWith('--block-frames=')) || '--block-frames=180').split('=')[1]);
if (!Number.isInteger(blockFrames) || blockFrames < 64 || blockFrames > 900) throw new Error('Invalid block frame count');
const data = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
  page.on('console', message => console.log(message.text()));
  await page.goto('about:blank');
  await page.addScriptTag({ path: resolve(root, 'home-scene-vnext.js') });
  await page.addScriptTag({ path: resolve(root, 'tests/browser/fixtures/v4-gpu-player-fixture.js') });
  const result = await page.evaluate(async ({ data, blockFrames }) => {
    const rt = window.ToSampoolRuntimeVNext, contexts = [];
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const result = originalGetContext.call(this, type, ...args);
      if (type === 'webgl2' && result && !contexts.includes(result)) contexts.push(result);
      return result;
    };
    const photo = await new Promise((done, fail) => { const image = new Image(); image.onload = () => done(image); image.onerror = fail; image.src = data; });
    const canvas = () => { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; return c; };
    const round = n => +n.toFixed(3);
    const summary = a => {
      if (!a.length) return null;
      const sorted = a.slice().sort((a, b) => a - b), at = p => sorted[Math.ceil(sorted.length * p) - 1];
      return { samples: a.length, median: round(at(.5)), p95: round(at(.95)), p99: round(at(.99)),
        max: round(sorted.at(-1)), over25msPercent: round(a.filter(v => v > 25).length / a.length * 100),
        over50ms: a.filter(v => v > 50).length };
    };
    const output = canvas(); output.style.width = '960px'; output.style.height = '540px'; document.body.replaceChildren(output);
    const config = window.createGpuPlayerFixture(photo, 1920, 1080);
    const conditions = [
      { id: 'pool-per-side', fixed: false, final: false }, { id: 'pool-frame-end', fixed: false, final: true },
      { id: 'fixed-per-side', fixed: true, final: false }, { id: 'fixed-frame-end', fixed: true, final: true }
    ].map(spec => ({ ...spec, player: rt.createRuntime(config), values: [], gaps: [], deliveryLags: [], blocks: [], count: 0,
      options: { sceneBackend: 'gpu-experimental', sceneGpuTransitions: true,
        sceneGpuValidation: spec.final ? 'frame-end' : 'per-side', sceneSurfacePolicy: spec.fixed ? 'fixed-roles' : 'pool' } }));
    // Balanced position and predecessor order, not four independent browsers.
    const schedule = [[0, 1, 3, 2], [1, 2, 0, 3], [2, 3, 1, 0], [3, 0, 2, 1]];
    // Loop a 1.8 s window inside the 2 s entry fade. Always exercise both Scenes;
    // this is a transition stress loop, NOT natural full-project playback.
    const timeFor = ordinal => 4.05 + (ordinal % 108) / 60;
    let renderer, visual = [], released;
    try {
      for (const c of conditions) {
        const first = performance.now(); c.player.renderTo(output, timeFor(0), c.options); c.firstCallMs = round(performance.now() - first);
        for (let i = 1; i < 8; i++) c.player.renderTo(output, timeFor(i), c.options);
        c.initial = c.player.getLastFrameStats(); c.gl = contexts.at(-1);
      }
      const info = conditions[0].gl.getExtension('WEBGL_debug_renderer_info');
      renderer = info ? conditions[0].gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : conditions[0].gl.getParameter(conditions[0].gl.RENDERER);
      for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) for (const index of schedule[roundIndex]) {
        const c = conditions[index], values = [], gaps = [], callbackGaps = [], deliveryLags = [], blockStarted = performance.now(); let previous = 0, previousCallback = 0;
        for (let i = 0; i < blockFrames; i++) {
          const now = await new Promise(requestAnimationFrame), callbackNow = performance.now();
          const lag = Math.max(0, callbackNow - now); deliveryLags.push(lag); c.deliveryLags.push(lag);
          if (previous) { gaps.push(now - previous); callbackGaps.push(callbackNow - previousCallback); c.gaps.push({ frame: c.count, ms: now - previous, callbackMs: callbackNow - previousCallback }); } previous = now; previousCallback = callbackNow;
          const start = performance.now(), stats = c.player.renderTo(output, timeFor(c.count + 8), c.options);
          const elapsed = performance.now() - start;
          if (stats.sceneBackend !== 'gpu' || stats.transitionBackend !== 'gpu' || stats.transitionCompositeBackend !== 'gpu') throw new Error('unexpected CPU fallback');
          if (stats.sceneGpu.allocations !== c.initial.sceneGpu.allocations || stats.sceneGpu.contexts !== 1 ||
              stats.surfaces.backingSizeWrites !== c.initial.surfaces.backingSizeWrites ||
              (stats.surfaces.roleAllocations || 0) !== (c.initial.surfaces.roleAllocations || 0) ||
              (stats.transitionSurfaces.roleAllocations || 0) !== (c.initial.transitionSurfaces.roleAllocations || 0)) throw new Error('playback resource churn');
          c.values.push(elapsed); values.push(elapsed); c.count++;
        }
        c.blocks.push({ round: roundIndex, firstFrame: c.count - blockFrames, wallMs: round(performance.now() - blockStarted),
          mainMs: summary(values), gapMs: summary(gaps), callbackGapMs: summary(callbackGaps), deliveryLagMs: summary(deliveryLags),
          resumeFirst16Ms: summary(values.slice(0, 16)), remainderMs: summary(values.slice(16)) });
        console.log(`block ${roundIndex + 1}/4 ${c.id}: P95 ${summary(values).p95}ms`);
      }
      // Readback and CPU visual baseline are deliberately outside timed playback.
      const expected = canvas(), cpu = rt.createRuntime(config); cpu.renderTo(expected, 4.4); cpu.dispose();
      const expectedPixels = expected.getContext('2d').getImageData(0, 0, 1920, 1080).data;
      for (const c of conditions) {
        c.player.renderTo(output, 4.4, c.options);
        const pixels = output.getContext('2d').getImageData(0, 0, 1920, 1080).data; let rgb = 0, alpha = 0;
        for (let i = 0; i < pixels.length; i += 4) { for (let k = 0; k < 3; k++) rgb += Math.abs(pixels[i + k] - expectedPixels[i + k]); alpha += Math.abs(pixels[i + 3] - expectedPixels[i + 3]); }
        visual.push({ id: c.id, rgb: round(rgb / (1920 * 1080 * 3)), alpha: round(alpha / (1920 * 1080)) });
        c.error = c.gl.getError(); c.last = c.player.getLastFrameStats();
      }
    } finally {
      for (const c of conditions) c.player.dispose();
      await new Promise(done => setTimeout(done, 60));
      released = contexts.every(gl => gl.isContextLost()); HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
    return { renderer, width: 1920, height: 1080, blockFrames, measuredFrames: blockFrames * 16,
      measuredWallMs: round(conditions.reduce((sum,c)=>sum+c.blocks.reduce((s,b)=>s+b.wallMs,0),0)),
      schedule, totalContexts: contexts.length, released, visual,
      conditions: conditions.map(c => ({ id: c.id, firstCallMs: c.firstCallMs, error: c.error,
        mainMs: summary(c.values), first60Ms: summary(c.values.slice(0, 60)), laterMs: summary(c.values.slice(60)),
        laterGapMs: summary(c.gaps.filter(x => x.frame >= 60).map(x => x.ms)), gapMs: summary(c.gaps.map(x => x.ms)),
        callbackGapMs: summary(c.gaps.map(x => x.callbackMs)), deliveryLagMs: summary(c.deliveryLags),
        laterCallbackGapMs: summary(c.gaps.filter(x => x.frame >= 60).map(x => x.callbackMs)), laterDeliveryLagMs: summary(c.deliveryLags.slice(60)),
        blocks: c.blocks, textures: c.last.sceneGpu.allocations, gpuTextureMiB: round(c.last.sceneGpu.textureBytes / 1048576),
        rolePixels: (c.last.surfaces.rolePixels || 0) + (c.last.transitionSurfaces.rolePixels || 0),
        samples: { mainMs: c.values.map(round), gapFrames: c.gaps.map(x => x.frame), gapMs: c.gaps.map(x => round(x.ms)), callbackGapMs: c.gaps.map(x => round(x.callbackMs)), deliveryLagMs: c.deliveryLags.map(round) } })) };
  }, { data, blockFrames });
  console.log(JSON.stringify({ ...result, conditions: result.conditions.map(({ samples, ...c }) => c) }, null, 2));
  assert.equal(result.totalContexts, 4); assert.equal(result.released, true);
  assert.equal(result.measuredFrames, blockFrames * 16);
  assert.ok(result.visual.every(x => x.rgb < .3 && x.alpha < .05));
  for (const c of result.conditions) { assert.equal(c.error, 0); assert.equal(c.mainMs.samples, blockFrames * 4); assert.equal(c.blocks.length, 4); assert.equal(c.textures, 7); assert.equal(c.callbackGapMs.samples, (blockFrames - 1) * 4); }
  if (process.argv.includes('--write-report')) writeFileSync(resolve(root, `docs/architecture/v4-gpu-player-interleaved-playback-delivery${blockFrames===180?'':'-f'+blockFrames}-result.json`), JSON.stringify(result, null, 2) + '\n');
} finally { await browser.close(); }
