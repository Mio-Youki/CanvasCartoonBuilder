#!/usr/bin/env node
/* Product-level smoke: the released v4 page must exercise v4 controllers, not
 * just expose a valid session object. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const pagePath=resolve(root,'img2asset-v4-classic.html');
const executablePath=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.goto(`${pathToFileURL(pagePath).href}?e2e=v4-product-flow`,{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>window.ToSampoolV4Workspace&&window.ToSampoolV4Workspace.hasDocument&&document.querySelector('#v4-classic-stage'),{timeout:15000});

// Create a primitive through the visible tool and canvas, then prove that the
// resulting data belongs to the v4 document and is selectable by the v4 view.
await page.click('[data-toolbar-mode="rect"]');
const box=await page.locator('#v4-classic-stage').boundingBox();
assert.ok(box&&box.width>80&&box.height>60,'v4 canvas must be visibly usable');
await page.mouse.move(box.x+box.width*.2,box.y+box.height*.25);
await page.mouse.down();
await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:5});
await page.mouse.up();
await page.waitForFunction(()=>window.ToSampoolV4Workspace.current().entities.length===1&&document.querySelector('#structure-tree .struct-node.sel[data-v4-entity-id="vector-1"]'),{timeout:5000});
const created=await page.evaluate(()=>{
  const scene=ToSampoolV4Workspace.current(),entity=scene.entities[0];
  const selected=document.querySelector('#structure-tree .struct-node.sel[data-v4-entity-id]');
  return {format:scene.format,type:entity.type,parts:entity.parts&&entity.parts.length,partType:entity.parts&&entity.parts[0]&&entity.parts[0].type,selected:selected&&selected.dataset.v4EntityId};
});
assert.deepEqual(created,{format:'tosampool-scene/v4',type:'vector',parts:1,partType:'rect',selected:'vector-1'});

await page.click('[data-toolbar-mode="select"]');
await page.mouse.click(box.x+box.width*.45,box.y+box.height*.45);
await page.waitForFunction(()=>document.querySelector('#structure-tree .struct-node.sel[data-v4-entity-id="vector-1"]'),{timeout:5000});
const selected=await page.evaluate(()=>document.querySelector('#structure-tree .struct-node.sel[data-v4-entity-id]')?.dataset.v4EntityId);
assert.equal(selected,'vector-1','v4 Canvas selection must stay inside the v4 controller');
assert.deepEqual(errors,[],'v4 product flow must not raise page errors');
await browser.close();
console.log('✓ v4 产品流程：工具栏绘制、v4 文档写入与 Canvas 选择通过');
