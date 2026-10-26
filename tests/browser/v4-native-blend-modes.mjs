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
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?blend-modes-e2e=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.ToSampoolRuntimeVNext && !!window.EditorEffectRegistryVNext);
  const result = await page.evaluate(() => {
    const runtime = window.ToSampoolRuntimeVNext, registry = window.EditorEffectRegistryVNext;
    const native = registry.blendOptions.map(value => {
      const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#3571a3'; ctx.fillRect(0, 0, 2, 2);
      const mapped = runtime.modules.blend.toCanvas(value); ctx.globalCompositeOperation = mapped;
      const accepted = ctx.globalCompositeOperation; ctx.fillStyle = '#e88342'; ctx.fillRect(0, 0, 2, 2);
      return { value, mapped, accepted, pixel: Array.from(ctx.getImageData(0, 0, 1, 1).data) };
    });
    const render = blend => {
      const canvas = document.createElement('canvas');
      const scene = { format:'tosampool-scene/v4', width:16, height:16, entities:[
        { id:'base', type:'rect', x:4, y:4, w:8, h:8, fill:'#3571a3' },
        { id:'top', type:'rect', x:4, y:4, w:8, h:8, fill:'#e88342', blend },
      ] };
      runtime.createRuntime(scene).renderTo(canvas, 0);
      return Array.from(canvas.getContext('2d').getImageData(7, 7, 1, 1).data);
    };
    return { native, objectMultiply:render('multiply'), objectScreen:render('screen') };
  });
  assert.equal(result.native.length, 12);
  for (const item of result.native) assert.equal(item.accepted, item.mapped, `${item.value} 必须被真实浏览器 Canvas 接受`);
  assert.notDeepEqual(result.native.find(item => item.value === 'multiply').pixel, result.native.find(item => item.value === 'screen').pixel, '正片叠底与滤色应产生不同像素');
  assert.notDeepEqual(result.native.find(item => item.value === 'color').pixel, result.native.find(item => item.value === 'luminosity').pixel, '颜色与明度应产生不同像素');
  assert.notDeepEqual(result.objectMultiply,result.objectScreen,'V4 对象级混合方式必须实际改变成像');
  console.log('✓ 浏览器真实 Canvas：12 项混合模式均被接受且关键模式视觉可区分');
} finally { await browser.close(); }
