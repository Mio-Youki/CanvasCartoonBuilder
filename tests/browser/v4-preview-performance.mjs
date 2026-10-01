#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),candidate=resolve(root,'img2asset-v4-classic.html');
const edgeCandidates=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const executablePath=edgeCandidates.find(existsSync),browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('requestfailed',request=>errors.push(`request failed: ${request.url()} (${request.failure()?.errorText||'unknown'})`));
await page.goto(`${pathToFileURL(candidate).href}?e2e=1`,{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>window.ToSampoolSession?.activeId==='v4'&&window.ToSampoolV4Workspace?.hasDocument,null,{timeout:15000});

const specs=[{id:'S',width:480,height:270,objects:1},{id:'M',width:960,height:540,objects:2},{id:'L',width:1920,height:1080,objects:2}];
// 当前开发机的交互预算；跨设备回归以相对 Full 降幅、工作像素与完整记录为主。
// S/M 需留在 100ms 参数预览底线内；L 是 1920×1080 多像素遍压力档，允许单帧 120ms，
// 但 Auto 必须降低节奏，不能把它冒充连续实时 Full 预览。
const draftP95Budgets={S:50,M:90,L:120};
const results=[];
for(const spec of specs){
  const pair=await page.evaluate(async spec=>{
    const makeScene=()=>{
      const entities=[];
      for(let index=0;index<spec.objects;index++)entities.push({id:`capsule-${index}`,name:`胶囊 ${index+1}`,type:'rect',x:spec.width*(.08+index*.38),y:spec.height*(.18+index*.12),w:spec.width*.42,h:spec.height*.54,fill:index%2?'#49a6d8':'#e36f4c',radius:Math.round(spec.height*.04),anim:{bob:{amount:3+index,period:2}},effects:{pipeline:['mask','decorate','sample'],mask:{type:'ellipse',x:spec.width*(.08+index*.38),y:spec.height*(.18+index*.12),w:spec.width*.42,h:spec.height*.54},decorate:{outline:{enabled:true,color:'#111827',alpha:1,width:3},'tint-overlay':{enabled:true,color:'#ffe8a3',alpha:.15,blend:'screen'}},sample:{controllers:{'sampling-grid':{size:4,phaseX:0,phaseY:0,rotation:0}},threshold:{enabled:true,threshold:.48,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.08,period:2,steps:12}},'offset-sampling':{enabled:true,mode:'boil',seed:7+index,boil:{maxOffset:1},motion:{enabled:true,period:1.5,steps:12}}}}});
      return{format:'tosampool-scene/v4',width:spec.width,height:spec.height,loop:4,background:{color:'#182033',alpha:1},entities,timeline:{tracks:{}},sceneEffects:{pipeline:['overlay','sample','output-grain'],overlay:{'color-grade':{enabled:true,hue:5,brightness:3,contrast:6,saturation:8}},sample:{controllers:{'sampling-grid':{size:4,phaseX:0,phaseY:0,rotation:0}},threshold:{enabled:true,threshold:.5,dark:'#162034',light:'#d8cfae',motion:{enabled:true,amount:.035,period:2.5,steps:12}}},outputGrain:{}}};
    };
    const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*p)-1)],measure=async multiplier=>{const scene=makeScene(),player=ToSampoolRuntimeVNext.createRuntime(scene),canvas=document.createElement('canvas'),times=[],frames=[];for(let index=0;index<2;index++)player.renderTo(canvas,index/12,{pixelDivMultiplier:multiplier});for(let index=0;index<10;index++){const started=performance.now(),stats=player.renderTo(canvas,(index+2)/12,{pixelDivMultiplier:multiplier});times.push(performance.now()-started);frames.push(stats);}const last=frames.at(-1);return{avg:times.reduce((a,b)=>a+b,0)/times.length,p95:percentile(times,.95),workPixels:last.workPixels,pixelPasses:last.pixelPasses,offscreenPeakPixels:last.surfaces.peakPixels,backingSizeWrites:last.backingSizeWrites,multiplier:last.previewPixelDivMultiplier,width:canvas.width,height:canvas.height};};
    const draftMultiplier=spec.width*spec.height>1000000?8:spec.width*spec.height>300000?4:2;
    return{full:await measure(1),draft:await measure(draftMultiplier),scene:makeScene()};
  },spec);
  assert.equal(pair.full.width,spec.width);assert.equal(pair.full.height,spec.height);assert.equal(pair.draft.width,spec.width);assert.equal(pair.draft.height,spec.height,'Draft 不得改变输出 Canvas 尺寸');
  const expectedDraft=spec.width*spec.height>1000000?8:spec.width*spec.height>300000?4:2;assert.equal(pair.full.multiplier,1);assert.equal(pair.draft.multiplier,expectedDraft);
  assert.ok(pair.full.workPixels>0&&pair.draft.workPixels>0,`${spec.id} 必须报告 CPU 工作像素`);
  assert.ok(pair.draft.workPixels<=pair.full.workPixels*.35,`${spec.id} Draft 工作像素应至少降低 65%（${pair.full.workPixels} → ${pair.draft.workPixels}）`);
  // S 档的像素处理已接近浏览器调度和 Canvas 创建的固定成本；单次 P95
  // 可在数毫秒内抖动，不能把这种噪声误判为 Runtime 回归。M/L 仍必须以
  // 更少的工作像素换来实际更低的 P95；S 只允许有限的测量波动。
  if(spec.id==='S')assert.ok(pair.draft.p95<=Math.max(pair.full.p95*1.25,pair.full.p95+10),`S Draft P95 不得因降采样出现异常回退（${pair.draft.p95.toFixed(2)}ms vs ${pair.full.p95.toFixed(2)}ms）`);
  else assert.ok(pair.draft.p95<pair.full.p95,`${spec.id} Draft Runtime P95 必须低于 Full（${pair.draft.p95.toFixed(2)}ms vs ${pair.full.p95.toFixed(2)}ms）`);
  assert.ok(pair.draft.p95<=draftP95Budgets[spec.id],`${spec.id} Draft Runtime P95 超过 ${draftP95Budgets[spec.id]}ms 预算（${pair.draft.p95.toFixed(2)}ms）`);
  assert.ok(pair.full.backingSizeWrites<=2&&pair.draft.backingSizeWrites<=2,`${spec.id} 同尺寸连续渲染不得重复写 backing size`);
  assert.equal(JSON.stringify(pair.scene).includes('previewPixelDivMultiplier'),false,'预览质量不得写入 Scene');
  results.push({id:spec.id,width:spec.width,height:spec.height,full:pair.full,draft:pair.draft});
}

