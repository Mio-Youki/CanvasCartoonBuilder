import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edgeCandidates=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'],edge=edgeCandidates.find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&document.querySelector('#v4-classic-stage'));
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:100,height:80,loop:2});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'left',type:'rect',name:'左',x:10,y:10,w:20,h:20,fill:'#ff4455'},{id:'right',type:'rect',name:'右',x:40,y:20,w:20,h:20,fill:'#55aaff'}));classicV4View.select(null);});
  await page.waitForTimeout(40);
  const artboard=await page.locator('#v4-classic-stage').boundingBox();
  assert.ok(Math.abs(artboard.width/artboard.height-100/80)<.015,'v4 舞台必须按当前 Scene 比例等比显示，不能继承 Legacy 尺寸');
  const box=await page.locator('#v4-classic-stage').boundingBox(),point=(x,y)=>({x:box.x+box.width*x/100,y:box.y+box.height*y/80});
  // Left-to-right means fully contained.
  await page.mouse.move(...Object.values(point(5,5)));await page.mouse.down();await page.mouse.move(...Object.values(point(35,35)),{steps:4});await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>classicV4View.selectedIds),['left'],'左→右框选必须只选择完全包含的对象');
  // Right-to-left means intersecting.
  await page.mouse.move(...Object.values(point(65,65)));await page.mouse.down();await page.mouse.move(...Object.values(point(5,5)),{steps:4});await page.mouse.up();
  assert.deepEqual(new Set(await page.evaluate(()=>classicV4View.selectedIds)),new Set(['left','right']),'右→左框选必须选择所有相交对象');
  // A skewed border must not scale its screen-space controls, and all four edge handles exist.
  await page.evaluate(()=>{classicV4View.select('left');ToSampoolV4Workspace.mutate(scene=>{const item=scene.entities.find(entry=>entry.id==='left');item.skewX=28;item.skewY=-12;});});
  await page.waitForTimeout(40);
  assert.equal(await page.locator('#v4-transform-layer .v4-transform-handle').count(),8,'变换框必须提供四角与四边中点共八个缩放触点');
  const skewHandle=await page.locator('#v4-transform-layer .v4-transform-handle.nw').boundingBox();
  assert.ok(skewHandle&&skewHandle.width<=12&&skewHandle.height<=12,'斜切后控制点仍必须保持固定屏幕尺寸');
  const rightHandle=await page.locator('#v4-transform-layer .v4-transform-handle.e').boundingBox();
  await page.mouse.move(rightHandle.x+rightHandle.width/2,rightHandle.y+rightHandle.height/2);await page.mouse.down();await page.mouse.move(rightHandle.x+rightHandle.width/2+24,rightHandle.y+rightHandle.height/2,{steps:3});await page.mouse.up();
  assert.ok(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(entry=>entry.id==='left').scaleX>1),'右侧中点必须只扩大对象的宽比例');
  const beforeSkew=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(entry=>entry.id==='left').skewX),topHandle=await page.locator('#v4-transform-layer .v4-transform-handle.n').boundingBox();
  await page.keyboard.down('Alt');await page.mouse.move(topHandle.x+topHandle.width/2,topHandle.y+topHandle.height/2);await page.mouse.down();await page.mouse.move(topHandle.x+topHandle.width/2+18,topHandle.y+topHandle.height/2,{steps:3});await page.mouse.up();await page.keyboard.up('Alt');
  assert.notEqual(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(entry=>entry.id==='left').skewX),beforeSkew,'Alt + 上下中点必须写入水平斜切');
  // A pencil stroke with no selected target creates an editable vector part.
  await page.mouse.click(...Object.values(point(90,70)));await page.click('[data-toolbar-mode="pencil"]');await page.mouse.move(...Object.values(point(70,12)));await page.mouse.down();await page.mouse.move(...Object.values(point(78,16)),{steps:3});await page.mouse.move(...Object.values(point(85,10)),{steps:3});await page.mouse.up();
  const pencil=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.at(-1));
  assert.equal(pencil.type,'vector');assert.equal(pencil.parts?.[0]?.type,'stroke');assert.ok(pencil.parts[0].points.length>=2);assert.ok(pencil.parts[0].points.every(point=>point.every(Number.isInteger)),'像素铅笔必须持久化整数路径点');
  await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;const ctx=canvas.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(0,0,4,4);openAssetProcessModal({id:'test-asset',name:'预处理夹具',img:canvas,frames:1});});
  await page.waitForSelector('.wizard-mask .asset-process-controls');
  assert.equal(await page.locator('.wizard-mask .asset-process-controls .palette').count(),0,'v4 预处理不得保留减色色板');
  assert.equal(await page.locator('.wizard-mask .asset-process-controls .quant').count(),0,'v4 预处理不得保留均匀量化');
  assert.ok(await page.locator('.wizard-mask .bg-enabled').isVisible(),'v4 预处理必须提供去背景');
  await page.locator('.wizard-mask button', {hasText:'取消'}).click();
  await page.evaluate(()=>{const sheet=document.createElement('canvas');sheet.width=16;sheet.height=8;const ctx=sheet.getContext('2d');['#ff0000','#00ff00','#0000ff','#ffffff'].forEach((color,index)=>{ctx.fillStyle=color;ctx.fillRect((index%2)*8,Math.floor(index/2)*4,8,4);});openSpriteSheetModal(sheet,'fixture-sprite.png');});
  await page.waitForFunction(()=>document.querySelector('.wizard h2')?.textContent.includes('导入精灵图'));
  await page.locator('.wizard .cols').fill('2');await page.locator('.wizard .rows').fill('2');
  assert.match(await page.locator('.wizard .layout-status').textContent(),/4 帧/,'精灵图网格预览必须即时报告切出的帧数');
  await page.locator('.wizard button.primary').click();
  await page.waitForFunction(()=>document.querySelector('.wizard h2')?.textContent==='素材预处理');
  assert.equal(await page.evaluate(()=>state.sources.at(-1)?.frames),4,'精灵图确认后只能作为 sequence 进入预处理');
  await page.locator('.wizard button', {hasText:'取消'}).click();
  assert.deepEqual(errors,[],'像素输入流程不得产生页面异常');
  console.log('✓ V4 Pixel Canvas：方向框选、整数像素铅笔与预处理入口通过');
} finally { await browser.close(); }
