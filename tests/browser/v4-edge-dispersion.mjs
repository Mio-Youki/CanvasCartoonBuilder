#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),pagePath=resolve(root,'img2asset-v4-classic.html');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(pagePath).href+'?edge-dispersion=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.ToSampoolRuntimeVNext);
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:64,height:40,loop:2});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'edge-probe',name:'边缘色散测试',type:'rect',x:22,y:12,w:20,h:16,fill:'#ffffff',effects:{sample:{'edge-dispersion':{enabled:true,distance:2,angle:0,strength:1,source:'contour',width:1,order:'rgb'}}}}));classicV4View.select('edge-probe');});
  const probe=await page.evaluate(()=>{const canvas=document.createElement('canvas'),player=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current());player.renderTo(canvas,0);const read=(x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);return{left:read(20,20),right:read(43,20)};});
  assert.ok(probe.left[0]>probe.left[2]&&probe.left[3]>0,'边缘色散左侧必须产生红色透明边');
  assert.ok(probe.right[2]>probe.right[0]&&probe.right[3]>0,'边缘色散右侧必须产生蓝色透明边');
  await page.click('#element-inspector-tabs [data-element-inspector="sampling"]');
  await page.waitForFunction(()=>!!document.querySelector('#inspector-context [data-v4-effect-id="edge-dispersion"]'));
  const order=await page.locator('#inspector-context [data-v4-effect-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.v4EffectId));
  assert.ok(order.indexOf('threshold')<order.indexOf('edge-dispersion')&&order.indexOf('edge-dispersion')<order.indexOf('offset-sampling'),`边缘色散卡片必须排在阈值分色之后、偏移采样之前（实际：${order.join(' → ')}）`);
  assert.deepEqual(errors,[],'边缘色散浏览器夹具不得产生异常');
  console.log('✓ 边缘色散：采样末端 RGB 色边与 Inspector 顺序通过');
}finally{await browser.close();}