const cadence=await page.evaluate(async()=>{
  const scene={format:'tosampool-scene/v4',width:480,height:270,loop:4,background:{color:'#182033',alpha:1},timeline:{tracks:{}},entities:[{id:'moving-capsule',type:'rect',x:80,y:60,w:240,h:140,fill:'#e36f4c',anim:{bob:{amount:4,period:1}},effects:{decorate:{outline:{enabled:true,color:'#000000',alpha:1,width:3}},sample:{controllers:{'sampling-grid':{size:4}},threshold:{enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.08,period:1,steps:12}}}}}],sceneEffects:{overlay:{'tint-overlay':{enabled:true,color:'#9ed7ff',alpha:.15,blend:'screen'}},sample:{},outputGrain:{}}};
  ToSampoolV4Workspace.replace(scene);await new Promise(resolve=>setTimeout(resolve,200));
  const run=async(mode,duration)=>{const select=document.querySelector('#preview-quality');select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,160));const before=classicV4View.performance();document.querySelector('#tl-play').click();await new Promise(resolve=>setTimeout(resolve,duration));document.querySelector('#tl-play').click();await new Promise(resolve=>setTimeout(resolve,100));const after=classicV4View.performance();return{mode:after.quality.mode,effectiveMode:after.quality.effectiveMode,targetFps:after.quality.targetFps,renders:after.scheduler.renders-before.scheduler.renders,budgetSkips:after.scheduler.budgetSkips-before.scheduler.budgetSkips,rafP95:after.frameP95,last:after.lastRender};};
  return{full:await run('full',1600),draft:await run('draft',1600),serialized:EditorVNextScene.serialize(ToSampoolV4Workspace.current())};
});
assert.equal(cadence.full.mode,'full');assert.equal(cadence.draft.mode,'draft');assert.equal(cadence.full.last.previewPixelDivMultiplier,1);assert.equal(cadence.draft.last.previewPixelDivMultiplier,2);
assert.ok(cadence.full.renders>cadence.draft.renders,`Full 重绘次数应高于 Draft（${cadence.full.renders} vs ${cadence.draft.renders}）`);
assert.ok(cadence.draft.budgetSkips>cadence.full.budgetSkips,'Draft 应通过预算跳过更多动态帧');
assert.ok(cadence.full.rafP95<=33&&cadence.draft.rafP95<=33,`连续动态预览 RAF P95 必须满足 33ms 目标（Full ${cadence.full.rafP95.toFixed(2)}ms / Draft ${cadence.draft.rafP95.toFixed(2)}ms）`);
assert.ok(!cadence.serialized.includes('previewPixelDivMultiplier')&&!cadence.serialized.includes('previewQuality'),'预览模式不得进入持久 Scene');

