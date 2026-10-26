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
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?crt-display=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,crt=runtime.modules.crtScreen;
    const make=(backend,config={},time=0)=>{crt.setBackend(backend);const scene={format:'tosampool-scene/v4',width:96,height:64,loop:2,background:{color:'#24364c',alpha:1},entities:[{id:'target',type:'rect',x:18,y:12,w:58,h:40,fill:'#f6ba54'}],sceneEffects:{sample:{'crt-display':Object.assign({enabled:true},config)}}},canvas=document.createElement('canvas'),start=performance.now();runtime.createRuntime(scene).renderTo(canvas,time);const duration=performance.now()-start,output=Array.from(canvas.getContext('2d').getImageData(0,0,96,64).data);return {output,duration,backend:crt.getLastBackend()};};
    const sample=(image,x,y)=>image.slice((y*96+x)*4,(y*96+x)*4+4);
    const plainScene={format:'tosampool-scene/v4',width:96,height:64,loop:2,background:{color:'#24364c',alpha:1},entities:[{id:'target',type:'rect',x:18,y:12,w:58,h:40,fill:'#f6ba54'}]},canvas=document.createElement('canvas');runtime.createRuntime(plainScene).renderTo(canvas,0);const plain=Array.from(canvas.getContext('2d').getImageData(0,0,96,64).data);
    const animated=Object.assign({},crt.presets.default,{motion:{enabled:true,type:'crt-motion',period:2,steps:12,scanlineDrift:1}}),cpu=make('cpu',animated),later=make('cpu',animated,.5),repeat=make('cpu',animated),still=make('cpu',crt.presets.default,.5),stillAtZero=make('cpu',crt.presets.default),mono=make('cpu',crt.presets['monochrome-green']);
    const themeSignatures=Object.values(crt.presets).map(preset=>{const output=make('cpu',preset).output;let signature=0;for(let i=0;i<output.length;i+=17)signature=(Math.imul(signature,31)+output[i])|0;return signature;});
    let gpu=null,gpuError='';try{gpu=make('gpu',crt.presets.default);}catch(error){gpuError=String(error&&error.message||error);}crt.setBackend('auto');
    const bench=backend=>{crt.setBackend(backend);const scene={format:'tosampool-scene/v4',width:640,height:360,loop:2,background:{color:'#24364c',alpha:1},entities:[{id:'target',type:'rect',x:50,y:40,w:520,h:280,fill:'#f6ba54'}],sceneEffects:{sample:{'crt-display':Object.assign({enabled:true},crt.presets.default)}}},player=runtime.createRuntime(scene),surface=document.createElement('canvas'),durations=[];for(let i=0;i<20;i++){const start=performance.now();player.renderTo(surface,i/12);if(i>=4)durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);return {median:(durations[7]+durations[8])/2,p95:durations[14],backend:crt.getLastBackend()};};
    const cpuBench=bench('cpu'),gpuBench=gpuError?null:bench('gpu');crt.setBackend('auto');
    return {registryScopes:EditorEffectRegistryVNext.effectById['crt-display'].scopes,themeNames:Object.keys(crt.presets),themeSignatures,changed:JSON.stringify(cpu.output)!==JSON.stringify(plain),cpuStable:JSON.stringify(cpu.output)===JSON.stringify(repeat.output),timeChanges:JSON.stringify(cpu.output)!==JSON.stringify(later.output),staticStable:JSON.stringify(still.output)===JSON.stringify(stillAtZero.output),mono:sample(mono.output,48,32),color:sample(cpu.output,48,32),center:sample(cpu.output,48,32),corner:sample(cpu.output,1,1),gpuCenter:gpu&&sample(gpu.output,48,32),cpuDuration:cpu.duration,gpuDuration:gpu&&gpu.duration,gpuBackend:gpu&&gpu.backend,gpuError,cpuBench,gpuBench};
  });
  assert.deepEqual(result.registryScopes,['scene'],'CRT 只能在场景采样页启用');
  assert.equal(result.themeNames.length,7,'保留七种可调整主题预设');
  assert.equal(new Set(result.themeSignatures).size,7,'七种主题须得到各不相同的画面');
  assert.ok(result.changed&&result.cpuStable&&result.timeChanges&&result.staticStable,'CPU 回退须有效，动态开启时响应时间、关闭时保持静止');
  assert.ok(result.mono[1]>result.mono[0]&&result.mono[1]>result.mono[2],'绿屏主题须转为绿色荧光');
  assert.ok(result.corner[3]<result.center[3]||result.corner[0]<result.center[0],'曲面与暗角须改变画面边缘');
  if(!result.gpuError){assert.equal(result.gpuBackend,'gpu');assert.ok(result.gpuCenter[3]>0&&result.gpuCenter[0]>0,'GPU 路径须输出非空画面');}
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:96,height:64,loop:2});classicV4View.select(null);});
  await page.click('#global-inspector-tabs [data-global-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="crt-display"]');
  assert.equal(await card.count(),1,'场景采样页须有 CRT 效果卡');
  await card.locator('.global-field').filter({hasText:'启用'}).locator('input[type="checkbox"]').check();
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['crt-display']?.enabled===true);
  await card.locator('.global-field').filter({hasText:'CRT 主题'}).locator('select').selectOption('monochrome-green');
  const saved=await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.sample['crt-display']);
  assert.equal(saved.theme,'monochrome-green');assert.equal(saved.colorMode,'mono','切换主题应写入可编辑参数，不只是更改主题名');
  assert.equal(saved.rgbShift,0,'主题应同步更新相关参数');
  assert.equal(await page.evaluate(()=>EditorVNextPreviewScheduler.profile(ToSampoolV4Workspace.current(),.5).continuous),false,'静态 CRT 不应持续重绘');
  await card.locator('.v4-motion-head input[type="checkbox"]').check();
  assert.equal(await page.evaluate(()=>EditorVNextPreviewScheduler.profile(ToSampoolV4Workspace.current(),.5).continuous),true,'动态 CRT 应使静止场景持续重绘');
  assert.ok(await card.locator('.global-field').filter({hasText:'周期时间'}).count()>0,'启用动态后须展开实际参数');
  assert.equal(await card.locator('.global-field').filter({hasText:'动态方式'}).count(),0,'只有一种动态方式时不显示冗余下拉框');
  assert.deepEqual(errors,[]);
  console.log(`✓ 场景 CRT：七预设、CPU/GPU、确定时间、Inspector 通过（640×360 连续帧 CPU P95 ${result.cpuBench.p95.toFixed(1)}ms；GPU P95 ${result.gpuBench?result.gpuBench.p95.toFixed(1)+'ms':result.gpuError}）`);
}finally{await browser.close();}
