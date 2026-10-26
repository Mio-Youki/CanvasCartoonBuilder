#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?stroke-reveal=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,path=runtime.modules.pathStroke;
    const part={id:'A',type:'stroke',points:[[10,20],[20,20],[110,20]],stroke:'#ffffff',strokeWidth:4,strokeCap:'butt'},original=JSON.stringify(part.points);
    const render=value=>{const canvas=document.createElement('canvas'),scene={format:'tosampool-scene/v4',width:130,height:60,loop:4,background:{alpha:0},entities:[{id:'owner',type:'vector',x:0,y:0,w:130,h:60,parts:[value]}]};runtime.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,130,60).data);};
    const alpha=(pixels,x)=>pixels[(20*130+x)*4+3],ink=pixels=>pixels.filter((value,index)=>index%4===3&&value>0).length;
    const revealed=[0,25,50,75,100].map(strokeCompletion=>path.reveal({...part,strokeCompletion})),reverse=path.reveal({...part,strokeCompletion:50,strokeReverse:true}),
      sizes=[0,50,100].map(strokeCompletion=>runtime.modules.content.partVisualBounds({...part,strokeCompletion},0));
    const zeroCaps=['butt','round','square'].map(strokeCap=>ink(render({...part,strokeCap,strokeCompletion:0})));
    const dashPart={...part,points:[[10,20],[115,20]],strokeDash:{enabled:true,length:3,gap:2,offset:.25}},
      full=render(dashPart),half=render({...dashPart,strokeCompletion:50}),suffix=render({...dashPart,strokeCompletion:50,strokeReverse:true});
    let forwardMismatch=0,reverseMismatch=0;
    for(let x=14;x<58;x++)if(alpha(full,x)!==alpha(half,x))forwardMismatch++;
    for(let x=67;x<110;x++)if(alpha(full,x)!==alpha(suffix,x))reverseMismatch++;
    const crooked={...part,smoothing:100,points:[[10,30],[20,10],[30,50],[40,10],[50,50],[70,30]]},smooth=path.pointsFor(crooked),
      smoothHalf=path.reveal({...crooked,strokeCompletion:50}),partialLength=path.pathLengths(smoothHalf.points).total;
    const cornerCapsule=effects=>{const canvas=document.createElement('canvas'),scene={format:'tosampool-scene/v4',width:120,height:120,background:{alpha:0},entities:[{id:'corner',type:'vector',x:0,y:0,w:1,h:1,effects,
      parts:[{id:'tip',type:'stroke',points:[[10,10],[60,60],[10,100]],stroke:'#ffffff',strokeWidth:12,strokeCap:'square',strokeJoin:'round',strokeCompletion:55}]}]};runtime.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,120,120).data);};
    const sourceWithNoCompletion={id:'owner',type:'vector',parts:[part]},key='partsById.A.strokeCompletion',
      fallbackScene={timeline:{tracks:{owner:{segments:[{f:[0,.2],values:{[key]:0}},{f:[.2,.8],type:'linear',linearKeys:[key]},{f:[.8,1],values:{}}]}}}};
    return{tips:revealed.slice(1).map(value=>value.points.at(-1)),reverse:[reverse.points[0],reverse.points.at(-1)],sizes,zeroCaps,
      sourceStable:original===JSON.stringify(part.points),forwardMismatch,reverseMismatch,fullReverseSame:JSON.stringify(full)===JSON.stringify(render({...dashPart,strokeReverse:true})),
      smoothRatio:partialLength/path.pathLengths(smooth).total,cache:path.pathLengths(smooth)===path.pathLengths(smooth),
      tipPreserved:JSON.stringify(cornerCapsule(null))===JSON.stringify(cornerCapsule({decorate:{'tint-overlay':{enabled:true,color:'#ffffff',alpha:0}}})),
      fallback:runtime.modules.timeline.valuesFor(fallbackScene,'owner',sourceWithNoCompletion,.5).parts[0].strokeCompletion,
      visibleInk:[0,25,50,75,100].map(strokeCompletion=>ink(render({...part,strokeCompletion})))};
  });
  assert.deepEqual(result.tips,[[35,20],[60,20],[85,20],[110,20]],'完成度必须按长度而非点数量推进');
  assert.deepEqual(result.reverse,[[60,20],[110,20]]);assert.deepEqual(result.zeroCaps,[0,0,0],'0%不得留下端点或其他图形');
  assert.deepEqual(result.sizes[0],result.sizes[1]);assert.deepEqual(result.sizes[1],result.sizes[2],'选择框和完整路径边界不得缩小');
  assert.ok(result.sourceStable&&result.cache);assert.ok(Math.abs(result.smoothRatio-.5)<1e-9,'完成度应根据平滑后的长度计算');
  assert.ok(result.tipPreserved,'加样胶囊不得裁切途中方头的延伸');
  assert.equal(result.forwardMismatch,0,'正向显现应保持虚线节奏');assert.equal(result.reverseMismatch,0,'反向显现应保持原虚线相位');assert.ok(result.fullReverseSame);
  assert.equal(Math.round(result.fallback),50,'没有显式结束值时应以默认100作为Linear终态');
  for(let index=1;index<result.visibleInk.length;index++)assert.ok(result.visibleInk[index]>result.visibleInk[index-1]);

  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:180,height:100,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{scene.background={alpha:0};scene.entities.push({id:'owner',name:'两条笔触',type:'vector',x:8,y:8,w:140,h:70,parts:[
      {id:'A',name:'笔触A',type:'stroke',points:[[10,20],[20,20],[110,20]],stroke:'#ffffff',strokeWidth:4},
      {id:'B',name:'笔触B',type:'stroke',points:[[10,50],[110,50]],stroke:'#00ff00',strokeWidth:4}]});});
    classicV4View.selectPart('owner','A');classicV4Timeline.seek(.4);
    classicV4Changes.run('分段夹具',scene=>{EditorVNextTimelineState.split(scene,'owner',.2);EditorVNextTimelineState.split(scene,'owner',.8);});
  });
  const complete=page.locator('#inspector-context [data-stroke-param="strokeCompletion"]');
  await page.locator('[data-stroke-param="pathRevealEnabled"]').check();
  assert.equal(await complete.inputValue(),'100');
  assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),'owner','选中图元仍应使用对象轨');
  await page.locator('#btn-timing-mode').click();await complete.fill('0');await complete.press('Tab');
  await page.evaluate(()=>classicV4Timeline.seek(3.6));
  await page.locator('#btn-timing-mode').click();await complete.fill('100');await complete.press('Tab');
  const lane=await page.locator('#tl-context').boundingBox();await page.mouse.move(lane.x+lane.width*.5,lane.y+lane.height*.5);await page.locator('#tl-linear-toggle').click();
  await page.evaluate(()=>classicV4Timeline.seek(2));
  assert.equal(Number(await complete.inputValue()),50,'图元Inspector应跟随Linear插值');
  const linear=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),owner=scene.entities[0],frame=ToSampoolRuntimeVNext.modules.frame.create(scene,2);return{keys:scene.timeline.tracks.owner.segments[1].linearKeys,
    values:frame.valuesFor(owner).parts.map(part=>part.strokeCompletion==null?100:part.strokeCompletion),base:owner.parts[0].strokeCompletion,
    allTracks:Object.keys(scene.timeline.tracks),frames:[1.4,2,2.6].map(time=>{const canvas=document.createElement('canvas');ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,time);const data=canvas.getContext('2d').getImageData(0,0,scene.width,scene.height).data;let white=0;for(let index=0;index<data.length;index+=4)if(data[index]>150&&data[index+1]>150&&data[index+2]>150)white++;return white;})};});
  assert.ok(linear.keys.includes('partsById.A.strokeCompletion'));assert.deepEqual(linear.values.map(Math.round),[50,100]);assert.deepEqual(linear.allTracks,['owner']);assert.equal(linear.base,undefined);
  assert.ok(linear.frames[0]<linear.frames[1]&&linear.frames[1]<linear.frames[2],'对象轨Linear必须改变实际笔触画面：'+JSON.stringify(linear.frames));
  await page.evaluate(()=>{classicV4View.selectPart('owner','B');classicV4Timeline.seek(.4);});
  await page.locator('[data-stroke-param="pathRevealEnabled"]').check();
  await complete.fill('25');await complete.press('Tab');
  const shared=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),values=ToSampoolRuntimeVNext.modules.timeline.valuesFor(scene,'owner',scene.entities[0],.1);return{parts:values.parts.map(part=>part.strokeCompletion),segments:scene.timeline.tracks.owner.segments.length,track:classicV4Timeline.trackKey};});
  assert.deepEqual(shared,{parts:[0,25],segments:3,track:'owner'},'笔触各自数值独立并共用切段，不得自动新增段');
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(Number(await complete.inputValue()),100,'笔触完成度必须支持撤销');
  await page.locator('#inspector-context [data-stroke-param="strokeReverse"]').check();
  assert.equal(await page.evaluate(()=>ToSampoolRuntimeVNext.modules.timeline.valuesFor(ToSampoolV4Workspace.current(),'owner',ToSampoolV4Workspace.current().entities[0],.1).parts[1].strokeReverse),true);
  const saved=await page.evaluate(async()=>{const scene=ToSampoolV4Workspace.current(),packageValue=await EditorVNextProjectPackage.build(scene),restored=(await EditorVNextProjectPackage.restore(packageValue.files)).scene;
    window.__strokeEmbed=EditorVNextDeliveryBuilder.embedHtml({scene:restored,name:'stroke-reveal',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
    return{tracks:Object.keys(restored.timeline.tracks),keys:restored.timeline.tracks.owner.segments[1].linearKeys,
      hasCache:JSON.stringify(restored).includes('_strokeDashAdvance')};});
  assert.deepEqual(saved.tracks,['owner']);assert.ok(saved.keys.includes('partsById.A.strokeCompletion'));assert.equal(saved.hasCache,false);
  const exported=await browser.newPage();await exported.setContent(await page.evaluate(()=>window.__strokeEmbed));
  await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));assert.equal(await exported.locator('[data-tosampool-error]').count(),0);await exported.close();
  assert.deepEqual(errors,[]);
  console.log('✓ 笔触完成度：弧长／反向／虚线相位／稳定框／对象共用轨／独立数值／Linear／撤销／项目与导出通过');
}finally{await browser.close();}
