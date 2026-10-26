#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});await page.addScriptTag({path:resolve(root,'tests/browser/fixtures/v4-gpu-player-fixture.js')});
  const result=await page.evaluate(async url=>{
    const rt=window.ToSampoolRuntimeVNext,photo=await new Promise(done=>{const i=new Image();i.onload=()=>done(i);i.src=url;});
    const canvas=()=>{const c=document.createElement('canvas');c.width=333;c.height=187;return c;};
    const diff=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,333,187).data,y=b.getContext('2d').getImageData(0,0,333,187).data;let rgb=0,alpha=0,preMax=0,alphaMax=0;for(let i=0;i<x.length;i+=4){for(let k=0;k<3;k++){rgb+=Math.abs(x[i+k]-y[i+k]);preMax=Math.max(preMax,Math.abs(Math.round(x[i+k]*x[i+3]/255)-Math.round(y[i+k]*y[i+3]/255)));}const d=Math.abs(x[i+3]-y[i+3]);alpha+=d;alphaMax=Math.max(alphaMax,d);}return{rgb:rgb/(333*187*3),alpha:alpha/(333*187),preMax,alphaMax};};
    const fixture=(grid,blend,chain,transparent)=>{
      const cfg=window.createGpuPlayerFixture(photo,333,187,'single');cfg.background.alpha=transparent?0:1;cfg.sceneEffects.sample.controllers['sampling-grid'].size=grid;
      cfg.sceneEffects.overlay={'tint-overlay':{enabled:true,color:'#d4657980',alpha:.35,blend,mask:{type:'ellipse',x:20,y:15,w:280,h:150},motion:{enabled:true,type:'fade',period:2,amount:.5}}};
      if(!chain)delete cfg.sceneEffects.sample['uneven-sampling'];
      else{cfg.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3'};cfg.sceneEffects.sample['noise-dither']={enabled:true,amount:31,size:2,colorMode:'rgb',seed:7};cfg.sceneEffects.sample['edge-dispersion']={enabled:true,distance:2,angle:25,width:2,strength:.5,source:'auto',order:'rgb'};}
      return cfg;
    };
    const rows=[];
    for(const grid of [1,3])for(const blend of ['normal','screen','lighter'])for(const chain of [false,true])for(const transparent of [false,true]){
      const cfg=fixture(grid,blend,chain,transparent),p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),a=canvas(),b=canvas();
      for(const t of [.2,.7]){p.renderTo(a,t);const s=q.renderTo(b,t,{sceneBackend:'gpu-experimental'});rows.push({grid,blend,chain,transparent,t,...diff(a,b),backend:s.sceneBackend,reason:s.sceneGpu.reason,effects:s.sceneEffects,passes:s.frameGpuPasses});}p.dispose();q.dispose();
    }
    const fallback=[];
    for(const blend of ['multiply','overlay','soft-light','luminosity']){
      const cfg=fixture(3,blend,true,false),p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),a=canvas(),b=canvas();p.renderTo(a,.3);const s=q.renderTo(b,.3,{sceneBackend:'gpu-experimental'});fallback.push({blend,...diff(a,b),backend:s.sceneBackend,reason:s.sceneGpu.reason,allocations:s.sceneGpu.allocations});p.dispose();q.dispose();
    }
    const timedConfig=fixture(3,'normal',true,true);
    timedConfig.sceneEffects.overlay['tint-overlay'].motion.enabled=false;
    timedConfig.timeline={tracks:{'effect:scene:overlay:tint-overlay':{segments:[
      {f:[0,.25],values:{color:'#cc3300',alpha:.2,blend:'normal','motion.enabled':false}},
      {f:[.25,.75],type:'linear'},
      {f:[.75,1],values:{color:'#0033cc',alpha:.8,blend:'screen','motion.enabled':false}}
    ]}}};
    const timed=[],p=rt.createRuntime(timedConfig),q=rt.createRuntime(timedConfig),a=canvas(),b=canvas();
    for(const t of [1,3,5,7,1]){
      p.renderTo(a,t);const s=q.renderTo(b,t,{sceneBackend:'gpu-experimental'});
      const values=rt.modules.frame.create(q.scene,t,{}).effectValuesFor('scene','overlay','tint-overlay',q.scene.sceneEffects.overlay['tint-overlay']);
      timed.push({t,...diff(a,b),backend:s.sceneBackend,evaluated:{color:values.color,alpha:values.alpha,blend:values.blend,motionEnabled:values.motion.enabled}});
    }p.dispose();q.dispose();
    const colours=[];
    for(const color of ['#fff','#a4f','rgba(10, 200, 40, 0.2)','rebeccapurple']){
      const cfg=fixture(1,'screen',false,true);Object.assign(cfg.sceneEffects.overlay['tint-overlay'],{color,motion:{enabled:true,type:'blink',steps:4,period:2,amount:.7}});
      const p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),a=canvas(),b=canvas();for(const t of [.2,.7]){p.renderTo(a,t);const s=q.renderTo(b,t,{sceneBackend:'gpu-experimental'});colours.push({color,t,...diff(a,b),backend:s.sceneBackend});}p.dispose();q.dispose();
    }
    return{rows,fallback,timed,colours};
  },`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`);
  console.log(JSON.stringify({matrixCount:result.rows.length,matrixMaxRgb:Math.max(...result.rows.map(r=>r.rgb)),timed:result.timed,coloursMaxRgb:Math.max(...result.colours.map(r=>r.rgb)),fallback:result.fallback},null,2));
  for(const r of [...result.rows,...result.timed,...result.colours]){assert.equal(r.backend,'gpu',JSON.stringify(r));assert.ok(r.rgb<.6&&r.alpha<.1&&r.preMax<=3&&r.alphaMax<=1,JSON.stringify(r));}
  for(const r of result.fallback){assert.equal(r.backend,'cpu');assert.equal(r.reason,`unsupported-tint-blend:${r.blend}`);assert.equal(r.allocations,0);assert.equal(r.rgb,0);assert.equal(r.alpha,0);}
  assert.equal(result.timed[0].evaluated.alpha,.2);assert.equal(result.timed[3].evaluated.alpha,.8);
  assert.ok(result.timed[1].evaluated.alpha>.2&&result.timed[2].evaluated.alpha>result.timed[1].evaluated.alpha&&result.timed[2].evaluated.alpha<.8);
  assert.notEqual(result.timed[1].evaluated.color,result.timed[2].evaluated.color);assert.ok(result.timed.every(r=>!r.evaluated.motionEnabled));
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-player-tint-result.json'),JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
