#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?path-stroke=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,path=runtime.modules.pathStroke;
    const render=(part,effects=null)=>{const scene={format:'tosampool-scene/v4',width:120,height:90,loop:4,background:{alpha:0},entities:[{id:'vector',type:'vector',x:10,y:10,w:90,h:70,parts:[part],effects}]},canvas=document.createElement('canvas');runtime.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,120,90).data);};
    const alpha=(image,x,y)=>image[(y*120+x)*4+3],line={id:'line',type:'line',x:20,y:30,x2:75,y2:30,stroke:'#ffffff',strokeWidth:12},
      flat=render({...line,strokeCap:'butt'}),round=render({...line,strokeCap:'round'}),square=render({...line,strokeCap:'square'}),
      capsule=render({...line,strokeCap:'square'},{decorate:{'tint-overlay':{enabled:true,color:'#ffffff',alpha:0}}});
    const dash={enabled:true,length:2,gap:2,offset:0},shapes=['line','rect','ellipse','poly','stroke'].map(type=>{
      const shape={id:type,type,x:15,y:15,w:60,h:40,x2:75,y2:55,points:type==='stroke'?[[15,15],[45,50],[75,15]]:[[0,0],[1,0],[.5,1]],fill:null,stroke:'#ffffff',strokeWidth:2,strokeCap:'butt'};
      const solid=render(shape),dashed=render({...shape,strokeDash:dash});return JSON.stringify(solid)!==JSON.stringify(dashed);
    });
    const raw=[[10,30],[20,10],[30,48],[40,10],[50,48],[60,10],[75,30]],saved=JSON.stringify(raw),smoothed=path.smoothPoints(raw,100),
      stroke={id:'stroke',type:'stroke',points:raw,stroke:'#ffffff',strokeWidth:5},zero=render(stroke),smooth=render({...stroke,smoothing:100});
    const owner={id:'owner',type:'vector',parts:[{...stroke,id:'A'},{...stroke,id:'B'}]},scene={timeline:{tracks:{owner:{segments:[{f:[0,1],values:{'partsById.A.smoothing':80}}]}}}};
    const original=runtime.modules.timeline.valuesFor(scene,'owner',owner,.2);owner.parts.reverse();const reordered=runtime.modules.timeline.valuesFor(scene,'owner',owner,.2);
    const motion=runtime.modules.content.partMotion({...stroke,smoothing:100,anim:{bob:{amount:8,angle:0,period:1,curve:'linear'}}},.2);
    return{caps:[alpha(flat,26,40),alpha(round,26,40),alpha(round,25,34),alpha(square,25,34)],capsule:JSON.stringify(capsule)===JSON.stringify(square),
      shapes,sourceStable:JSON.stringify(raw)===saved,endpoints:[smoothed[0],smoothed.at(-1)],cache:path.smoothPoints(raw,100)===smoothed,
      changed:JSON.stringify(zero)!==JSON.stringify(smooth),restored:JSON.stringify(zero)===JSON.stringify(render({...stroke,smoothing:0})),
      range:[Math.min(...smoothed.map(point=>point[1])),Math.max(...smoothed.map(point=>point[1]))],
      byId:[original.parts.find(part=>part.id==='A').smoothing,reordered.parts.find(part=>part.id==='A').smoothing],
      unrelated:reordered.parts.find(part=>part.id==='B').smoothing,raw:owner.parts.find(part=>part.id==='A').smoothing,
      motionPreservesShape:motion.points.every((point,index)=>Math.abs(point[1]-smoothed[index][1])<1e-6)};
  });
  assert.ok(result.caps[0]===0&&result.caps[1]>200&&result.caps[2]===0&&result.caps[3]>200,'平头／圆头／方头须有各自的实际端点像素：'+JSON.stringify(result.caps));
  assert.ok(result.capsule,'效果胶囊不得裁掉延伸端点');assert.ok(result.shapes.every(Boolean),'五类路径必须共用有效虚线');
  assert.ok(result.sourceStable&&result.cache&&result.changed&&result.restored&&result.motionPreservesShape,'平滑须非破坏、可缓存、可恢复且不破坏动态');
  assert.deepEqual(result.endpoints,[[10,30],[75,30]]);assert.ok(result.range[0]>10&&result.range[1]<48,'平滑应消除局部起伏');
  assert.deepEqual(result.byId,[80,80]);assert.equal(result.unrelated,undefined);assert.equal(result.raw,undefined,'Step 覆层必须按图元ID定位且不改原值');

  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:140,loop:4});classicV4View.select(null);});
  await page.locator('[data-toolbar-mode="pencil"]').click();
  await page.locator('#v4-tool-stroke-settings summary').click();
  await page.locator('#v4-tool-stroke-settings [data-stroke-param="strokeCap"]').selectOption('square');
  await page.locator('#v4-tool-stroke-settings [data-stroke-param="strokeDash.enabled"]').check();
  await page.locator('#v4-tool-stroke-settings [data-stroke-param="strokeDash.gap"]').fill('1');
  await page.locator('#v4-tool-stroke-settings [data-stroke-param="strokeDash.gap"]').press('Tab');
  await page.locator('#v4-tool-stroke-settings summary').click();
  const stage=await page.locator('#v4-drawing-preview').boundingBox();
  const points=[[.15,.5],[.25,.25],[.35,.7],[.45,.25],[.55,.7],[.65,.3],[.8,.5]];
  await page.mouse.move(stage.x+stage.width*points[0][0],stage.y+stage.height*points[0][1]);await page.mouse.down();
  for(const [x,y]of points.slice(1))await page.mouse.move(stage.x+stage.width*x,stage.y+stage.height*y,{steps:3});
  const previewPixels=await page.evaluate(()=>{const canvas=document.getElementById('v4-drawing-preview');return Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);});
  await page.mouse.up();
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0]?.parts[0]?.type==='stroke');
  const initial=await page.evaluate(()=>structuredClone(ToSampoolV4Workspace.current().entities[0]));
  const committedPixels=await page.evaluate(()=>{const scene=structuredClone(ToSampoolV4Workspace.current());scene.background={alpha:0};const canvas=document.createElement('canvas');ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);});
  assert.deepEqual(committedPixels,previewPixels,'工具预览与提交后的描线像素必须一致');
  assert.equal(initial.parts[0].strokeCap,'square');assert.ok(initial.parts[0].strokeDash.enabled,'工具设置须写入实际图元');
  const smoothing=page.locator('#inspector-context [data-stroke-param="smoothing"]');
  await smoothing.fill('100');await smoothing.press('Tab');
  const after=await page.evaluate(()=>structuredClone(ToSampoolV4Workspace.current().entities[0]));
  assert.deepEqual(after.parts[0].points,initial.parts[0].points,'修改平滑度不得平移或重写原始路径');assert.equal(after.parts[0].smoothing,100);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(Number(await smoothing.inputValue()),0,'平滑度须可撤销');
  await page.locator('#inspector-context [data-stroke-param="strokeDash.enabled"]').uncheck();
  assert.equal(await page.locator('#inspector-context [data-stroke-param="strokeDash.length"]').count(),0,'虚线关闭后应收起参数');
  await page.locator('#inspector-context [data-stroke-param="strokeDash.enabled"]').check();
  assert.equal(Number(await page.locator('#inspector-context [data-stroke-param="strokeDash.gap"]').inputValue()),1,'关闭虚线不得丢失原参数');
  await page.evaluate(()=>{classicV4Timeline.seek(.4);classicV4Changes.run('切分测试描线段',scene=>EditorVNextTimelineState.split(scene,scene.entities[0].id,.5));});
  await page.locator('#btn-timing-mode').click();
  await page.locator('#inspector-context [data-stroke-param="strokeCap"]').selectOption('butt');
  const timed=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),entity=scene.entities[0],runtime=ToSampoolRuntimeVNext;
    return{base:entity.parts[0].strokeCap,current:runtime.modules.timeline.valuesFor(scene,entity.id,entity,.1).parts[0].strokeCap,
      later:runtime.modules.timeline.valuesFor(scene,entity.id,entity,.8).parts[0].strokeCap,
      key:Object.keys(scene.timeline.tracks[entity.id].segments[0].values)[0]};});
  assert.deepEqual([timed.base,timed.current,timed.later],['square','butt','square'],'时序描线修改须只作用于当前段');assert.ok(timed.key.startsWith('partsById.'));
  const saved=await page.evaluate(async()=>{const scene=ToSampoolV4Workspace.current(),packageValue=await EditorVNextProjectPackage.build(scene);return(await EditorVNextProjectPackage.restore(packageValue.files)).scene.entities[0].parts[0];});
  assert.equal(saved.strokeCap,'square');assert.equal(saved.strokeDash.gap,1);
  assert.deepEqual(errors,[]);
  console.log('✓ 路径描线：端点像素、五类虚线、非破坏平滑、图元ID Step、工具创建、渐进参数、撤销与项目恢复通过');
}finally{await browser.close();}
