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
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?scene-mask-timeline=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.EditorVNextMaskState&&window.ToSampoolRuntimeVNext);
  await page.evaluate(()=>{
    const image=document.createElement('canvas');image.width=2;image.height=1;
    image.getContext('2d').fillRect(0,0,1,1);
    ToSampoolV4Workspace.createBlank({width:64,height:48,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{
      scene.assets={mask:{name:'测试 Alpha',locator:image.toDataURL(),width:2,height:1}};
      scene.entities.push({id:'mask-probe',name:'蒙版测试',type:'rect',x:8,y:8,w:40,h:24,fill:'#ffffff'});
      EditorVNextEffectState.enable(scene,{scope:'scene',effectId:'tint-overlay'});
      EditorVNextEffectState.enable(scene,{scope:'scene',effectId:'color-grade'});
    });
    classicV4View.select('mask-probe');
  });
  const mask=await page.evaluate(()=>{
    const inspector=document.getElementById('inspector-context');
    const type=Array.from(inspector.querySelectorAll('.global-field')).find(row=>row.firstElementChild?.textContent==='蒙版')?.querySelector('select');
    type.value='alpha';type.dispatchEvent(new Event('change',{bubbles:true}));
    const current=EditorVNextMaskState.current(ToSampoolV4Workspace.requireDocument(),{scope:'object',ownerId:'mask-probe'});
    return {alpha:inspector.textContent.includes('Alpha 素材'),mapping:inspector.textContent.includes('提取方式'),edit:inspector.textContent.includes('编辑'),stored:current?.type,assetId:current?.assetId};
  });
  assert.deepEqual(mask,{alpha:true,mapping:true,edit:true,stored:'alpha',assetId:'mask'},'通过蒙版下拉框选 Alpha 图片后应立即写入并展开参数');
  await page.locator('#inspector-context .global-field:has-text("画布范围") button:has-text("编辑")').click();
  const bounds=await page.evaluate(()=>['X','Y','W','H'].map(label=>Array.from(document.querySelectorAll('#inspector-context .global-field')).some(node=>node.firstElementChild?.textContent===label)));
  assert.deepEqual(bounds,[true,true,true,true],'Alpha 图片进入画布编辑时应展开 X/Y/W/H');
  const alphaRender=await page.evaluate(()=>{
    const image=document.createElement('canvas');image.width=2;image.height=1;image.getContext('2d').fillRect(0,0,1,1);
    const scene={format:'tosampool-scene/v4',width:64,height:48,loop:2,background:{alpha:0},runtimeAssets:{mask:{image}},entities:[{id:'target',type:'rect',x:8,y:8,w:40,h:24,fill:'#ffffff',effects:{mask:{type:'alpha',assetId:'mask',x:8,y:8,w:40,h:24,mode:'alpha'}}}]};
    const canvas=document.createElement('canvas');ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);
    const ctx=canvas.getContext('2d'),visible=ctx.getImageData(14,20,1,1).data[3],removed=ctx.getImageData(40,20,1,1).data[3];
    scene.entities[0].effects.mask.mode='luma';ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);
    return{visible,removed,luma:ctx.getImageData(14,20,1,1).data[3]};
  });
  assert.ok(alphaRender.visible>200&&alphaRender.removed<10,'Alpha 图片的透明通道必须实际裁切对象');
  assert.ok(alphaRender.luma<10,'明度映射必须和原 Alpha 产生不同结果');
  const sceneMask=await page.evaluate(()=>{
    classicV4Masks.end(false);classicV4View.select(null);classicV4Inspector.focusEffect('scene',null,'tint-overlay');
    const card=document.querySelector('#inspector-context [data-v4-effect-id="tint-overlay"]');
    const type=Array.from(card.querySelectorAll('.global-field')).find(row=>row.firstElementChild?.textContent==='范围蒙版')?.querySelector('select');
    type.value='alpha';type.dispatchEvent(new Event('change',{bubbles:true}));
    const current=EditorVNextMaskState.current(ToSampoolV4Workspace.requireDocument(),{scope:'scene',effectId:'tint-overlay'});
    const updated=document.querySelector('#inspector-context [data-v4-effect-id="tint-overlay"]');
    return{stored:current?.type,assetId:current?.assetId,alpha:updated.textContent.includes('Alpha 素材'),mapping:updated.textContent.includes('提取方式')};
  });
  assert.deepEqual(sceneMask,{stored:'alpha',assetId:'mask',alpha:true,mapping:true},'场景效果范围蒙版也应使用相同的 Alpha 图片渐进参数');
  const first=await page.evaluate(()=>({key:classicV4Timeline.trackKey,picture:document.getElementById('tl-context').toDataURL()}));
  const lane=page.locator('#tl-context'),box=await lane.boundingBox();
  await lane.click({position:{x:box.width*.25,y:box.height*.5},modifiers:['Alt']});
  const split=await page.evaluate(()=>({key:classicV4Timeline.trackKey,tracks:structuredClone(ToSampoolV4Workspace.requireDocument().timeline.tracks),picture:document.getElementById('tl-context').toDataURL()}));
  assert.equal(split.key,first.key);assert.ok(split.tracks[first.key]);assert.equal(split.tracks[first.key].segments.length,2,'场景效果 Alt+单击必须只切自己的参数轨');
  assert.notEqual(split.picture,first.picture,'空白的参数切分也必须立即显示边界');
  await page.evaluate(()=>classicV4Inspector.focusEffect('scene',null,'color-grade'));
  const second=await page.evaluate(()=>({key:classicV4Timeline.trackKey,picture:document.getElementById('tl-context').toDataURL()}));
  assert.notEqual(second.key,first.key,'点击另一场景效果必须立刻换轨');
  assert.notEqual(second.picture,split.picture,'不同效果不得共用旧轨道的切分画面');
  await lane.click({position:{x:box.width*.65,y:box.height*.5},modifiers:['Alt']});
  const separate=await page.evaluate(()=>structuredClone(ToSampoolV4Workspace.requireDocument().timeline.tracks));
  assert.equal(separate[second.key].segments.length,2);
  assert.equal(separate[first.key].segments.length,2);
  assert.ok(Math.abs(separate[first.key].segments[0].f[1]-.25)<.02);
  assert.ok(Math.abs(separate[second.key].segments[0].f[1]-.65)<.02);
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.75,box.y+box.height*.5,{steps:3});await page.mouse.up();
  const moved=await page.evaluate(key=>ToSampoolV4Workspace.requireDocument().timeline.tracks[key].segments[0].f[1],second.key);
  assert.ok(Math.abs(moved-.75)<.03,'场景效果参数边界必须可拖动');
  await lane.dblclick({position:{x:box.width*.8,y:box.height*.5}});
  const hidden=await page.evaluate(key=>ToSampoolV4Workspace.requireDocument().timeline.tracks[key].segments,second.key);
  assert.equal(hidden.length,2,'空白场景效果段双击应保留其独立切分');
  assert.equal(hidden[1].values.enabled,false,'空白场景效果段双击应局部停用');
  await lane.dblclick({position:{x:box.width*.8,y:box.height*.5}});
  const merged=await page.evaluate(key=>ToSampoolV4Workspace.requireDocument().timeline.tracks[key].segments.length,second.key);
  assert.equal(merged,1,'再次双击停用段应恢复并合并空切分');
  await page.evaluate(()=>{
    ToSampoolV4Workspace.createBlank({width:64,height:48,loop:4});
    ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'empty-mask-probe',name:'空库蒙版测试',type:'rect',x:8,y:8,w:40,h:24,fill:'#ffffff'}));
    classicV4View.select('empty-mask-probe');
  });
  const png=Buffer.from((await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);
    return canvas.toDataURL('image/png');
  })).split(',')[1],'base64');
  const firstPicker=page.waitForEvent('filechooser');
  await page.locator('#inspector-context .global-field').filter({has:page.locator('span:text-is("蒙版")')}).locator('select').selectOption('alpha');
  await (await firstPicker).setFiles({name:'mask-first.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>EditorVNextMaskState.current(ToSampoolV4Workspace.requireDocument(),{scope:'object',ownerId:'empty-mask-probe'})?.type==='alpha');
  const firstImport=await page.evaluate(()=>({assets:Object.keys(ToSampoolV4Workspace.requireDocument().assets),mask:EditorVNextMaskState.current(ToSampoolV4Workspace.requireDocument(),{scope:'object',ownerId:'empty-mask-probe'})}));
  assert.equal(firstImport.assets.length,1,'空素材库选择 Alpha 图片应直接导入一张素材');
  assert.equal(firstImport.mask.assetId,firstImport.assets[0]);
  const assetSelector=page.locator('#inspector-context .global-field').filter({has:page.locator('span:text-is("Alpha 素材")')}).locator('select');
  assert.equal(await assetSelector.locator('option').last().textContent(),'从文件导入+');
  const secondPicker=page.waitForEvent('filechooser');
  await assetSelector.selectOption('__import_file__');
  await (await secondPicker).setFiles({name:'mask-second.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>Object.keys(ToSampoolV4Workspace.requireDocument().assets).length===2);
  const secondImport=await page.evaluate(()=>({assets:Object.keys(ToSampoolV4Workspace.requireDocument().assets),mask:EditorVNextMaskState.current(ToSampoolV4Workspace.requireDocument(),{scope:'object',ownerId:'empty-mask-probe'})}));
  assert.equal(secondImport.mask.assetId,secondImport.assets[1],'从 Alpha 素材下拉列表导入后应自动选用新素材');
  assert.deepEqual(errors,[]);
  console.log('✓ Alpha 图片蒙版渐进参数与场景效果独立时间轨通过');
}finally{await browser.close();}
