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
    scene.timeline={tracks:{
      'shortcut-vector':{segments:[{f:[0,.5],type:'step',values:{x:22}},{f:[.5,1],type:'step',values:{x:48}}]},
      'effect:object:shortcut-vector:outline':{segments:[{f:[0,1],type:'step',values:{enabled:true}}]}
    },visibility:{'shortcut-vector':{segments:[{f:[0,.4],visible:true},{f:[.4,1],visible:false}]}}};
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
assert.ok(await page.evaluate(id=>{const scene=ToSampoolV4Workspace.current();return !!scene.timeline.tracks[id]&&!!scene.timeline.tracks[`effect:object:${id}:outline`]&&!!scene.timeline.visibility[id];},state.selected),'复制对象必须带着显示时段、参数时序和效果时序重映射');

await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 1);
await page.keyboard.press('Control+Shift+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 2);

await page.evaluate(() => classicV4View.select('shortcut-vector'));
await page.keyboard.press('Control+x');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 1);
assert.equal(await page.evaluate(() => classicV4Changes.undoLabel), '剪切对象');
assert.equal(await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current();return scene.timeline.tracks['shortcut-vector']||scene.timeline.visibility['shortcut-vector']||scene.timeline.tracks['effect:object:shortcut-vector:outline']||null;}),null,'剪切对象必须同时移除原对象的时序数据');
await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.length === 2);
assert.ok(await page.evaluate(()=>!!ToSampoolV4Workspace.current().timeline.tracks['shortcut-vector']),'撤销剪切必须恢复原对象时序');

await page.evaluate(() => classicV4View.selectPart('shortcut-vector', 'shortcut-part'));
await page.keyboard.press('Control+c');
await page.keyboard.press('Control+v');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').parts.length === 2);
assert.equal(await page.evaluate(() => classicV4Changes.undoLabel), '粘贴');
await page.keyboard.press('Control+z');
await page.waitForFunction(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').parts.length === 1);

// Parts paste into the currently selected eligible owner, not their source owner.
await page.evaluate(()=>{ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'shortcut-target',name:'目标',type:'image',x:80,y:20,w:30,h:30,scaleX:1,scaleY:1,rot:0,alpha:1,assetId:'none'}));classicV4View.selectPart('shortcut-vector','shortcut-part');});
await page.keyboard.press('Control+c');await page.evaluate(()=>classicV4View.select('shortcut-target'));await page.keyboard.press('Control+v');
await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.find(item=>item.id==='shortcut-target').parts?.length===1);
assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(item=>item.id==='shortcut-target').parts.length),1,'图元粘贴必须使用当前所选元素作为目标');
await page.evaluate(()=>classicV4View.select(null));await page.keyboard.press('Control+v');
await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.some(item=>item.type==='vector'&&item.id!=='shortcut-vector'));

await page.evaluate(() => classicV4View.select('shortcut-vector'));
const before = await page.evaluate(() => ({ x:ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').x, y:ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector').y }));
await page.keyboard.press('Shift+ArrowRight');
await page.keyboard.press('ArrowDown');
state = await page.evaluate(() => ToSampoolV4Workspace.current().entities.find(item => item.id === 'shortcut-vector'));
assert.equal(state.x, before.x + 10, 'Shift + arrow should nudge 10 canvas pixels');
assert.equal(state.y, before.y + 1, 'arrow should nudge 1 canvas pixel');

// Alt-drag is one complete duplicate-and-move gesture, including the external timeline data.
const altBefore=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length);
await page.evaluate(()=>classicV4View.select('shortcut-vector'));await page.waitForTimeout(30);
const transform=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
await page.keyboard.down('Alt');await page.mouse.move(transform.x+transform.width/2,transform.y+transform.height/2);await page.mouse.down();await page.mouse.move(transform.x+transform.width/2+18,transform.y+transform.height/2+10,{steps:3});await page.mouse.up();await page.keyboard.up('Alt');
await page.waitForFunction(count=>ToSampoolV4Workspace.current().entities.length===count+1,altBefore);
const altCopy=await page.evaluate(()=>classicV4View.selectedId);
assert.ok(await page.evaluate(id=>!!ToSampoolV4Workspace.current().timeline.tracks[id]&&!!ToSampoolV4Workspace.current().timeline.visibility[id],altCopy),'Alt 拖动副本必须保留完整时序');
assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'复制并移动对象','Alt 拖动必须是一条可撤销的复合操作');

if (errors.length) throw new Error(errors.join('\n'));
console.log('Classic v4 shortcut browser fixture passed.');
} finally {
  await browser.close();
}
