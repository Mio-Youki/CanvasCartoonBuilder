#!/usr/bin/env node
// Exercise actual createRuntime/renderTo, including whole-chain CPU fallback.
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const browser=await chromium.launch({executablePath:edge,headless:true});
try {
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-player-lifecycle=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.sceneGpu);
  const result=await page.evaluate(async()=>{
    const rt=window.ToSampoolRuntimeVNext,contexts=[];
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const result=original.call(this,type,...args);if(type==='webgl2'&&result)contexts.push(result);return result;};
    const canvas=(w=320,h=180)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const source=canvas(),ctx=source.getContext('2d'),gradient=ctx.createLinearGradient(0,0,320,180);
    gradient.addColorStop(0,'#16708b');gradient.addColorStop(.5,'#df7647');gradient.addColorStop(1,'#ffe983');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(160,90,142,77,0,0,Math.PI*2);ctx.fill();
    const alpha=canvas();alpha.getContext('2d').fillStyle='#fff';alpha.getContext('2d').beginPath();alpha.getContext('2d').ellipse(160,90,95,63,0,0,Math.PI*2);alpha.getContext('2d').fill();
    const scene=(type='wave',grid=3,mask=null,w=320,h=180)=>({
      format:'tosampool-scene/v4',width:w,height:h,loop:4,background:{alpha:0},
      assets:{photo:{image:source},alpha:{image:alpha}},
      entities:[{id:'paint',type:'image',assetId:'photo',x:12,y:6,w:280,h:160,alpha:.8,anim:{bob:{amount:7,period:2,angle:0}}},{id:'source',type:'ellipse',x:80,y:40,w:140,h:94,fill:'#fff',anim:{bob:{amount:5,period:2,angle:90}}}],
      sceneEffects:{sample:{controllers:{'sampling-grid':{size:grid}},'uneven-sampling':{enabled:true,amount:.8,coarseness:5,field:{enabled:true,type,scale:27,contrast:.8,seed:5,direction:0},edge:{mode:'off'},motion:{enabled:true,type:'uneven-motion',period:3,steps:24,flowSpeed:1,tideAmount:.2},...(mask?{mask}:{})}}}
    });
    const diff=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let rgb=0,alpha=0;for(let i=0;i<x.length;i+=4){rgb+=Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]);alpha+=Math.abs(x[i+3]-y[i+3]);}return{rgb:+(rgb/(a.width*a.height*3)).toFixed(4),alpha:+(alpha/(a.width*a.height)).toFixed(4)};};
    const copy=c=>{const out=canvas(c.width,c.height);out.getContext('2d').drawImage(c,0,0);return out;};
    const premultipliedMax=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let max=0;for(let i=0;i<x.length;i+=4)for(let c=0;c<3;c++)max=Math.max(max,Math.abs(Math.round(x[i+c]*x[i+3]/255)-Math.round(y[i+c]*y[i+3]/255)));return max;};
    const hashProbe=()=>{
      const c=canvas(7,4),gl=c.getContext('webgl2'),compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));gl_Position=vec4(p[gl_VertexID],0,1);}'));
      gl.attachShader(p,compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;precision highp int;out uvec4 color;void main(){uvec2 p=uvec2(gl_FragCoord.xy);uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^6u*69069u^21u*362437u;n=(n^(n>>13u))*1274126177u;n=n^(n>>16u);color=uvec4(n&255u,(n>>8u)&255u,(n>>16u)&255u,(n>>24u)&255u);}'));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
      const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8UI,7,4,0,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,null);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.viewport(0,0,7,4);gl.useProgram(p);gl.drawArrays(gl.TRIANGLES,0,3);const bytes=new Uint8Array(7*4*4);gl.readPixels(0,0,7,4,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,bytes);const mismatches=[];
      for(let y=0;y<4;y++)for(let x=0;x<7;x++){const at=(y*7+x)*4,gpu=(bytes[at]|bytes[at+1]<<8|bytes[at+2]<<16|bytes[at+3]<<24)>>>0,cpu=rt.modules.field.hash(x,y,5,20)*4294967296;if(gpu!==cpu)mismatches.push({x,y,gpu,cpu});}gl.getExtension('WEBGL_lose_context').loseContext();return mismatches;
    };
    const hashMismatches=hashProbe();
    const rows=[];
    for(const [type,grid,mask,w,h] of [
      ['wave',3,null,320,180],['wave',1,{type:'rect',x:55,y:25,w:170,h:120},320,180],
      ['radial',4,{type:'ellipse',x:60,y:30,w:175,h:110},320,180],
      ['noise',3,{type:'element',targetId:'source'},320,180],
      ['wave',3,{type:'alpha',assetId:'alpha',x:40,y:20,w:220,h:135},320,180],
      ['radial',3,{type:'ellipse',x:60,y:30,w:175,h:110,invert:true},333,187]
    ]) {
      const config=scene(type,grid,mask,w,h),cpu=rt.createRuntime(config),gpu=rt.createRuntime(config),expected=canvas(w,h),actual=canvas(w,h);
      for(const time of [.2,.6]){cpu.renderTo(expected,time);const stats=gpu.renderTo(actual,time,{sceneBackend:'gpu-experimental'});rows.push({type,grid,mask:mask?.type||'none',time,...diff(expected,actual),backend:stats.sceneBackend,reason:stats.sceneGpu?.reason,contexts:stats.sceneGpu?.contexts});}
      cpu.dispose();gpu.dispose();
    }
    const timedConfig=scene();timedConfig.timeline={tracks:{
      'effect:scene:sample:uneven-sampling':{segments:[{f:[0,.5],values:{amount:.1,'motion.enabled':false}},{f:[.5,1],values:{amount:.9,'field.type':'noise','field.scale':13}}]},
      'controller:scene:sample:sampling-grid':{segments:[{f:[0,.5],values:{size:2}},{f:[.5,1],values:{size:4}}]}
    }};
    const timedCpu=rt.createRuntime(timedConfig),timedGpu=rt.createRuntime(timedConfig),timedExpected=canvas(),timedActual=canvas(),timed=[];
    for(const time of [.5,2.5]){timedCpu.renderTo(timedExpected,time);const stats=timedGpu.renderTo(timedActual,time,{sceneBackend:'gpu-experimental',sceneSurfacePolicy:'fixed-roles'});timed.push({time,...diff(timedExpected,timedActual),backend:stats.sceneBackend,contexts:stats.sceneGpu?.contexts,roleAllocations:stats.surfaces.roleAllocations,roleSurfaceCount:stats.surfaces.roleSurfaceCount,fieldTick:stats.sceneGpu?.fieldTick,samplingAmount:stats.sceneGpu?.samplingAmount});}timedCpu.dispose();timedGpu.dispose();
    const fractionalConfig=scene('noise');fractionalConfig.sceneEffects.sample['uneven-sampling'].field.scale=13.5;const fractionalPlayer=rt.createRuntime(fractionalConfig),fractionalOut=canvas(),fractionalExpected=canvas();const fractionalStats=fractionalPlayer.renderTo(fractionalOut,.3,{sceneBackend:'gpu-experimental'});rt.createRuntime(fractionalConfig).renderTo(fractionalExpected,.3);
    const fractionalNoise={backend:fractionalStats.sceneBackend,reason:fractionalStats.sceneGpu?.reason,allocations:fractionalStats.sceneGpu?.allocations,...diff(fractionalExpected,fractionalOut)};fractionalPlayer.dispose();
    const config=scene(),player=rt.createRuntime(config),out=canvas();
    const first=player.renderTo(out,.25,{sceneBackend:'gpu-experimental',sceneSourceVersion:1}),before=copy(out);
    const playerGl=contexts.at(-1);
    const paused=player.renderTo(out,.25,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});
    player.scene.entities[0].x+=13;
    const edited=player.renderTo(out,.25,{sceneBackend:'gpu-experimental',sceneSourceVersion:2}),editDifference=diff(before,out);
    player.scene.entities[0].x-=13;
    const undo=player.renderTo(out,.25,{sceneBackend:'gpu-experimental',sceneSourceVersion:3}),undoDifference=diff(before,out);
    const seek=player.renderTo(out,.75,{sceneBackend:'gpu-experimental',sceneSourceVersion:3});
    const noVersion=player.renderTo(out,.75,{sceneBackend:'gpu-experimental'});
    const lifecycle={first:first.sceneGpu,paused:paused.sceneGpu,edited:edited.sceneGpu,editDifference,undo:undo.sceneGpu,undoDifference,seek:seek.sceneGpu,noVersion:noVersion.sceneGpu};
    const resizeExecutor=rt.modules.sceneGpu.create(),resizeA=rt.createRuntime(scene()),resizeB=rt.createRuntime(scene('wave',3,null,333,187)),resizeOut=canvas();
    const beforeResize=resizeA.renderTo(resizeOut,.75,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:resizeExecutor});
    const resized=resizeB.renderTo(resizeOut,.75,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:resizeExecutor}),resizeExpected=canvas(333,187);rt.createRuntime(resizeB.scene).renderTo(resizeExpected,.75);
    const resize={...diff(resizeExpected,resizeOut),contexts:resized.sceneGpu?.contexts,allocations:resized.sceneGpu?.allocations,disposals:resized.sceneGpu?.disposals,calibrationAllocations:Number(beforeResize.sceneGpu.nearestCalibrationBytes>0)+Number(resized.sceneGpu.nearestCalibrationBytes>0)};resizeExecutor.dispose();resizeA.dispose();resizeB.dispose();
    player.scene.sceneEffects.overlay['tint-overlay']={enabled:true,color:'#ff0055',alpha:.3,blend:'multiply'};
    const fallback=player.renderTo(out,.75,{sceneBackend:'gpu-experimental'}),cpuFallback=canvas();rt.createRuntime(player.scene).renderTo(cpuFallback,.75);
    const unsupported={backend:fallback.sceneBackend,reason:fallback.sceneGpu?.reason,...diff(cpuFallback,out),premultipliedMax:premultipliedMax(cpuFallback,out)};
    delete player.scene.sceneEffects.overlay['tint-overlay'];
    player.renderTo(out,.25,{sceneBackend:'gpu-experimental'});const gl=playerGl,lose=gl.getExtension('WEBGL_lose_context');
    if(!lose)throw new Error('context loss extension unavailable');lose.loseContext();await new Promise(resolve=>setTimeout(resolve,60));
    const lost=player.renderTo(out,.25,{sceneBackend:'gpu-experimental'}),lostExpected=canvas();rt.createRuntime(player.scene).renderTo(lostExpected,.25);
    const contextLoss={backend:lost.sceneBackend,reason:lost.sceneGpu?.reason,...diff(lostExpected,out),premultipliedMax:premultipliedMax(lostExpected,out)};
    player.clearCaches();const recovered=player.renderTo(out,.25,{sceneBackend:'gpu-experimental'});
    const recovery={backend:recovered.sceneBackend,contexts:recovered.sceneGpu?.contexts};player.dispose();
    const originalGetContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:originalGetContext.call(this,type,...args);};
    const unavailablePlayer=rt.createRuntime(config),unavailable=unavailablePlayer.renderTo(out,.3,{sceneBackend:'gpu-experimental'}),noGlExpected=canvas();rt.createRuntime(config).renderTo(noGlExpected,.3);
    const noWebgl={backend:unavailable.sceneBackend,reason:unavailable.sceneGpu?.reason,...diff(noGlExpected,out),premultipliedMax:premultipliedMax(noGlExpected,out)};unavailablePlayer.dispose();HTMLCanvasElement.prototype.getContext=originalGetContext;
    const transitionConfig=scene();transitionConfig.timeline={scenes:[{id:'a',f:[0,.5],background:{color:'#28426a',alpha:1}},{id:'b',f:[.5,1],background:{color:'#63452e',alpha:1},transition:{type:'fade',duration:.7}}]};
    const transitionPlayer=rt.createRuntime(transitionConfig),transitionCpu=rt.createRuntime(transitionConfig),expected=canvas(),transitionRows=[];
    for(const time of [2.15,2.3,2.45]){transitionCpu.renderTo(expected,time);const stats=transitionPlayer.renderTo(out,time,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true});transitionRows.push({time,...diff(expected,out),backend:stats.sceneBackend,previousBackend:stats.transitionBackend,contexts:stats.sceneGpu?.contexts,allocations:stats.sceneGpu?.allocations,calibration:Number(stats.sceneGpu?.nearestCalibrationBytes>0),frameUploads:stats.frameGpuUploads,framePasses:stats.frameGpuPasses,previousSurfaceReuses:stats.transitionSurfaces?.reuses});}
    transitionPlayer.scene.timeline.scenes[0].background.color='#cd945a';transitionPlayer.renderTo(out,2.3,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true});const revised=canvas();rt.createRuntime(transitionPlayer.scene).renderTo(revised,2.3);
    const outgoingMutation=diff(revised,out);transitionPlayer.dispose();transitionCpu.dispose();
    const a=rt.createRuntime(scene()),bConfig=scene();bConfig.entities[0].x=45;const b=rt.createRuntime(bConfig),aCanvas=canvas(),bCanvas=canvas();a.renderTo(aCanvas,.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});const aSnapshot=copy(aCanvas);b.renderTo(bCanvas,.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});b.dispose();const isolatedStats=a.renderTo(aCanvas,.2,{sceneBackend:'gpu-experimental',sceneSourceVersion:1});const isolation={...diff(aSnapshot,aCanvas),cacheHit:isolatedStats.sceneGpu?.cacheHit,backend:isolatedStats.sceneBackend};a.dispose();
    const oneShotCanvas=canvas(),oneShotStats=rt.renderTo(oneShotCanvas,config,.25,{sceneBackend:'gpu-experimental'}),oneShotGl=contexts.at(-1),oneShotExpected=canvas();rt.createRuntime(config).renderTo(oneShotExpected,.25);await new Promise(resolve=>setTimeout(resolve,30));const oneShot={...diff(oneShotExpected,oneShotCanvas),backend:oneShotStats.sceneBackend,released:oneShotGl.isContextLost()};
    const transitionMatrix=[];
    for(const [type,direction] of [['fade','right'],['wipe','right'],['wipe','left'],['wipe','up'],['wipe','down'],['dissolve','right']]){
      const cfg=scene('wave',3,null,333,187);cfg.timeline={scenes:[{id:'a',f:[0,.5],background:{color:'#28426a',alpha:.15}},{id:'b',f:[.5,1],background:{color:'#63452e',alpha:.25},transition:{type,direction,duration:.7,cell:7,seed:9}}]};
      const cpu=rt.createRuntime(cfg),gpu=rt.createRuntime(cfg),a=canvas(333,187),b=canvas(333,187);let first=null,firstCpu=null,last=null;
      for(const time of [1.9,2.07,2.3,2.63,2.8,2.07]){
        cpu.renderTo(a,time);const stats=gpu.renderTo(b,time,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true,sceneGpuValidation:'frame-end',sceneSurfacePolicy:'fixed-roles',sceneSourceVersion:1});
        transitionMatrix.push({type,direction,time,...diff(a,b),premultipliedMax:premultipliedMax(a,b),composite:stats.transitionCompositeBackend||null,allocations:stats.sceneGpu?.allocations,calibration:Number(stats.sceneGpu?.nearestCalibrationBytes>0)});
        if(time===2.07){if(!first){first=copy(b);firstCpu=copy(a);}else last={...diff(first,b),premultipliedMax:premultipliedMax(first,b),cpuDifference:diff(firstCpu,a)};}
      }
      transitionMatrix.push({type,direction,seek:true,...last});cpu.dispose();gpu.dispose();
    }
    const faultConfig=scene();faultConfig.timeline=transitionConfig.timeline;
    const faultPlayer=rt.createRuntime(faultConfig),faultCpu=rt.createRuntime(faultConfig),realExecutor=rt.modules.sceneGpu.create();
    const failingExecutor={render:realExecutor.render,stats:realExecutor.stats,composeTransition:()=>false};
    const faultStats=faultPlayer.renderTo(out,2.3,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true,_sceneGpuExecutor:failingExecutor});faultCpu.renderTo(expected,2.3);
    const transitionFailure={...diff(expected,out),backend:faultStats.sceneBackend,reason:faultStats.transitionGpuFallback};realExecutor.dispose();faultPlayer.dispose();faultCpu.dispose();
    const transitionFallbacks=[];
    for(const mode of ['default','grid-change','blackout']){
      const cfg=scene();cfg.timeline={scenes:transitionConfig.timeline.scenes};
      if(mode==='grid-change')cfg.timeline.tracks={'controller:scene:sample:sampling-grid':{segments:[{f:[0,.5],values:{size:2}},{f:[.5,1],values:{size:4}}]}};
      if(mode==='blackout')cfg.timeline.scenes=cfg.timeline.scenes.map(s=>({...s,transition:{type:'blackout',duration:.7,color:'#342132'}}));
      const p=rt.createRuntime(cfg),c=rt.createRuntime(cfg);const stats=p.renderTo(out,2.3,{sceneBackend:'gpu-experimental',sceneGpuTransitions:mode!=='default'});c.renderTo(expected,2.3);
      transitionFallbacks.push({mode,...diff(expected,out),composite:stats.transitionCompositeBackend,passes:stats.frameGpuPasses});p.dispose();c.dispose();
    }
    const profilePlayer=rt.createRuntime(scene()),profileOut=canvas(),plainOut=canvas();
    const plainStats=profilePlayer.renderTo(plainOut,.2,{sceneBackend:'gpu-experimental'});
    const profileGl=contexts.at(-1),check=profileGl.checkFramebufferStatus.bind(profileGl);let repeatedChecks=0;
    profileGl.checkFramebufferStatus=(...args)=>{repeatedChecks++;return check(...args);};
    const profileStats=profilePlayer.renderTo(profileOut,.2,{sceneBackend:'gpu-experimental',sceneProfile:true});
    const profiling={...diff(plainOut,profileOut),defaultAbsent:!('sceneProfileMs' in plainStats),phases:profileStats.sceneProfileMs,repeatedChecks};profilePlayer.dispose();
    const pool=rt.modules.surfaces.create(),roleSource=pool.acquireRole('source',100,50);pool.release(roleSource);const freeSurface=pool.acquire(100,50);
    const roleRange=pool.acquireRole('range',100,50),sameSource=pool.acquireRole('source',100,50),resizedSource=pool.acquireRole('source',200,50);
    const roles={noFreeAlias:roleSource!==freeSurface,noRoleAlias:roleSource!==roleRange,stable:sameSource===roleSource,resized:resizedSource!==roleSource,stats:pool.stats()};pool.release(freeSurface);pool.clear();roles.cleared=!('roleSurfaceCount' in pool.stats());
    const fixedConfig=scene(),fixedPlayer=rt.createRuntime(fixedConfig),fixedOptions={sceneBackend:'gpu-experimental',sceneSurfacePolicy:'fixed-roles',sceneSurfaceTrace:true};
    const fixedFirst=fixedPlayer.renderTo(out,.2,fixedOptions),fixedSecond=fixedPlayer.renderTo(out,.4,fixedOptions);
    const fixedRoleState={stable:fixedFirst.sceneSurfaceTrace.source.id===fixedSecond.sceneSurfaceTrace.source.id,allocations:fixedSecond.surfaces.roleAllocations};
    fixedPlayer.clearCaches();const fixedAfter=fixedPlayer.renderTo(out,.4,fixedOptions);fixedRoleState.rebuilt=fixedAfter.surfaces.roleAllocations;fixedRoleState.contexts=fixedAfter.sceneGpu.contexts;fixedPlayer.dispose();
    const queuedConfig=scene();queuedConfig.timeline=transitionConfig.timeline;
    const queued=rt.createRuntime(queuedConfig),queuedCpu=rt.createRuntime(queuedConfig),queuedOptions={sceneBackend:'gpu-experimental',sceneGpuTransitions:true,sceneGpuValidation:'frame-end'};
    queued.renderTo(out,2.3,queuedOptions);const queuedGl=contexts.at(-1),getError=queuedGl.getError.bind(queuedGl);let errorChecks=0;
    queued.renderTo(out,2.45,{sceneBackend:'gpu-experimental',sceneGpuTransitions:true});const perSideSnapshot=copy(out);
    queuedGl.getError=()=>{errorChecks++;return getError();};queued.renderTo(out,2.45,queuedOptions);const policyDifference=diff(perSideSnapshot,out);queuedCpu.renderTo(expected,2.45);
    const queuedValidation={checks:errorChecks,...diff(expected,out),premultipliedMax:premultipliedMax(expected,out),policyDifference};
    queuedGl.getError=()=>queuedGl.INVALID_OPERATION;const queuedFailureStats=queued.renderTo(out,2.3,queuedOptions);queuedCpu.renderTo(expected,2.3);
    const queuedFailure={...diff(expected,out),backend:queuedFailureStats.sceneBackend,reason:queuedFailureStats.transitionGpuFallback};queued.dispose();queuedCpu.dispose();
    const hooked=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const result=hooked.call(this,type,...args);if(type==='webgl2'&&result)result.checkFramebufferStatus=()=>result.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;return result;};
    const incompletePlayer=rt.createRuntime(scene()),incompleteStats=incompletePlayer.renderTo(out,.2,{sceneBackend:'gpu-experimental'}),incompleteCpu=rt.createRuntime(scene());incompleteCpu.renderTo(expected,.2);
    const incompleteFramebuffer={...diff(expected,out),backend:incompleteStats.sceneBackend,reason:incompleteStats.sceneGpu?.reason};incompletePlayer.dispose();incompleteCpu.dispose();
    HTMLCanvasElement.prototype.getContext=original;
    return {hashMismatches,rows,timed,fractionalNoise,lifecycle,resize,unsupported,contextLoss,recovery,noWebgl,transitionRows,outgoingMutation,isolation,oneShot,transitionMatrix,transitionFailure,transitionFallbacks,profiling,incompleteFramebuffer,queuedValidation,queuedFailure,roles,fixedRoleState};
  });
  console.log(JSON.stringify(result,null,2));
  assert.deepEqual(result.hashMismatches,[]);
  assert.ok(result.rows.every(row=>row.backend==='gpu'&&row.rgb<.3&&row.alpha<.05),JSON.stringify(result.rows));
  assert.ok(result.timed.every(row=>row.backend==='gpu'&&row.rgb<.3&&row.alpha<.05));assert.equal(result.timed[1].contexts,1,'timed grid changes must rebuild surfaces, not the device');
  assert.equal(result.timed[1].roleAllocations,3);assert.equal(result.timed[1].roleSurfaceCount,2,'work size changes replace the role, not accumulate canvases');
  assert.equal(result.fractionalNoise.backend,'cpu');assert.equal(result.fractionalNoise.reason,'unsupported-noise-scale');assert.equal(result.fractionalNoise.allocations,0);assert.ok(result.fractionalNoise.rgb<.05&&result.fractionalNoise.alpha===0);
  assert.equal(result.lifecycle.paused.cacheHit,true);assert.equal(result.lifecycle.paused.uploads,0);
  assert.ok(result.lifecycle.editDifference.rgb>.1);assert.equal(result.lifecycle.undoDifference.rgb,0);assert.equal(result.lifecycle.undoDifference.alpha,0);
  assert.equal(result.lifecycle.edited.cacheHit,false);assert.equal(result.lifecycle.seek.cacheHit,false);assert.equal(result.lifecycle.noVersion.cacheHit,false);
  assert.equal(result.lifecycle.seek.allocations,result.lifecycle.first.allocations);
  assert.ok(result.resize.rgb<.3&&result.resize.alpha<.05);assert.equal(result.resize.contexts,1);assert.equal(result.resize.allocations,9+result.resize.calibrationAllocations);assert.equal(result.resize.disposals,0);
  for(const value of [result.unsupported,result.contextLoss,result.noWebgl]){assert.equal(value.backend,'cpu');assert.ok(value.rgb<.05&&value.premultipliedMax<=1,JSON.stringify(value));assert.equal(value.alpha,0);}
  assert.equal(result.recovery.backend,'gpu');
  assert.ok(result.transitionRows.every((row,index)=>row.backend==='gpu'&&row.previousBackend==='gpu'&&row.contexts===1&&row.allocations===7+row.calibration&&row.frameUploads===(index===0?3+row.calibration:2)&&row.framePasses===5&&row.rgb<.3&&row.alpha<.05),JSON.stringify(result.transitionRows));
  // Fewer Canvas round-trips remove intermediate premultiplication rounding.
  // Bound transparent straight RGB and premultiplied error separately.
  assert.ok(result.transitionMatrix.every(row=>row.rgb<.5&&row.alpha<.1&&row.premultipliedMax<=2),JSON.stringify(result.transitionMatrix));
  assert.ok(result.transitionMatrix.filter(row=>row.time>=2&&row.time<2.7).every(row=>row.composite==='gpu'&&row.allocations===7+row.calibration));
  assert.deepEqual(result.transitionFailure,{rgb:0,alpha:0,backend:'cpu',reason:'gpu-transition-failed'});
  assert.ok(result.transitionFallbacks.every(row=>row.composite==='cpu'&&row.rgb<.3&&row.alpha<.05));
  assert.ok(result.profiling.defaultAbsent&&result.profiling.rgb<.3&&result.profiling.alpha<.05);assert.equal(result.profiling.repeatedChecks,0);
  assert.ok(Object.values(result.profiling.phases).every(value=>Number.isFinite(value)&&value>=0));assert.ok('sourceDraw' in result.profiling.phases);
  assert.equal(result.incompleteFramebuffer.backend,'cpu');assert.equal(result.incompleteFramebuffer.reason,'incomplete-framebuffer');assert.ok(result.incompleteFramebuffer.rgb<.05&&result.incompleteFramebuffer.alpha===0);
  assert.equal(result.queuedValidation.checks,1);assert.ok(result.queuedValidation.rgb<.5&&result.queuedValidation.alpha<.05&&result.queuedValidation.premultipliedMax<=2);
  assert.deepEqual(result.queuedValidation.policyDifference,{rgb:0,alpha:0});
  assert.deepEqual(result.queuedFailure,{rgb:0,alpha:0,backend:'cpu',reason:'gpu-transition-failed'});
  assert.ok(result.roles.noFreeAlias&&result.roles.noRoleAlias&&result.roles.stable&&result.roles.resized&&result.roles.cleared);assert.equal(result.roles.stats.roleAllocations,3);assert.equal(result.roles.stats.roleSurfaceCount,2);
  assert.deepEqual(result.fixedRoleState,{stable:true,allocations:2,rebuilt:2,contexts:1});
  assert.ok(result.transitionRows.at(-1).previousSurfaceReuses>0,'outgoing Runtime must reuse its surfaces');
  assert.ok(result.outgoingMutation.rgb<.3,'outgoing Runtime must share live normalized scene data');
  assert.deepEqual(result.isolation,{rgb:0,alpha:0,cacheHit:true,backend:'gpu'});
  assert.equal(result.oneShot.backend,'gpu');assert.equal(result.oneShot.released,true);assert.ok(result.oneShot.rgb<.3&&result.oneShot.alpha<.05);
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-player-transition-correctness-result.json'),JSON.stringify(result,null,2)+'\n');
} finally {await browser.close();}
