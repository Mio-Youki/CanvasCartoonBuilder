#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
if (!edge) throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?alpha-edge-e2e=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.ToSampoolRuntimeVNext);
  const result = await page.evaluate(() => {
    const runtime = window.ToSampoolRuntimeVNext, source = document.createElement('canvas');
    source.width = 4; source.height = 1;
    const ctx = source.getContext('2d'), pixels = ctx.createImageData(4, 1);
    [0, 127, 128, 254].forEach((alpha, i) => { const at = i * 4; pixels.data[at] = 20; pixels.data[at + 1] = 40; pixels.data[at + 2] = 60; pixels.data[at + 3] = alpha; });
    ctx.putImageData(pixels, 0, 0);
    const sample = mode => {
      const surfaces = runtime.modules.surfaces.create();
      const result = runtime.modules.sampling.apply(source, { controllers: { 'sampling-grid': { size: 1, alphaMode: mode } } }, surfaces, { time: 0 });
      const alpha = Array.from(result.getContext('2d').getImageData(0, 0, 4, 1).data).filter((_, i) => i % 4 === 3);
      if (result !== source) surfaces.release(result);
      return alpha;
    };
    return { keep: sample('keep'), remove: sample('remove'), boost: sample('boost') };
  });
  assert.deepEqual(result.keep, [0, 127, 128, 254]);
  assert.deepEqual(result.remove, [0, 0, 255, 255]);
  assert.deepEqual(result.boost, [0, 255, 255, 255]);
  console.log('✓ 浏览器真实 Canvas：采样尺寸为 1 时三种边缘透明度正确');
} finally { await browser.close(); }