const auto=await page.evaluate(async()=>{
  const width=960,height=540,scene={format:'tosampool-scene/v4',width,height,loop:4,background:{color:'#182033',alpha:1},timeline:{tracks:{}},entities:[{id:'auto-capsule',type:'rect',x:80,y:70,w:720,h:360,fill:'#e36f4c',effects:{pipeline:['mask','decorate','sample'],decorate:{outline:{enabled:true,color:'#111827',alpha:1,width:6}},sample:{controllers:{'sampling-grid':{size:4}},threshold:{enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.08,period:1,steps:12}},'offset-sampling':{enabled:true,mode:'boil',seed:9,boil:{maxOffset:1},motion:{enabled:true,period:1.5,steps:12}}}}}],sceneEffects:{pipeline:['overlay','sample','output-grain'],overlay:{'color-grade':{enabled:true,hue:5,brightness:3,contrast:6,saturation:8}},sample:{controllers:{'sampling-grid':{size:4}},threshold:{enabled:true,threshold:.5,dark:'#162034',light:'#d8cfae',motion:{enabled:true,amount:.035,period:2,steps:12}}},outputGrain:{}}};
  ToSampoolV4Workspace.replace(scene);await new Promise(resolve=>setTimeout(resolve,200));
  const select=document.querySelector('#preview-quality');select.value='auto';select.dispatchEvent(new Event('change',{bubbles:true}));
  for(let index=0;index<10;index++)await classicV4View.render();
  return classicV4View.performance();
});
assert.equal(auto.quality.mode,'auto');
// Auto is deliberately a cadence policy.  It must never silently magnify a
// user's visible sampling grid; only an explicit Draft choice changes the
// transient working divisor.  Threshold hysteresis itself is deterministic in
// tests/vnext-preview-quality.mjs, while this browser pass verifies that the
// integrated page keeps that policy and never serializes preview state.
assert.equal(auto.quality.effectiveMode,'full','Auto 必须保持 Full 画面，不得暗中改写采样分辨率');
assert.equal(auto.quality.pixelDivMultiplier,1,'Auto 只能降低重绘节奏；明确 Draft 才能降低工作分辨率');
assert.ok(auto.quality.targetFps<=12,'Auto 的目标节奏不得高于 Full');
assert.deepEqual(errors,[],'动态性能夹具不应产生页面异常或失败请求');

console.log(JSON.stringify({environment:{browser:'Microsoft Edge',viewport:'1600x1000',deviceScaleFactor:1},budgets:{draftP95Ms:draftP95Budgets},fixtures:results,cadence,auto:{quality:auto.quality,lastRender:auto.lastRender}},null,2));
await context.close();await browser.close();
