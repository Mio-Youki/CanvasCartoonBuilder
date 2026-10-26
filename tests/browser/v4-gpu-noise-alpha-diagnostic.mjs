#!/usr/bin/env node
// Isolate byte changes BEFORE a binary threshold; not a performance test.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');
  // Diagnostic copy only: permit wrapping module calls without editing the
  // production bundle or disabling any render logic.
  await page.addScriptTag({content:readFileSync(resolve(root,'home-scene-vnext.js'),'utf8').replace('Object.freeze(api.modules);','').replace('Object.freeze(api);','')});
  await page.addScriptTag({path:resolve(root,'tests/browser/fixtures/v4-gpu-player-fixture.js')});
  const result=await page.evaluate(async url=>{
    const api=window.ToSampoolRuntimeVNext,photo=await new Promise(done=>{const i=new Image();i.onload=()=>done(i);i.src=url;}),w=333,h=187;
    const canvas=(width=w,height=h)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
    const copy=c=>{const o=canvas(c.width,c.height);o.getContext('2d').drawImage(c,0,0);return o;};
    const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const down=c=>copy(c);
    const premul=data=>{const bytes=new Uint8Array(data.length);for(let i=0;i<data.length;i+=4){for(let k=0;k<3;k++)bytes[i+k]=Math.floor((data[i+k]*data[i+3]+127)/255);bytes[i+3]=data[i+3];}return bytes;};
    const compare=(cpu,gpu,width)=>{let count=0,max=0;const examples=[];for(let i=0;i<cpu.length;i+=4){let delta=0;for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(cpu[i+k]-gpu[i+k]));max=Math.max(max,delta);if(delta){count++;if(examples.length<8)examples.push({x:i/4%width,y:Math.floor(i/4/width),cpu:[...cpu.slice(i,i+4)],gpu:[...gpu.slice(i,i+4)]});}}return{count,max,examples};};
    const atlas=canvas(256,256),atlasCtx=atlas.getContext('2d'),atlasImage=atlasCtx.createImageData(256,256);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++)atlasImage.data.set([c,c,c,a],(a*256+c)*4);atlasCtx.putImageData(atlasImage,0,0);
    const unpremul=pixels(atlas),alphaMath={premul:0,unpremul:0,examples:[]};
    const gl=canvas(256,256).getContext('webgl2',{premultipliedAlpha:false}),tex=gl.createTexture(),fb=gl.createFramebuffer(),raw=new Uint8Array(256*256*4);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,raw);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++){const at=(a*256+c)*4,p=Math.floor((c*a+127)/255),u=a?Math.floor(p*255/a+.5):0;if(raw[at]!==p)alphaMath.premul++;if(unpremul[at]!==u){alphaMath.unpremul++;if(alphaMath.examples.length<6)alphaMath.examples.push({c,a,p,u,actual:unpremul[at]});}}
    gl.deleteTexture(tex);gl.deleteFramebuffer(fb);gl.getExtension('WEBGL_lose_context')?.loseContext();
    const config=window.createGpuPlayerFixture(photo,w,h,'single');config.background.alpha=0;
    config.sceneEffects.sample.controllers['sampling-grid'].size=1;config.sceneEffects.sample['uneven-sampling'].mask={type:'rect',x:100,y:20,w:200,h:140};
    config.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',mask:{type:'ellipse',x:24,y:16,w:240,h:150}};
    config.sceneEffects.sample['noise-dither']={enabled:true,amount:31,colorMode:'mono',size:1,seed:-7,motion:{enabled:true,type:'noise-refresh',period:2,steps:12},mask:{type:'ellipse',x:24,y:16,w:240,h:150}};
    const originalSampling=api.modules.sampling,originalMasks=api.modules.masks,cpuStages=[],cpuMasks=[];
    api.modules.masks={...originalMasks,apply(surface,...args){const ok=originalMasks.apply(surface,...args);cpuMasks.push(copy(surface));return ok;}};
    api.modules.sampling={...originalSampling,apply(source,...args){const input=copy(source),result=originalSampling.apply(source,...args);cpuStages.push({input,result:copy(result)});return result;}};
    const cpu=api.createRuntime(config);cpu.renderTo(canvas(),.2);cpu.dispose();api.modules.sampling=originalSampling;api.modules.masks=originalMasks;
    const originalContext=HTMLCanvasElement.prototype.getContext,gpuStages=[];
    HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=originalContext.call(this,type,...args);if(type==='webgl2'&&ctx){const draw=ctx.drawArrays.bind(ctx);ctx.drawArrays=(...values)=>{draw(...values);const view=ctx.getParameter(ctx.VIEWPORT),bytes=new Uint8Array(view[2]*view[3]*4),top=new Uint8Array(bytes.length);ctx.readPixels(0,0,view[2],view[3],ctx.RGBA,ctx.UNSIGNED_BYTE,bytes);for(let y=0;y<view[3];y++)top.set(bytes.subarray((view[3]-1-y)*view[2]*4,(view[3]-y)*view[2]*4),y*view[2]*4);gpuStages.push({bytes:top,w:view[2],h:view[3]});};}return ctx;};
    const gpu=api.createRuntime(config);gpu.renderTo(canvas(),.2,{sceneBackend:'gpu-experimental'});gpu.dispose();HTMLCanvasElement.prototype.getContext=originalContext;
    const originalBytes=premul(pixels(cpuStages[0].input)),layerBytes=premul(pixels(cpuMasks[0])),compositeBytes=premul(pixels(cpuStages[1].input)),blendExamples=[];
    for(let i=0;i<compositeBytes.length&&blendExamples.length<8;i+=4){const expected=[0,1,2,3].map(k=>layerBytes[i+k]+Math.floor((originalBytes[i+k]*(255-layerBytes[i+3])+127)/255));if(expected.some((v,k)=>v!==compositeBytes[i+k]))blendExamples.push({x:i/4%w,y:Math.floor(i/4/w),original:[...originalBytes.slice(i,i+4)],layer:[...layerBytes.slice(i,i+4)],cpu:[...compositeBytes.slice(i,i+4)],expected});}
    return{alphaMath,blendExamples,cpuStages:cpuStages.length,gpuStages:gpuStages.length,
      noiseLow:compare(premul(pixels(down(cpuStages[0].result))),gpuStages[0].bytes,w),
      noiseMasked:compare(premul(pixels(cpuStages[1].input)),gpuStages[2].bytes,w),
      thresholdInput:compare(premul(pixels(down(cpuStages[1].input))),gpuStages[3].bytes,w)};
  },`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`);
  console.log(JSON.stringify(result,null,2));
  assert.equal(result.alphaMath.premul,0);
  assert.equal(result.noiseLow.count,0,'Noise arithmetic differs before range composite');
  assert.equal(result.noiseMasked.count,0,'Range composite differs from Canvas bytes');
  assert.equal(result.thresholdInput.count,0,'Binary threshold receives different bytes');
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-noise-alpha-diagnostic-result.json'),JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
