#!/usr/bin/env node
// Real Player noise/threshold/uneven chain, including masks and GPU transition.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const photo=`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`;
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');
  await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
  await page.addScriptTag({path:resolve(root,'tests/browser/fixtures/v4-gpu-player-fixture.js')});
  const result=await page.evaluate(async url=>{
    const rt=window.ToSampoolRuntimeVNext,im=await new Promise((done,fail)=>{const i=new Image();i.onload=()=>done(i);i.onerror=fail;i.src=url;});
    const canvas=()=>{const c=document.createElement('canvas');c.width=333;c.height=187;return c;};
    const diff=(a,b)=>{
      const x=a.getContext('2d').getImageData(0,0,333,187).data;
      const y=b.getContext('2d').getImageData(0,0,333,187).data;
      let rgb=0,alpha=0,alphaMax=0,preMax=0,changed=0,highError=0;
      for(let i=0;i<x.length;i+=4){
        let different=false,pixelMax=0;
        for(let k=0;k<3;k++){
          rgb+=Math.abs(x[i+k]-y[i+k]);
          pixelMax=Math.max(pixelMax,Math.abs(Math.round(x[i+k]*x[i+3]/255)-Math.round(y[i+k]*y[i+3]/255)));
          different ||= x[i+k]!==y[i+k];
        }
        preMax=Math.max(preMax,pixelMax);highError+=pixelMax>3?1:0;changed+=different?1:0;
        const delta=Math.abs(x[i+3]-y[i+3]);alpha+=delta;alphaMax=Math.max(alphaMax,delta);
      }
      return{rgb:rgb/(333*187*3),alpha:alpha/(333*187),alphaMax,preMax,highError,changed};
    };
    const fixture=(grid,colorMode,size,chain,masked)=>{
      const cfg=window.createGpuPlayerFixture(im,333,187,'single');
      cfg.sceneEffects.sample.controllers['sampling-grid'].size=grid;
      if(!chain)delete cfg.sceneEffects.sample['uneven-sampling'];
      const mask=masked?{type:'ellipse',x:24,y:16,w:240,h:150}:undefined;
      if(chain)cfg.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',mask};
      // Deliberately last in JSON; runtime must apply noise FIRST.
      cfg.sceneEffects.sample['noise-dither']={enabled:true,amount:31,colorMode,size,seed:-7,motion:{enabled:true,type:'noise-refresh',period:2,steps:12},mask};
      if(masked&&chain)cfg.sceneEffects.sample['uneven-sampling'].mask={type:'rect',x:100,y:20,w:200,h:140};
      return cfg;
    };
    const rows=[];
    for(const grid of [1,3])for(const colorMode of ['mono','rgb'])for(const size of [1,4])for(const chain of [false,true])for(const transparent of [false,true]){
      const cfg=fixture(grid,colorMode,size,chain,chain),cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas(),previous=canvas();
      if(transparent){cpu.scene.background.alpha=0;gpu.scene.background.alpha=0;}
      for(const [index,t] of [.2,.7,.2].entries()){cpu.renderTo(a,t);const stats=gpu.renderTo(b,t,{sceneBackend:'gpu-experimental'});rows.push({grid,colorMode,size,chain,transparent,t,...diff(a,b),backend:stats.sceneBackend,reason:stats.sceneGpu?.reason,passes:stats.frameGpuPasses,uploads:stats.frameGpuUploads});if(index===0)previous.getContext('2d').drawImage(b,0,0);if(index===1)rows.at(-1).dynamic=diff(previous,b);if(index===2)rows.at(-1).seek=diff(previous,b);}
      cpu.dispose();gpu.dispose();
    }
    const cfg=fixture(3,'rgb',2,true,true);cfg.timeline={scenes:[{f:[0,.5],background:{color:'#405060',alpha:.2}},{f:[.5,1],background:{color:'#605040',alpha:.3},transition:{type:'fade',duration:2}}]};
    const cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas();cpu.renderTo(a,4.7);const s=gpu.renderTo(b,4.7,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true,sceneGpuValidation:'frame-end'});const transition={...diff(a,b),backend:s.transitionCompositeBackend,passes:s.frameGpuPasses,allocations:s.sceneGpu.allocations};gpu.renderTo(b,4.7,{sceneBackend:'gpu-experimental',sceneGpuTransitions:false});transition.canvasFinal=diff(a,b);cpu.dispose();gpu.dispose();
    const transparent=[];
    for(const chain of [false,true]){
      const config=fixture(3,'rgb',2,chain,true);config.background.alpha=0;
      const p=rt.createRuntime(config),q=rt.createRuntime(config),x=canvas(),y=canvas();p.renderTo(x,.7);const stats=q.renderTo(y,.7,{sceneBackend:'gpu-experimental'});transparent.push({chain,...diff(x,y),backend:stats.sceneBackend});p.dispose();q.dispose();
    }
    const maskRows=[],range=canvas(),rc=range.getContext('2d'),gradient=rc.createLinearGradient(0,0,333,187);gradient.addColorStop(0,'#0000');gradient.addColorStop(1,'#ffff');rc.fillStyle=gradient;rc.fillRect(0,0,333,187);
    for(const mask of [{type:'alpha',assetId:'range',x:0,y:0,w:333,h:187},{type:'alpha',assetId:'range',x:0,y:0,w:333,h:187,mode:'luma',invert:true},{type:'element',targetId:'range-object',invert:true}]){
      const config=fixture(3,'rgb',2,true,true);config.background.alpha=0;config.assets.range={image:range};config.entities.push({id:'range-object',type:'ellipse',x:50,y:30,w:210,h:110,fill:'#fff'});config.sceneEffects.sample['noise-dither'].mask=mask;
      const p=rt.createRuntime(config),q=rt.createRuntime(config),u=canvas(),v=canvas();p.renderTo(u,.7);const s=q.renderTo(v,.7,{sceneBackend:'gpu-experimental'});maskRows.push({type:mask.type,mode:mask.mode||'alpha',...diff(u,v),backend:s.sceneBackend});p.dispose();q.dispose();
    }
    const timing=fixture(3,'rgb',2,true,true);timing.timeline={tracks:{'effect:scene:sample:noise-dither':{segments:[{f:[0,.5],values:{amount:64,seed:28,size:4,colorMode:'mono','motion.enabled':false}},{f:[.5,1],values:{enabled:false}}]}}};
    const timed=[],tp=rt.createRuntime(timing),tq=rt.createRuntime(timing),x=canvas(),y=canvas();for(const t of [1,5,1]){tp.renderTo(x,t);const s=tq.renderTo(y,t,{sceneBackend:'gpu-experimental'});timed.push({t,...diff(x,y),backend:s.sceneBackend,passes:s.frameGpuPasses});}tp.dispose();tq.dispose();
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=original.call(this,type,...args);if(type==='webgl2'&&ctx){let draws=0;const draw=ctx.drawArrays.bind(ctx);ctx.drawArrays=(...params)=>{if(++draws===9)throw new Error('injected-third-card');return draw(...params);};}return ctx;};
    const fault=fixture(3,'rgb',2,true,true),fp=rt.createRuntime(fault),fq=rt.createRuntime(fault);fp.renderTo(x,.3);const fs=fq.renderTo(y,.3,{sceneBackend:'gpu-experimental'}),failure={...diff(x,y),backend:fs.sceneBackend,reason:fs.sceneGpu.reason};fp.dispose();fq.dispose();HTMLCanvasElement.prototype.getContext=original;
    const staticRows=[],flat=canvas(),ctx=flat.getContext('2d'),pixels=ctx.createImageData(333,187);
    for(let i=0;i<pixels.data.length;i+=4)pixels.data.set([(i/4)%256,128,200,255],i);ctx.putImageData(pixels,0,0);
    for(const amount of [0,.1,50,100])for(const colorMode of ['mono','rgb']){
      const config=fixture(1,colorMode,1,false,false);config.assets={flat:{image:flat}};config.entities=[{id:'flat',type:'image',assetId:'flat',x:0,y:0,w:333,h:187}];config.sceneEffects.sample['noise-dither'].amount=amount;
      const p=rt.createRuntime(config),q=rt.createRuntime(config),u=canvas(),v=canvas(),first=canvas();p.renderTo(u,.2);const firstStats=q.renderTo(v,.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});first.getContext('2d').drawImage(v,0,0);
      const row={amount,colorMode,...diff(u,v),backend:firstStats.sceneBackend};q.renderTo(v,2.2,{sceneBackend:'gpu-experimental'});row.period=diff(first,v);
      const paused=q.renderTo(v,2.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1}),cached=q.renderTo(v,2.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});row.cached=cached.sceneGpu.cacheHit;row.tableBuilds=paused.sceneGpu.noiseTableBuilds;
      staticRows.push(row);p.dispose();q.dispose();
    }
    return{rows,transition,transparent,maskRows,timed,failure,staticRows,strictTransparentParity:[...rows,...transparent,...maskRows,transition].every(r=>r.preMax<=3&&r.alphaMax<=1&&r.highError===0)};
  },photo);
  console.log(JSON.stringify({cases:result.rows.length,opaqueMaxRgb:Math.max(...result.rows.filter(r=>!r.transparent).map(r=>r.rgb)),matrixMaxPremultiplied:Math.max(...result.rows.map(r=>r.preMax)),transition:result.transition,transparent:result.transparent,timed:result.timed,failure:result.failure,staticRows:result.staticRows,strictTransparentParity:result.strictTransparentParity},null,2));
  for(const r of result.rows){assert.equal(r.backend,'gpu',JSON.stringify(r));assert.equal(r.passes,r.chain?11:2);assert.ok(r.rgb<.6&&r.alpha<.1&&r.preMax<=3,JSON.stringify(r));if(r.seek)assert.equal(r.seek.rgb,0);if(r.dynamic)assert.ok(r.dynamic.rgb>0);}
  assert.equal(result.transition.backend,'gpu');assert.equal(result.transition.passes,23);assert.ok(result.transition.rgb<.6&&result.transition.alpha<1&&result.transition.preMax<=3,JSON.stringify(result.transition));
  for(const r of [...result.transparent,...result.maskRows,...result.timed]){assert.equal(r.backend,'gpu');assert.ok(r.rgb<.6&&r.alpha<.1&&r.preMax<=3,JSON.stringify(r));}
  // No allowance for binary outliers, even when their mean error is tiny.
  for(const r of [...result.transparent,result.transition]){assert.ok(r.preMax<=3,JSON.stringify(r));assert.equal(r.highError,0);}
  for(const r of result.staticRows){assert.equal(r.backend,'gpu');assert.equal(r.rgb,0,JSON.stringify(r));assert.equal(r.alpha,0);assert.equal(r.period.rgb,0);assert.equal(r.cached,true);assert.equal(r.tableBuilds,1);}
  assert.equal(result.timed[0].passes,11);assert.equal(result.timed[1].passes,7);assert.equal(result.failure.backend,'cpu');assert.equal(result.failure.reason,'injected-third-card');assert.equal(result.failure.rgb,0);assert.equal(result.failure.alpha,0);
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-player-noise-result.json'),JSON.stringify(result,null,2)+'\n');
  assert.equal(result.strictTransparentParity,true,'Transparent threshold-chain strict parity failed');
}finally{await browser.close();}
