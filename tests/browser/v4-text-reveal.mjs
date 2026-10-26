#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({executablePath:edge,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?text-reveal=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(async()=>{
    const runtime=ToSampoolRuntimeVNext,reveal=runtime.modules.textReveal;
    const scene={format:'tosampool-scene/v4',width:240,height:120,loop:4,background:{alpha:0},entities:[
      {id:'text',type:'text',text:'AB\nCD',x:12,y:10,fontSize:24,fontFamily:'serif',fill:'#ffffff',letterSpacing:4,lineHeight:1.25}]};
    EditorVNextTextState.update(scene,'text',{},document);
    const item=scene.entities[0];
    scene.runtimeAssets=await EditorVNextAssetLoader.resolve(scene,{referencedOnly:true});
    const pixels=(progress,time=0,cursor=null)=>{
      item.textCompletion=progress;item.textCursor=cursor;
      const canvas=document.createElement('canvas');runtime.createRuntime(scene).renderTo(canvas,time);
      return Array.from(canvas.getContext('2d').getImageData(0,0,240,120).data);
    };
    const ink=bytes=>bytes.filter((value,index)=>index%4===3&&value>0).length;
    const zero=pixels(0),quarter=pixels(25),half=pixels(50),full=pixels(100);
    const cursor={enabled:true,style:'bar',period:1},cursorOn=pixels(0,.1,cursor),cursorOff=pixels(0,.7,cursor),completedCursor=pixels(100,.1,cursor);
    const lastPosition=item.textLayout.positions[2],constant={...cursor,period:0};
    const constantA=pixels(25,.1,constant),constantB=pixels(25,.7,constant);
    const oldFont=item.fontFamily;item.fontFamily='unavailable-font-for-export';const portable=pixels(50);item.fontFamily=oldFont;
    scene.timeline={tracks:{text:{segments:[{f:[0,.2],values:{textCompletion:0}},{f:[.2,.8],type:'linear',linearKeys:['textCompletion']},{f:[.8,1],values:{textCompletion:100}}]}}};
    const evaluated=[.1,.35,.5,.65,.9].map(rel=>runtime.modules.timeline.valuesFor(scene,'text',item,rel).textCompletion);
    const player=runtime.createRuntime(scene),frames=[1.4,2,2.6].map(time=>{const canvas=document.createElement('canvas');player.renderTo(canvas,time);return ink(Array.from(canvas.getContext('2d').getImageData(0,0,240,120).data));});
    const roundtrip=JSON.parse(EditorVNextScene.serialize(scene));
    const embed=EditorVNextDeliveryBuilder.embedHtml({scene:roundtrip,name:'text-reveal-test',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__});
    const assetCount=Object.keys(EditorVNextDeliveryBuilder.pruneScene(roundtrip).assets).length;
    const packaged=await EditorVNextProjectPackage.build(roundtrip,{displayName:'文字完成度'}),restored=await EditorVNextProjectPackage.restore(packaged.files);
    window.__textRevealEmbed=embed.data;
    return {ink:[zero,quarter,half,full].map(ink),cursorOn:ink(cursorOn),cursorOff:ink(cursorOff),
      cursorGone:JSON.stringify(completedCursor)===JSON.stringify(full),constant:JSON.stringify(constantA)===JSON.stringify(constantB),
      portable:JSON.stringify(portable)===JSON.stringify(half),lastPosition,positions:item.textLayout.positions,
      count:reveal.count(item),unicode:reveal.graphemes('你👩‍💻é').length,evaluated,frames,
      assets:assetCount,refs:Array.from(EditorVNextAssetLoader.referencedAssetIds(scene)),
      hidden:Object.values(scene.assets).every(asset=>asset.internal),
      dimensions:[item.w,item.h],roundtrip:roundtrip.entities[0].textLayout.glyphs.length,
      projectUnused:packaged.unused.length,projectHidden:Object.values(restored.scene.assets).every(asset=>asset.internal),
      projectGlyphs:restored.scene.entities[0].textLayout.glyphs.length};
  });
  assert.equal(result.ink[0],0,'0% 正文必须为空');
  assert.ok(result.ink[1]>0&&result.ink[2]>result.ink[1]&&result.ink[3]>result.ink[2],'完成度必须逐字显现');
  assert.equal(result.count,4,'换行不占输入节拍');assert.equal(result.unicode,3,'组合字符与 Emoji 不可被拆开');
  assert.equal(result.lastPosition.x,0);assert.equal(result.lastPosition.y,30,'换行后光标应进入下一行');
  assert.ok(result.cursorOn>0&&result.cursorOff===0&&result.cursorGone&&result.constant,'光标须按固定时间闪烁，0周期常亮，100%隐藏');
  assert.ok(result.portable&&result.hidden,'字形图集须保证无字体播放，且不进入素材库');
  assert.equal(result.assets,2);assert.ok(result.refs.some(id=>id.startsWith('text-glyphs-')),'交付与按需加载不得漏掉字形图集');
  assert.equal(result.projectUnused,0,'项目不得把文字内部资源误认为未使用');assert.ok(result.projectHidden);assert.equal(result.projectGlyphs,4);
  assert.equal(result.roundtrip,4);assert.deepEqual(result.evaluated.map(Math.round),[0,25,50,75,100]);
  assert.ok(result.frames[0]<result.frames[1]&&result.frames[1]<result.frames[2],'Linear 必须改变实际画面');

  const embedPage=await browser.newPage();await embedPage.setContent(await page.evaluate(()=>window.__textRevealEmbed));
  await embedPage.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));
  assert.equal(await embedPage.locator('[data-tosampool-error]').count(),0,'自包含导出须成功解码并启动');await embedPage.close();

  await page.evaluate(()=>{
    if(state.playing)togglePlay();
    ToSampoolV4Workspace.createBlank({width:240,height:120,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{scene.entities.push({id:'editable-text',name:'打字测试',type:'text',text:'ABCD',x:12,y:10,w:1,h:1,fontSize:24,fill:'#ffffff'});EditorVNextTextState.update(scene,'editable-text',{},document);});
    classicV4View.select('editable-text');classicV4Timeline.seek(.4);
  });
  const complete=page.locator('[data-text-param="completion"]');
  await complete.fill('50');await complete.press('Tab');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].textCompletion),50);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await complete.inputValue(),'100.0','完成度须可撤销');
  await page.locator('[data-text-param="cursor-enabled"]').check();
  await page.locator('[data-text-param="cursor-style"]').selectOption('underline');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].textCursor.style),'underline','光标应即时展开且样式可保存');
  await page.evaluate(()=>classicV4Changes.run('测试切段',scene=>{EditorVNextTimelineState.split(scene,'editable-text',.2);EditorVNextTimelineState.split(scene,'editable-text',.8);}));
  await page.locator('#btn-timing-mode').click();
  await complete.fill('0');await complete.press('Tab');
  const timed=await page.evaluate(()=>({base:ToSampoolV4Workspace.current().entities[0].textCompletion,
    value:ToSampoolV4Workspace.current().timeline.tracks['editable-text'].segments[0].values.textCompletion}));
  assert.deepEqual(timed,{base:100,value:0},'时序写入不得污染基础完成度');
  await page.evaluate(()=>classicV4Changes.run('测试终态',scene=>EditorVNextTimelineState.setStep(scene,'editable-text',2,{textCompletion:100})));
  const lane=await page.locator('#tl-context').boundingBox();
  await page.mouse.move(lane.x+lane.width*.5,lane.y+lane.height*.5);
  await page.locator('#tl-linear-toggle').click();
  const keys=await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.tracks['editable-text'].segments[1].linearKeys);
  assert.ok(keys.includes('textCompletion'),'时间轴真实 Linear 入口必须允许文字完成度');
  await page.evaluate(()=>classicV4Timeline.seek(2));
  assert.equal(Number(await complete.inputValue()),50,'Inspector 应跟随 Linear 插值');
  assert.deepEqual(errors,[]);
  console.log('✓ 文字完成度：完整字符、多行、便携字形、光标、撤销、时序 Linear 与自包含导出通过');
} finally { await browser.close(); }
