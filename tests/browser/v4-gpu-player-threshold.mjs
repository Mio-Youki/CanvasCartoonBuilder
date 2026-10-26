#!/usr/bin/env node
// Real Player threshold/grid/uneven chain, not a standalone shader benchmark.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => p && existsSync(p));
if (!edge) throw new Error('Edge not found');
const data = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage(); await page.goto('about:blank');
  await page.addScriptTag({ path: resolve(root, 'home-scene-vnext.js') });
  await page.addScriptTag({ path: resolve(root, 'tests/browser/fixtures/v4-gpu-player-fixture.js') });
  const result = await page.evaluate(async data => {
    const rt = window.ToSampoolRuntimeVNext;
    const photo = await new Promise((done, fail) => { const im = new Image(); im.onload = () => done(im); im.onerror = fail; im.src = data; });
    const canvas = (w=333,h=187) => { const c = document.createElement('canvas'); c.width=w;c.height=h;return c; };
    const diff = (a,b) => {
      const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
      let rgb=0,alpha=0,preMax=0,alphaMax=0;
      for(let i=0;i<x.length;i+=4){for(let k=0;k<3;k++){rgb+=Math.abs(x[i+k]-y[i+k]);preMax=Math.max(preMax,Math.abs(Math.round(x[i+k]*x[i+3]/255)-Math.round(y[i+k]*y[i+3]/255)));}const delta=Math.abs(x[i+3]-y[i+3]);alpha+=delta;alphaMax=Math.max(alphaMax,delta);}
      return {rgb:+(rgb/(a.width*a.height*3)).toFixed(4),alpha:+(alpha/(a.width*a.height)).toFixed(4),alphaMax,preMax};
    };
    const fixture=(grid,chain,mask,transparent=false)=>{
      const cfg=window.createGpuPlayerFixture(photo,333,187,'single');cfg.background.alpha=transparent?0:1;
      cfg.sceneEffects.sample.controllers['sampling-grid'].size=grid;
      if(!chain)delete cfg.sceneEffects.sample['uneven-sampling'];
      cfg.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.12,period:2},...(mask?{mask}:{})};
      // Deliberately inserted AFTER uneven; execution must still be threshold first.
      return cfg;
    };
    const rows=[];
    const alpha=canvas();const ac=alpha.getContext('2d');const grad=ac.createLinearGradient(0,0,333,187);grad.addColorStop(0,'#0000');grad.addColorStop(1,'#ffff');ac.fillStyle=grad;ac.fillRect(0,0,333,187);
    for(const grid of [1,3,4])for(const chain of [false,true])for(const transparent of [false,true]){
      const mask=transparent?{type:'ellipse',x:35,y:20,w:210,h:130}:null,cfg=fixture(grid,chain,mask,transparent);
      if(chain)cfg.sceneEffects.sample['uneven-sampling'].mask={type:'rect',x:110,y:40,w:200,h:130,invert:transparent};
      const cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas();
      for(const t of [.2,.7]){cpu.renderTo(a,t);const stats=gpu.renderTo(b,t,{sceneBackend:'gpu-experimental'});rows.push({grid,chain,transparent,t,...diff(a,b),backend:stats.sceneBackend,effects:stats.sceneEffects,passes:stats.frameGpuPasses,uploads:stats.frameGpuUploads,allocations:stats.sceneGpu?.allocations});}
      cpu.dispose();gpu.dispose();
    }
    const maskRows=[];
    for(const mask of [{type:'alpha',assetId:'alpha',x:0,y:0,w:333,h:187},{type:'alpha',assetId:'alpha',x:0,y:0,w:333,h:187,mode:'luma',invert:true},{type:'element',targetId:'range',invert:true}]){
      const cfg=fixture(3,true,mask,true);cfg.assets.alpha={image:alpha};cfg.entities.push({id:'range',type:'ellipse',x:50,y:30,w:210,h:110,fill:'#fff',anim:{bob:{amount:9,period:2,angle:0}}});
      const cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(),b=canvas();cpu.renderTo(a,.4);const stats=gpu.renderTo(b,.4,{sceneBackend:'gpu-experimental'});maskRows.push({type:mask.type,mode:mask.mode||'alpha',...diff(a,b),backend:stats.sceneBackend});cpu.dispose();gpu.dispose();
    }
    const timedCfg=fixture(2,true,null);timedCfg.timeline={tracks:{'effect:scene:sample:threshold':{segments:[{f:[0,.5],values:{threshold:.25,dark:'#301',light:'#fd9','motion.enabled':false}},{f:[.5,1],values:{enabled:false}}]},'controller:scene:sample:sampling-grid':{segments:[{f:[0,.5],values:{size:2}},{f:[.5,1],values:{size:4}}]}}};
    const timed=[],cpu=rt.createRuntime(timedCfg),gpu=rt.createRuntime(timedCfg),a=canvas(),b=canvas();
    for(const t of [1,5,1]){cpu.renderTo(a,t);const stats=gpu.renderTo(b,t,{sceneBackend:'gpu-experimental'});timed.push({t,...diff(a,b),backend:stats.sceneBackend,effects:stats.sceneEffects,passes:stats.frameGpuPasses});}cpu.dispose();gpu.dispose();
    const transitionCfg=fixture(3,true,{type:'ellipse',x:35,y:20,w:210,h:130});transitionCfg.timeline={scenes:[{f:[0,.5],background:{color:'#405060',alpha:.2}},{f:[.5,1],background:{color:'#605040',alpha:.3},transition:{type:'fade',duration:2}}]};
    const transitions=[],tcpu=rt.createRuntime(transitionCfg),tgpu=rt.createRuntime(transitionCfg);
    for(const t of [4.2,4.7,5.3]){tcpu.renderTo(a,t);const s=tgpu.renderTo(b,t,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true,sceneGpuValidation:'frame-end'});const row={...diff(a,b),backend:s.transitionCompositeBackend,allocations:s.sceneGpu.allocations,passes:s.frameGpuPasses};tgpu.renderTo(b,t,{sceneBackend:'gpu-experimental',sceneGpuTransitions:false});row.canvasComposite=diff(a,b);transitions.push(row);}tcpu.dispose();tgpu.dispose();
    // Full-chain fallback must remain BEFORE GPU allocation.
    const unsupported=fixture(3,true,null);unsupported.sceneEffects.overlay={'tint-overlay':{enabled:true,color:'#f00',alpha:.2,blend:'multiply'}};
    const fallbackPlayer=rt.createRuntime(unsupported),fallbackCpu=rt.createRuntime(unsupported);fallbackCpu.renderTo(a,.3);const s=fallbackPlayer.renderTo(b,.3,{sceneBackend:'gpu-experimental'});const fallback={...diff(a,b),backend:s.sceneBackend,reason:s.sceneGpu.reason,allocations:s.sceneGpu.allocations};fallbackPlayer.dispose();fallbackCpu.dispose();
    const boundaryRows=[],strip=canvas(256,1),pixels=strip.getContext('2d').createImageData(256,1);
    for(let i=0;i<256;i++){pixels.data.set([i,i,i,255],i*4);}strip.getContext('2d').putImageData(pixels,0,0);
    for(const pivot of [0,.2,.25,.4,.5,.75,.8,1]){
      const cfg={format:'tosampool-scene/v4',width:256,height:1,loop:2,background:{alpha:0},assets:{strip:{image:strip}},entities:[{id:'strip',type:'image',assetId:'strip',x:0,y:0,w:256,h:1}],sceneEffects:{sample:{threshold:{enabled:true,threshold:pivot,dark:'#000',light:'#fff'}}}};
      const p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),x=canvas(256,1),y=canvas(256,1);p.renderTo(x,.2);q.renderTo(y,.2,{sceneBackend:'gpu-experimental'});boundaryRows.push({pivot,...diff(x,y)});p.dispose();q.dispose();
    }
    const colourBoundaryRows=[];
    for(const pivot of [.2,.25,.4,.5,.8,1]){
      // Independently brute-force exact decimal-luma ties; the Runtime uses a
      // different modular enumeration, so this catches mistakes in that table.
      const colours=[],target=Math.round(pivot*255*10000);
      for(let r=0;r<256;r++)for(let g=0;g<256;g++){const b=(target-r*2126-g*7152)/722;if(b>=0&&b<256&&Number.isInteger(b))colours.push([r,g,b,255]);}
      const input=canvas(colours.length,1),ctx=input.getContext('2d'),pixels=ctx.createImageData(colours.length,1);colours.forEach((c,i)=>pixels.data.set(c,i*4));ctx.putImageData(pixels,0,0);
      const cfg={format:'tosampool-scene/v4',width:colours.length,height:1,loop:2,background:{alpha:0},assets:{strip:{image:input}},entities:[{id:'strip',type:'image',assetId:'strip',x:0,y:0,w:colours.length,h:1}],sceneEffects:{sample:{threshold:{enabled:true,threshold:pivot,dark:'#000',light:'#fff'}}}};
      const p=rt.createRuntime(cfg),q=rt.createRuntime(cfg),x=canvas(colours.length,1),y=canvas(colours.length,1);p.renderTo(x,.2);q.renderTo(y,.2,{sceneBackend:'gpu-experimental'});colourBoundaryRows.push({pivot,colours:colours.length,...diff(x,y)});p.dispose();q.dispose();
    }
    const cacheConfig=fixture(3,true,null),cached=rt.createRuntime(cacheConfig),first=canvas(),out=canvas();
    const cacheOptions={sceneBackend:'gpu-experimental',sceneSourceVersion:1};cached.renderTo(first,.3,cacheOptions);const paused=cached.renderTo(out,.3,cacheOptions);
    const oldDark=cached.scene.sceneEffects.sample.threshold.dark;cached.scene.sceneEffects.sample.threshold.dark='#ff0000';const edited=cached.renderTo(out,.3,cacheOptions),editDiff=diff(first,out);
    cached.scene.sceneEffects.sample.threshold.dark=oldDark;const undone=cached.renderTo(out,.3,cacheOptions),undoDiff=diff(first,out);
    const cache={paused:paused.sceneGpu.cacheHit,edited:edited.sceneGpu.cacheHit,undone:undone.sceneGpu.cacheHit,editDiff,undoDiff};cached.dispose();
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=original.call(this,type,...args);if(type==='webgl2'&&ctx){let draws=0;const draw=ctx.drawArrays.bind(ctx);ctx.drawArrays=(...params)=>{if(++draws===4)throw new Error('injected-second-card');return draw(...params);};}return ctx;};
    const faulty=rt.createRuntime(cacheConfig),faultCpu=rt.createRuntime(cacheConfig),expected=canvas();faultCpu.renderTo(expected,.3);const faultStats=faulty.renderTo(out,.3,{sceneBackend:'gpu-experimental'});const failure={...diff(expected,out),backend:faultStats.sceneBackend,reason:faultStats.sceneGpu.reason};faulty.dispose();faultCpu.dispose();HTMLCanvasElement.prototype.getContext=original;
    return {rows,maskRows,timed,transitions,fallback,boundaryRows,colourBoundaryRows,cache,failure};
  },data);
  console.log(JSON.stringify(result,null,2));
  for(const r of [...result.rows,...result.maskRows,...result.timed])assert.ok(r.rgb<.6&&r.alpha<.1&&r.preMax<=3,JSON.stringify(r));
  // Isolated Canvas-final-composite comparison must keep exact Alpha. GPU
  // final composite removes intermediate rounding; bound that separately.
  for(const r of result.transitions){assert.ok(r.rgb<.6&&r.alphaMax<=1&&r.preMax<=3,JSON.stringify(r));assert.ok(r.canvasComposite.alpha===0&&r.canvasComposite.preMax<=3);}
  assert.ok(result.rows.every(r=>r.backend==='gpu'&&r.effects===(r.chain?2:1)&&r.passes===(r.chain?6:2)+(r.transparent?1:0)));
  assert.ok(result.timed.every(r=>r.backend==='gpu'));assert.equal(result.timed[0].effects,2);assert.equal(result.timed[1].effects,1);
  assert.ok(result.maskRows.every(r=>r.backend==='gpu'));
  assert.ok(result.transitions.every(r=>r.backend==='gpu'&&r.allocations===8&&r.passes===13));
  assert.equal(result.fallback.backend,'cpu');assert.equal(result.fallback.allocations,0);assert.equal(result.fallback.reason,'unsupported-tint-blend:multiply');
  assert.ok(result.boundaryRows.every(r=>r.rgb===0&&r.alpha===0),'8-bit grayscale threshold boundary mismatch');
  assert.ok(result.colourBoundaryRows.every(r=>r.rgb===0&&r.alpha===0),'exact colour-luma tie mismatch');
  assert.equal(result.cache.paused,true);assert.equal(result.cache.edited,false);assert.equal(result.cache.undone,false);assert.ok(result.cache.editDiff.rgb>1);assert.equal(result.cache.undoDiff.rgb,0);
  assert.equal(result.failure.backend,'cpu');assert.equal(result.failure.reason,'injected-second-card');assert.equal(result.failure.rgb,0);assert.equal(result.failure.alpha,0);
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-player-threshold-result.json'),JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
