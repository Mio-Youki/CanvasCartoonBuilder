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
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.stack || String(error)));
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?e2e=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ToSampoolV4Workspace?.hasDocument);
  const result = await page.evaluate(() => {
    const runtime = ToSampoolRuntimeVNext, grain = runtime.modules.grain;
    const read = (config, time, sceneLevel = false) => {
      const effect = { enabled: true, amount: config.amount, size: config.size, seed: config.seed, colorMode: config.colorMode, blend: 'normal', motion: config.motion };
      const scene = { format: 'tosampool-scene/v4', width: 20, height: 12, loop: 2,
        entities: [{ id: 'grain-target', type: 'rect', x: 2, y: 2, w: 16, h: 8, fill: '#808080', effects: sceneLevel ? {} : { decorate: { 'grain-overlay': effect } } }],
        sceneEffects: sceneLevel ? { overlay: { 'grain-overlay': effect } } : {} };
      const canvas = document.createElement('canvas'); runtime.createRuntime(scene).renderTo(canvas, time);
      return Array.from(canvas.getContext('2d').getImageData(0, 0, 20, 12).data);
    };
    const config = { amount: 1, size: 1, seed: 17, colorMode: 'mono' };
    const plain = read({ ...config, amount: 0 }, 0), staticA = read(config, 0), staticB = read(config, .6);
    const dynamic = { ...config, motion: { enabled: true, type: 'grain-refresh', period: 1, steps: 4 } };
    const before = grain.stats();
    const animatedA = read(dynamic, 0), animatedB = read(dynamic, .3), animatedLoop = read(dynamic, 1);
    const after = grain.stats();
    const color = read({ ...config, colorMode: 'rgb' }, 0), sceneLevel = read(config, 0, true);
    const pixel = (image, x, y) => image.slice((y * 20 + x) * 4, (y * 20 + x) * 4 + 4);
    return {
      plain: pixel(plain, 4, 4), staticColorCount: new Set(Array.from({ length: 16 }, (_, x) => pixel(staticA, x + 2, 4)[0])).size,
      mono: pixel(staticA, 4, 4), rgb: pixel(color, 4, 4), outside: pixel(staticA, 0, 0), outsidePlain: pixel(plain, 0, 0),
      staticStable: JSON.stringify(staticA) === JSON.stringify(staticB), dynamicChanges: JSON.stringify(animatedA) !== JSON.stringify(animatedB),
      dynamicLoops: JSON.stringify(animatedA) === JSON.stringify(animatedLoop), sceneChanged: JSON.stringify(sceneLevel) !== JSON.stringify(plain),
      builds: after.builds - before.builds, cacheBytes: after.bytes, cacheBudget: after.budget
    };
  });
  assert.deepEqual(result.plain, [128, 128, 128, 255]);
  assert.ok(result.staticColorCount > 3, '强度 1 应覆盖连续颗粒，不是稀疏色块');
  assert.equal(result.mono[0], result.mono[1]); assert.equal(result.mono[1], result.mono[2]);
  assert.ok(result.rgb[0] !== result.rgb[1] || result.rgb[1] !== result.rgb[2], '彩色颗粒需要独立 RGB 值');
  assert.deepEqual(result.outside, result.outsidePlain, '对象颗粒不得溢出对象 Alpha');
  assert.ok(result.staticStable, '静态颗粒不应随播放头跳动');
  assert.ok(result.dynamicChanges, '启用刷新后相邻节拍必须变化');
  assert.ok(result.dynamicLoops, '周期首尾必须闭合');
  assert.ok(result.sceneChanged, '场景叠加滤镜也必须生效');
  assert.ok(result.builds <= 2, '重复的节拍必须复用颗粒缓存');
  assert.ok(result.cacheBytes <= result.cacheBudget, '缓存不得越过内存预算');
  await page.evaluate(() => {
    ToSampoolV4Workspace.createBlank({ width: 32, height: 24 });
    ToSampoolV4Workspace.mutate(scene => scene.entities.push({ id: 'grain-ui', type: 'rect', x: 2, y: 2, w: 16, h: 12, fill: '#808080' }));
    classicV4View.select('grain-ui');
  });
  await page.click('#element-inspector-tabs [data-element-inspector="fx"]');
  const card = page.locator('#inspector-context [data-v4-effect-id="grain-overlay"]');
  assert.equal(await card.count(), 1, '对象加样须显示独立颗粒卡片');
  await card.locator('.global-field').filter({ hasText: '启用' }).locator('input[type="checkbox"]').check();
  await page.waitForFunction(() => ToSampoolV4Workspace.current().entities[0]?.effects?.decorate?.['grain-overlay']?.enabled === true);
  assert.equal(await card.locator('input[type="number"]').count() >= 3, true, '启用后须暴露强度、尺寸和随机种子');
  await card.locator('.v4-motion-title-button').click();
  assert.equal(await card.locator('.global-field').filter({ hasText: '动态方式' }).count(), 0, '只有颗粒刷新一种动态方式时不显示冗余下拉');
  assert.equal(await card.locator('.global-field').filter({ hasText: '周期时间' }).count() > 0, true, '动态入口须直接显示颗粒刷新参数');
  assert.equal(await page.locator('#inspector-context [data-v4-effect-id="texture-overlay"] option[value="noise"]').count(), 0, '新建纹理下拉不再暴露旧屏幕噪点');
  assert.deepEqual(errors, []);
  console.log('✓ V4 颗粒叠加：对象/场景、单色/彩色、周期刷新、Alpha 与缓存通过');
} finally { await browser.close(); }
