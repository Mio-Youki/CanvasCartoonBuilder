#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');
  await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
  await page.addScriptTag({path:resolve(root,'tests/browser/fixtures/v4-gpu-player-fixture.js')});
  const result=await page.evaluate(async url=>{
    const rt=window.ToSampoolRuntimeVNext,photo=await new Promise(done=>{const i=new Image();i.onload=()=>done(i);i.src=url;});
    const canvas=(w=333,h=187)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const diff=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let rgb=0,alpha=0,preMax=0,alphaMax=0;for(let i=0;i<x.length;i+=4){for(let k=0;k<3;k++){rgb+=Math.abs(x[i+k]-y[i+k]);preMax=Math.max(preMax,Math.abs(Math.round(x[i+k]*x[i+3]/255)-Math.round(y[i+k]*y[i+3]/255)));}const da=Math.abs(x[i+3]-y[i+3]);alpha+=da;alphaMax=Math.max(alphaMax,da);}return{rgb:rgb/(a.width*a.height*3),alpha:alpha/(a.width*a.height),preMax,alphaMax};};
    const config=(grid,source,chain,transparent)=>{
      const c=window.createGpuPlayerFixture(photo,333,187,'single');c.background.alpha=transparent?0:1;c.sceneEffects.sample.controllers['sampling-grid'].size=grid;
      if(!chain)delete c.sceneEffects.sample['uneven-sampling'];
      c.sceneEffects.sample['edge-dispersion']={enabled:true,distance:2,angle:35,width:2,strength:.5,source,order:'bgr',mask:{type:'ellipse',x:20,y:10,w:280,h:160}};
      if(chain){c.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',mask:{type:'rect',x:30,y:25,w:270,h:130}};c.sceneEffects.sample['noise-dither']={enabled:true,amount:31,size:2,colorMode:'rgb',seed:7,motion:{enabled:true,type:'noise-refresh',period:2,steps:12}};}
      return c;
    };
    const rows=[];
    for(const grid of [1,3])for(const source of ['auto','contour','contrast'])for(const chain of [false,true])for(const transparent of [false,true]){
      const cfg=config(grid,source,chain,transparent),cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas();cpu.renderTo(a,.7);const stats=gpu.renderTo(b,.7,{sceneBackend:'gpu-experimental'});rows.push({grid,source,chain,transparent,...diff(a,b),backend:stats.sceneBackend,reason:stats.sceneGpu.reason,passes:stats.frameGpuPasses});cpu.dispose();gpu.dispose();
    }
    // All grey pairs separated by EXACTLY 24: JS-double sums/subtraction can
    // lie on either side of the strict edge predicate, unlike integer luma.
    const strip=canvas(464,1),ctx=strip.getContext('2d'),pixels=ctx.createImageData(464,1);
    for(let c=0;c<232;c++){pixels.data.set([c,c,c,255],c*8);pixels.data.set([c+24,c+24,c+24,255],c*8+4);}ctx.putImageData(pixels,0,0);
    const boundaries=[];
    for(const strength of [0,.3,.5,1])for(const order of ['rgb','bgr']){
      const cfg={format:'tosampool-scene/v4',width:464,height:1,loop:2,background:{alpha:0},assets:{strip:{image:strip}},entities:[{id:'strip',type:'image',assetId:'strip',x:0,y:0,w:464,h:1}],sceneEffects:{sample:{'edge-dispersion':{enabled:true,distance:1,angle:0,width:1,strength,source:'contrast',order}}}};
      const p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),a=canvas(464,1),b=canvas(464,1);p.renderTo(a,.2);const stats=q.renderTo(b,.2,{sceneBackend:'gpu-experimental'});boundaries.push({strength,order,...diff(a,b),backend:stats.sceneBackend,reason:stats.sceneGpu.reason});p.dispose();q.dispose();
    }
    const cfg=config(3,'auto',true,true);cfg.timeline={tracks:{'effect:scene:sample:edge-dispersion':{segments:[{f:[0,.5],values:{distance:4,angle:-90,strength:1,order:'rgb',source:'contour'}},{f:[.5,1],values:{enabled:false}}]}}};
    const timed=[],cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas();for(const t of [1,5,1]){cpu.renderTo(a,t);const stats=gpu.renderTo(b,t,{sceneBackend:'gpu-experimental'});timed.push({t,...diff(a,b),backend:stats.sceneBackend,effects:stats.sceneEffects});}cpu.dispose();gpu.dispose();
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(type==='webgl2'&&gl){let draws=0;const draw=gl.drawArrays.bind(gl);gl.drawArrays=(...values)=>{if(++draws===11)throw new Error('injected-dispersion');return draw(...values);};}return gl;};
    const failedCfg=config(3,'auto',true,true),p=rt.createRuntime(failedCfg),q=rt.createRuntime(failedCfg);p.renderTo(a,.7);const fs=q.renderTo(b,.7,{sceneBackend:'gpu-experimental'}),failure={...diff(a,b),backend:fs.sceneBackend,reason:fs.sceneGpu.reason};p.dispose();q.dispose();HTMLCanvasElement.prototype.getContext=original;
    return{rows,boundaries,timed,failure};
  },`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`);
  console.log(JSON.stringify(result,null,2));
  for(const r of [...result.rows,...result.boundaries,...result.timed]){assert.equal(r.backend,'gpu',JSON.stringify(r));assert.ok(r.rgb<.6&&r.alpha<.1&&r.preMax<=3&&r.alphaMax<=1,JSON.stringify(r));}
  assert.ok(result.boundaries.every(r=>r.rgb===0&&r.alpha===0),'Exact contrast boundary or strength rounding differs');
  assert.deepEqual(result.timed.map(r=>r.effects),[4,3,4]);
  assert.equal(result.failure.backend,'cpu');assert.equal(result.failure.reason,'injected-dispersion');assert.equal(result.failure.rgb,0);assert.equal(result.failure.alpha,0);
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-player-dispersion-result.json'),JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
