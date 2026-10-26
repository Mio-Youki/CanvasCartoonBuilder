import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:240,loop:4});ToSampoolV4Workspace.mutate(s=>s.entities=[{id:'owner',type:'vector',x:60,y:40,w:180,h:140,parts:[{id:'a',type:'rect',x:0,y:0,w:180,h:140,fill:null,stroke:'#ffd23f',strokeWidth:3}]}]);classicV4View.selectPart('owner','a');});
  const field=k=>page.locator('[data-stroke-param="'+k+'"]'),nested=k=>page.locator('[data-extension-param="nested.'+k+'"]');
  assert.equal(await field('strokeCompletion').count(),0);await field('pathRevealEnabled').check();assert.equal(await field('strokeCompletion').inputValue(),'100');
  const image=()=>page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();});
  const full=await image();await field('strokeCompletion').fill('35');await field('strokeCompletion').press('Tab');const partial=await image();assert.notEqual(full,partial);
  await field('pathEndpoints.enabled').check();await field('pathRevealEnabled').uncheck();assert.equal(await field('strokeCompletion').count(),0);assert.equal(await image(),full,'关闭实际恢复完整路径');
  let saved=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0]);assert.equal(saved.strokeCompletion,35);assert.equal(saved.pathEndpoints.enabled,true);
  await field('pathRevealEnabled').check();assert.equal(await field('strokeCompletion').inputValue(),'35');await field('pathEndpoints.enabled').uncheck();assert.equal(await image(),partial);
  await field('strokeCompletion').fill('100');await field('strokeCompletion').press('Tab');await page.locator('#element-inspector-tabs [data-element-inspector="extensions"]').click();await nested('enabled').check();assert.equal(await nested('pathStep').count(),1,'启用显现且当前100%仍提供逐层起点偏移');
  await nested('style').selectOption('fill');assert.equal(await nested('pathStep').count(),0);
  await page.locator('#element-inspector-tabs [data-element-inspector="props"]').click();
  await field('fillReveal').selectOption('center');await page.locator('#element-inspector-tabs [data-element-inspector="extensions"]').click();assert.equal(await nested('pathStep').count(),1,'中心展开填充也有逐层起点偏移');
  const restored=await page.evaluate(async()=>{const p=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current());return(await EditorVNextProjectPackage.restore(p.files)).scene.entities[0].parts[0];});assert.equal(restored.pathRevealEnabled,true);assert.equal(restored.fillReveal,'center');assert.deepEqual(errors,[]);
  console.log('✓ 路径显现浏览器：渐进入口／实际关闭与保留／重开／嵌套显隐不随100%跳变／中心填充');
}finally{await browser.close();}
