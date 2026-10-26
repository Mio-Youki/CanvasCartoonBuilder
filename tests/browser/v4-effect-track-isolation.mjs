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
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?effect-track-isolation=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&typeof classicV4Timeline!=='undefined'&&window.ToSampoolRuntimeVNext);
  await page.evaluate(()=>{
    ToSampoolV4Workspace.createBlank({width:64,height:48,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{
      scene.entities.push({id:'probe',name:'轨道测试',type:'rect',x:8,y:8,w:40,h:24,fill:'#ffffff'});
      EditorVNextEffectState.enable(scene,{scope:'object',ownerId:'probe',effectId:'tint-overlay'});
      EditorVNextEffectState.setParam(scene,{scope:'object',ownerId:'probe',effectId:'tint-overlay',key:'color',value:'#ff0000'});
      EditorVNextEffectState.setParam(scene,{scope:'object',ownerId:'probe',effectId:'tint-overlay',key:'alpha',value:1});
      EditorVNextEffectState.setParam(scene,{scope:'object',ownerId:'probe',effectId:'tint-overlay',key:'blend',value:'normal'});
      EditorVNextEffectState.enable(scene,{scope:'object',ownerId:'probe',effectId:'texture-overlay'});
      EditorVNextTimelineState.insertScene(scene,0,.5,'场景 2','after');
    });
    classicV4View.select('probe');classicV4Inspector.focusEffect('object','probe','tint-overlay');
  });
  const lane=page.locator('#tl-context'),box=await lane.boundingBox();
  await lane.click({position:{x:box.width*.5+3,y:box.height*.5},modifiers:['Alt']});
  let data=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument();return{track:structuredClone(scene.timeline.tracks['effect:object:probe:tint-overlay']),visibility:scene.timeline.visibility?.probe||null};
  });
  assert.equal(data.track.segments.length,2,'Alt 切分应只创建当前效果参数段');
  assert.ok(Math.abs(data.track.segments[0].f[1]-.5)<.00001,'靠近 Scene 边界的切分应吸附到边界');
  assert.equal(data.visibility,null,'效果轨切分不得创建对象显示轨');
  await page.evaluate(()=>classicV4Timeline.seek(3));
  await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().uncheck();
  data=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument(),track=scene.timeline.tracks['effect:object:probe:tint-overlay'];
    return{base:scene.entities[0].effects.decorate['tint-overlay'].enabled,segments:structuredClone(track.segments),visibility:scene.timeline.visibility?.probe||null};
  });
  assert.equal(data.base,false,'Inspector 效果卡开关必须始终控制全局');
  assert.equal(data.segments[1].values.enabled,undefined,'全局开关不得暗写当前效果时段');
  assert.equal(await page.locator('#effect-list .v4-effect-index-card[data-id="tint-overlay"]').count(),0,'Inspector 全局停用后左侧效果卡应消失');
  await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().check();
  assert.equal(await page.locator('#effect-list .v4-effect-index-card[data-id="tint-overlay"]').count(),1,'Inspector 全局启用后左侧效果卡应恢复');
  await page.locator('#effect-list .v4-effect-index-card[data-id="tint-overlay"] .effect-card-remove').click();
  assert.equal(await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().isChecked(),false,'左侧移除效果卡应同步停用 Inspector 全局开关');
  assert.equal(await page.locator('#effect-list .v4-effect-index-card[data-id="tint-overlay"]').count(),0,'左侧停用后不再展示效果卡');
  await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().check();
  await page.evaluate(()=>ToSampoolV4Workspace.mutate(scene=>EditorVNextTimelineState.setStep(scene,'effect:object:probe:tint-overlay',1,{alpha:.5})));
  await lane.dblclick({position:{x:box.width*.75,y:box.height*.5}});
  const cleared=await page.evaluate(()=>ToSampoolV4Workspace.requireDocument().timeline.tracks['effect:object:probe:tint-overlay'].segments);
  assert.equal(cleared.length,2,'双击有参数覆层的效果段应先清除参数但保留切点');
  assert.deepEqual(cleared[1].values,{},'清除当前效果参数不应立刻停用效果');
  await lane.dblclick({position:{x:box.width*.75,y:box.height*.5}});
  data=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument(),track=scene.timeline.tracks['effect:object:probe:tint-overlay'];
    return{base:scene.entities[0].effects.decorate['tint-overlay'].enabled,segments:structuredClone(track.segments),visibility:scene.timeline.visibility?.probe||null};
  });
  assert.equal(data.base,true,'双击停用一段不得改变效果卡全局开关');
  assert.equal(data.segments[1].values.enabled,false,'双击空白效果段应只停用该段');
  assert.equal(data.visibility,null,'时段停用不得改变对象显示范围');
  assert.equal(await page.locator('#btn-timing-mode').evaluate(node=>node.classList.contains('active')),false,'仅隐藏效果的时段不应误亮参数时序');
  assert.equal(await page.locator('#effect-list .v4-effect-index-card[data-id="tint-overlay"]').count(),1,'单时段隐藏不应移除全局效果卡');
  const pixels=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument(),runtime=ToSampoolRuntimeVNext.createRuntime(scene),canvas=document.createElement('canvas');
    runtime.renderTo(canvas,1);const on=[...canvas.getContext('2d').getImageData(20,20,1,1).data];
    runtime.renderTo(canvas,3);const off=[...canvas.getContext('2d').getImageData(20,20,1,1).data];
    return{on,off};
  });
  assert.ok(pixels.on[1]<pixels.off[1]-100,'对象效果应只在启用时段染色');
  await page.evaluate(()=>classicV4Inspector.focusEffect('object','probe','texture-overlay'));
  await lane.click({position:{x:box.width*.7,y:box.height*.5},modifiers:['Alt']});
  const separate=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument();return{a:structuredClone(scene.timeline.tracks['effect:object:probe:tint-overlay']),b:structuredClone(scene.timeline.tracks['effect:object:probe:texture-overlay']),visibility:scene.timeline.visibility?.probe||null};
  });
  assert.equal(separate.a.segments.length,2);assert.equal(separate.b.segments.length,2);
  assert.ok(Math.abs(separate.a.segments[0].f[1]-.5)<.00001);
  assert.ok(Math.abs(separate.b.segments[0].f[1]-.7)<.02);
  assert.equal(separate.visibility,null,'各效果独立切段仍不得改动对象显示轨');
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.5+3,box.y+box.height*.5,{steps:4});await page.mouse.up();
  const dragged=await page.evaluate(()=>{
    const tracks=ToSampoolV4Workspace.requireDocument().timeline.tracks;
    return{a:tracks['effect:object:probe:tint-overlay'].segments[0].f[1],b:tracks['effect:object:probe:texture-overlay'].segments[0].f[1]};
  });
  assert.ok(Math.abs(dragged.b-.5)<.00001,'拖动效果边界接近 Scene 边界时应吸附');
  assert.ok(Math.abs(dragged.a-.5)<.00001,'拖动另一效果边界不得改变本效果');
  await page.evaluate(()=>classicV4Inspector.focusEffect('object','probe','tint-overlay'));
  await lane.dblclick({position:{x:box.width*.75,y:box.height*.5}});
  const restored=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument();return{segments:scene.timeline.tracks['effect:object:probe:tint-overlay'].segments,visibility:scene.timeline.visibility?.probe||null};
  });
  assert.equal(restored.segments.length,1,'再次双击停用段应恢复效果并合并空切分');
  assert.equal(restored.visibility,null);
  await page.evaluate(()=>{
    ToSampoolV4Workspace.mutate(scene=>EditorVNextTimelineState.splitVisibility(scene,'probe',.25));
    classicV4Timeline.setTrack('probe','轨道测试',{readOnlyVisibility:true,linearKeys:['x','y']});
  });
  await lane.click({position:{x:box.width*.7,y:box.height*.5},modifiers:['Alt']});
  const bodyTracks=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument();return{parameter:scene.timeline.tracks.probe.segments,visibility:scene.timeline.visibility.probe.segments};
  });
  assert.ok(Math.abs(bodyTracks.parameter[0].f[1]-.7)<.02,'对象本体参数段应独立切分');
  assert.ok(Math.abs(bodyTracks.visibility[0].f[1]-.25)<.00001,'对象本体参数切分不得改变显示轨');
  await page.evaluate(()=>{
    classicV4View.select(null);
    ToSampoolV4Workspace.mutate(scene=>{
      EditorVNextEffectState.setEnabled(scene,{scope:'scene',effectId:'tint-overlay'},true);
      const key='effect:scene:overlay:tint-overlay';EditorVNextTimelineState.split(scene,key,.5);
      scene.sceneEffects.overlay['tint-overlay'].color='#00ff00';scene.sceneEffects.overlay['tint-overlay'].alpha=1;scene.sceneEffects.overlay['tint-overlay'].blend='normal';
    });
    classicV4Inspector.focusEffect('scene',null,'tint-overlay');classicV4Timeline.seek(1);
  });
  await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().uncheck();
  const sceneTrack=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.requireDocument();return{base:scene.sceneEffects.overlay['tint-overlay'].enabled,segments:structuredClone(scene.timeline.tracks['effect:scene:overlay:tint-overlay'].segments)};
  });
  assert.equal(sceneTrack.base,false);assert.equal(sceneTrack.segments[0].values.enabled,undefined,'场景效果卡开关同样只控制全局');
  await page.locator('#inspector-context [data-v4-effect-id="tint-overlay"] input[type="checkbox"]').first().check();
  await lane.dblclick({position:{x:box.width*.25,y:box.height*.5}});
  const sceneHidden=await page.evaluate(()=>ToSampoolV4Workspace.requireDocument().timeline.tracks['effect:scene:overlay:tint-overlay'].segments[0].values.enabled);
  assert.equal(sceneHidden,false,'双击场景效果的空白切分段应只停用该段');
  const scenePixels=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.requireDocument()),canvas=document.createElement('canvas');
    runtime.renderTo(canvas,1);const off=[...canvas.getContext('2d').getImageData(20,20,1,1).data];
    runtime.renderTo(canvas,3);const on=[...canvas.getContext('2d').getImageData(20,20,1,1).data];
    return{off,on};
  });
  assert.ok(scenePixels.on[1]>scenePixels.off[1]+100,'场景效果被隐藏的时段不得应用染色');
  const globallyOff=await page.evaluate(()=>{
    ToSampoolV4Workspace.mutate(scene=>{
      EditorVNextEffectState.setEnabled(scene,{scope:'scene',effectId:'tint-overlay'},false);
      EditorVNextTimelineState.setStep(scene,'effect:scene:overlay:tint-overlay',1,{enabled:true});
    });
    const runtime=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.requireDocument()),canvas=document.createElement('canvas');
    runtime.renderTo(canvas,3);return[...canvas.getContext('2d').getImageData(20,20,1,1).data];
  });
  assert.ok(globallyOff[1]<scenePixels.on[1]-100,'全局关闭必须压过旧时段中的 enabled:true');
  assert.deepEqual(errors,[]);
  console.log('✓ 对象/场景效果独立启停、只读显示底带与 Scene 边界吸附通过');
}finally{await browser.close();}
