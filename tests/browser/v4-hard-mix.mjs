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
  const samples=await page.evaluate(()=>{
    const make=(rgba)=>{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=rgba;ctx.fillRect(0,0,1,1);return canvas;};
    const read=canvas=>Array.from(canvas.getContext('2d').getImageData(0,0,1,1).data);
    const surfaces=ToSampoolRuntimeVNext.modules.surfaces.create();
    const base=make('rgba(100,100,100,1)'),top=make('rgba(150,155,200,1)'),half=make('rgba(150,155,200,0.5)'),empty=make('rgba(0,0,0,0)');
    const opaque=ToSampoolRuntimeVNext.modules.hardMix.composite(base,top,surfaces),partial=ToSampoolRuntimeVNext.modules.hardMix.composite(base,half,surfaces),transparent=ToSampoolRuntimeVNext.modules.hardMix.composite(empty,top,surfaces);
    const pixels={opaque:read(opaque),partial:read(partial),transparent:read(transparent)};
    [opaque,partial,transparent].forEach(surface=>surfaces.release(surface));
    const render=blend=>{const canvas=document.createElement('canvas'),scene={format:'tosampool-scene/v4',width:8,height:4,background:{color:'#000000',alpha:0},entities:[{id:'hard-mix-object',type:'rect',x:0,y:0,w:8,h:4,fill:'#646464',effects:{decorate:{'texture-overlay':{enabled:true,texture:'custom',tileWidth:2,tileHeight:1,tileScale:1,tileScaleMode:'pixel',tilePixels:['#969696ff','#a0a0a0ff'],alpha:1,blend}}}}]};ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,2,1).data);};
    return{...pixels,runtime:render('hard-mix'),native:render('screen'),textureModes:EditorEffectRegistryVNext.effectById['texture-overlay'].params.find(param=>param.key==='blend').options,objectModes:EditorEffectRegistryVNext.blendOptions};
  });
  assert.deepEqual(samples.opaque,[0,255,255,255],'Adobe Hard Mix: 100+150<255、100+155=255');
  assert.ok(samples.partial[0]>45&&samples.partial[0]<55&&samples.partial[1]>175&&samples.partial[1]<180,'半透明混合应保留底色与二值混合色的插值');
  assert.deepEqual(samples.transparent,[150,155,200,255],'透明底色不得凭空二值化来源');
  assert.ok(samples.runtime[0]===0&&samples.runtime[4]===255,'自定义 tile 应按相邻格产生黑/白 Hard Mix');
  assert.ok(samples.native[0]!==samples.runtime[0]||samples.native[4]!==samples.runtime[4],'Hard Mix 不得静默回退为原生 screen');
  assert.ok(samples.textureModes.includes('hard-mix')&&!samples.objectModes.includes('hard-mix'),'首切片只在纹理叠加暴露，避免对象混合入口失效');
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:16,height:16});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'hard-mix-ui',type:'rect',x:0,y:0,w:16,h:16,fill:'#646464',effects:{decorate:{'texture-overlay':{enabled:true,texture:'custom',tileWidth:1,tileHeight:1,tilePixels:['#a0a0a0ff'],alpha:1,blend:'hard-mix'}}}}));classicV4View.select('hard-mix-ui');});
  await page.click('#element-inspector-tabs [data-element-inspector="fx"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="texture-overlay"]');
  assert.equal(await card.locator('select option[value="hard-mix"]').count(),1);
  const mode=card.locator('.global-field').filter({hasText:'叠加方式'}).locator('select');
  await mode.selectOption('screen');
  await card.locator('.global-field').filter({hasText:'叠加方式'}).locator('select').selectOption('hard-mix');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0]?.effects?.decorate?.['texture-overlay']?.blend==='hard-mix');
  assert.match(await card.textContent(),/大画布连续播放建议使用 Draft/,'Hard Mix 应显示性能警示');
  assert.deepEqual(errors,[]);
  console.log('✓ V4 Hard Mix：公式、Alpha、自定义 tile、Runtime 与 Inspector 入口通过');
  if(process.argv.includes('--benchmark')){
    const perf=await page.evaluate(()=>{
      const blend=ToSampoolRuntimeVNext.modules.hardMix;
      const quantile=(sorted,p)=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
      const run=(width,height,mode)=>{
        const make=color=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,width,height);return canvas;};
        const base=make('#646464'),layer=make('#a0a0a0'),surfaces=ToSampoolRuntimeVNext.modules.surfaces.create(),draw=()=>{
          if(mode==='hard-mix')return blend.composite(base,layer,surfaces);
          const output=surfaces.acquire(width,height),ctx=output.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(base,0,0);ctx.globalCompositeOperation='screen';ctx.drawImage(layer,0,0);ctx.globalCompositeOperation='source-over';return output;
        };
        for(let i=0;i<3;i++)surfaces.release(draw());
        const samples=[];for(let i=0;i<12;i++){const start=performance.now(),output=draw();output.getContext('2d').getImageData(0,0,width,height);samples.push(performance.now()-start);surfaces.release(output);}
        samples.sort((a,b)=>a-b);return{p50:quantile(samples,.5),p95:quantile(samples,.95),min:samples[0],max:samples.at(-1),pixels:width*height};
      };
      return[ [640,360],[1280,720],[1920,1080] ].map(([width,height])=>({size:`${width}x${height}`,screen:run(width,height,'screen'),hardMix:run(width,height,'hard-mix')}));
    });
    console.log(JSON.stringify({browser:'Microsoft Edge headless',comparison:'Canvas screen vs CPU Hard Mix; each sample forces full-frame readback; 3 warmups + 12 samples per size',results:perf},null,2));
  }
}finally{await browser.close();}
