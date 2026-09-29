#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const pagePath = resolve(root, 'img2asset-v4-classic.html');
const executablePath = [
  process.env.TOSAMPOOL_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(existsSync);
const browser = await chromium.launch(executablePath ? { headless:true, executablePath } : { headless:true, channel:'msedge' });
try {
const context = await browser.newContext({ viewport:{ width:1200, height:800 } });
const page = await context.newPage(), errors=[];
page.on('pageerror', error => errors.push(String(error)));
await page.goto(`${pathToFileURL(pagePath).href}?e2e=1`, { waitUntil:'domcontentloaded', timeout:15000 });
await page.waitForFunction(() => window.ToSampoolSession?.activeId === 'v4' && typeof classicV4Shortcuts !== 'undefined' && typeof classicV4View !== 'undefined', null, { timeout:15000 });

await page.evaluate(() => {
  ToSampoolV4Workspace.mutate(scene => {
    scene.entities = [{
      id:'shortcut-vector', name:'快捷键矩形', type:'vector', parentId:null,
      x:20, y:20, w:40, h:30, scaleX:1, scaleY:1, rot:0, alpha:1,
      parts:[{ id:'shortcut-part', name:'图元', type:'rect', x:0, y:0, w:40, h:30, alpha:1, scaleX:1, scaleY:1, rot:0, fill:'#ffffff', stroke:'#000000', strokeWidth:1 }]
    }];
  });
  classicV4View.select('shortcut-vector');
});

await page.keyboard.press('Control+c');
await page.keyboard.press('Control+v');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 2);
let state = await page.evaluate(() => ({ ids:ToSampoolV4Workspace.current().entities.map(item => item.id), label:classicV4Changes.undoLabel, selected:classicV4View.selectedId }));
assert.equal(state.label, '粘贴');
assert.equal(new Set(state.ids).size, 2, 'pasted entity needs a distinct ID');
assert.notEqual(state.selected, 'shortcut-vector');

await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 1);
await page.keyboard.press('Control+Shift+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 2);

await page.evaluate(() => classicV4View.select('shortcut-vector'));
await page.keyboard.press('Control+x');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 1);
assert.equal(await page.evaluate(() => classicV4Changes.undoLabel), '剪切对象');
await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 2);

await page.evaluate(() => classicV4View.selectPart('shortcut-vector', 'shortcut-part'));
await page.keyboard.press('Control+c');
await page.keyboard.press('Control+v');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').parts.length === 2);
assert.equal(await page.evaluate(() => classicV4Changes.undoLabel), '粘贴');
await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').parts.length === 1);

await page.evaluate(() => classicV4View.select('shortcut-vector'));
const before = await page.evaluate(() => ({ x:ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').x, y:ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').y }));
await page.keyboard.press('Shift+ArrowRight');
await page.keyboard.press('ArrowDown');
state = await page.evaluate(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector'));
assert.equal(state.x, before.x + 10, 'Shift + arrow should nudge 10 canvas pixels');
assert.equal(state.y, before.y + 1, 'arrow should nudge 1 canvas pixel');

if (errors.length) throw new Error(errors.join('\n'));
console.log('Classic v4 shortcut browser fixture passed.');
} finally {
  await browser.close();
}
