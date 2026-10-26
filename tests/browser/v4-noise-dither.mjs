#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const read=(noise,time,{sceneLevel=false,threshold=false,grid=1}={})=>{
      const effect=noise&&{enabled:true,amount:noise.amount,size:noise.size,colorMode:noise.colorMode,seed:noise.seed,motion:noise.motion};
      const sample={controllers:{'sampling-grid':{size:grid}}};
      if(effect)sample['noise-dither']=effect;
      if(threshold)sample.threshold={enabled:true,threshold:.5,dark:'#000000',light:'#ffffff'};
      const scene={format:'tosampool-scene/v4',width:20,height:12,loop:2,background:{color:'#000000',alpha:0},
        entities:[{id:'dither-target',type:'rect',x:2,y:2,w:16,h:8,fill:'#808080',effects:sceneLevel?{}:{sample}}],
        sceneEffects:sceneLevel?{sample}:{}},canvas=document.createElement('canvas');
      ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,time);
      return Array.from(canvas.getContext('2d').getImageData(0,0,20,12).data);
    };
    const pixel=(image,x,y)=>image.slice((y*20+x)*4,(y*20+x)*4+4),base={amount:30,size:1,colorMode:'mono',seed:11},plain=read(null,0),off=read({...base,amount:0},0),weak=read({...base,amount:8},0),strong=read({...base,amount:100},0),mono=read(base,0),monoLater=read(base,.4),rgb=read({...base,colorMode:'rgb'},0),large=read({...base,size:2},0),animated={...base,motion:{enabled:true,type:'noise-refresh',period:1,steps:4}},motionA=read(animated,0),motionB=read(animated,.3),motionLoop=read(animated,1),thresholdOnly=read(null,0,{threshold:true}),thresholdNoise=read({...base,amount:80},0,{threshold:true}),scene=read(base,0,{sceneLevel:true}),sampled=read({...base,size:1},0,{grid:2});
    const spread=image=>Math.max(...Array.from({length:16},(_,x)=>pixel(image,x+2,4)[0]))-Math.min(...Array.from({length:16},(_,x)=>pixel(image,x+2,4)[0]));
    return{plain:pixel(plain,4,4),off:JSON.stringify(off)===JSON.stringify(plain),weakSpread:spread(weak),strongSpread:spread(strong),mono:pixel(mono,4,4),rgb:pixel(rgb,4,4),outside:pixel(mono,0,0),outsidePlain:pixel(plain,0,0),staticStable:JSON.stringify(mono)===JSON.stringify(monoLater),dynamicChanges:JSON.stringify(motionA)!==JSON.stringify(motionB),dynamicLoops:JSON.stringify(motionA)===JSON.stringify(motionLoop),cellA:pixel(large,4,4),cellB:pixel(large,5,4),thresholdFlat:spread(thresholdOnly),thresholdDither:spread(thresholdNoise),sceneChanged:JSON.stringify(scene)!==JSON.stringify(plain),gridChanged:JSON.stringify(sampled)!==JSON.stringify(plain)};
  });
  assert.deepEqual(result.plain,[128,128,128,255]);
  assert.ok(result.off,'强度 0 必须直通原图');
  assert.ok(result.weakSpread>0&&result.strongSpread>result.weakSpread,'强度必须控制像素值扰动幅度，而非覆盖像素数量');
  assert.equal(result.mono[0],result.mono[1]);assert.equal(result.mono[1],result.mono[2]);
  assert.ok(result.rgb[0]!==result.rgb[1]||result.rgb[1]!==result.rgb[2],'彩色模式须独立扰动 RGB');
  assert.deepEqual(result.outside,result.outsidePlain,'透明区域不得受到影响');
  assert.deepEqual(result.cellA,result.cellB,'颗粒尺寸 2 应让相邻像素共用扰动');
  assert.ok(result.staticStable&&result.dynamicChanges&&result.dynamicLoops,'静态需固定、动态需刷新且周期闭合');
  assert.equal(result.thresholdFlat,0);assert.ok(result.thresholdDither>0,'杂色应先于阈值，使阈值分色形成随机抖动');
  assert.ok(result.sceneChanged&&result.gridChanged,'场景和共享采样格均须接入杂色');
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:32,height:24});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'dither-ui',type:'rect',x:2,y:2,w:16,h:12,fill:'#808080'}));classicV4View.select('dither-ui');});
  await page.click('#element-inspector-tabs [data-element-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="noise-dither"]');
  assert.equal(await card.count(),1,'采样页须显示独立杂色抖动卡片');
  await card.locator('.global-field').filter({hasText:'启用'}).locator('input[type="checkbox"]').check();
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0]?.effects?.sample?.['noise-dither']?.enabled===true);
  await card.locator('.v4-motion-title-button').click();
  assert.equal(await card.locator('.global-field').filter({hasText:'动态方式'}).count(),0,'只有杂色刷新一种动态方式时不显示冗余下拉');
  assert.ok(await card.locator('.global-field').filter({hasText:'周期时间'}).count(),'动态入口须直接展示刷新节奏参数');
  assert.deepEqual(errors,[]);
  console.log('✓ V4 杂色抖动：幅度、单色/彩色、颗粒尺寸、阈值协同、动态周期与场景/对象通过');
}finally{await browser.close();}
