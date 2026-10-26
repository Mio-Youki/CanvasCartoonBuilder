// One executor, alternating extents and grids. No production object routing.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),source=readFileSync(resolve(root,'home-scene-vnext.js'),'utf8');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addScriptTag({content:source});
  const result=await page.evaluate(async()=>{
    const rt=ToSampoolRuntimeVNext,textures=new Set(),programs=new Set(),contexts=[],seen=new WeakSet(),getContext=HTMLCanvasElement.prototype.getContext;
    let renderer=null,programCreates=0,denySurfaceSize=false;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=getContext.call(this,type,...args);if(type==='webgl2'&&gl&&!seen.has(gl)){
      seen.add(gl);contexts.push(gl);const info=gl.getExtension('WEBGL_debug_renderer_info');renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
      const ct=gl.createTexture.bind(gl),dt=gl.deleteTexture.bind(gl),cp=gl.createProgram.bind(gl),dp=gl.deleteProgram.bind(gl);
      gl.createTexture=()=>{const v=ct();textures.add(v);return v;};gl.deleteTexture=v=>{textures.delete(v);return dt(v);};
      gl.createProgram=()=>{const v=cp();programs.add(v);programCreates++;return v;};gl.deleteProgram=v=>{programs.delete(v);return dp(v);};
      const parameter=gl.getParameter.bind(gl);gl.getParameter=name=>denySurfaceSize&&name===gl.MAX_RENDERBUFFER_SIZE?32:parameter(name);
    }return gl;};
    const canvas=(w=1,h=1)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const pixels=c=>{const out=canvas(c.width,c.height),ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const difference=(a,b)=>{const x=pixels(a),y=pixels(b);if(x.length!==y.length)throw Error('output size mismatch');let preMax=0,alphaMax=0;for(let i=0;i<x.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(x[i+3]-y[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(x[i+c]*x[i+3]/255)-Math.round(y[i+c]*y[i+3]/255)));}return {preMax,alphaMax};};
    function fixture(w,h,grid){
      const image=canvas(w,h),ctx=image.getContext('2d'),gradient=ctx.createLinearGradient(0,0,w,h);
      gradient.addColorStop(0,'#173b68');gradient.addColorStop(.4,'#d46c37');gradient.addColorStop(1,'#e8eab490');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(w/2,h/2,w*.45,h*.44,0,0,Math.PI*2);ctx.fill();
      return {format:'tosampool-scene/v4',width:w,height:h,loop:4,background:{alpha:0},assets:{image:{image}},entities:[{id:'paint',type:'image',assetId:'image',x:0,y:0,w,h,alpha:.8}],sceneEffects:{overlay:{'tint-overlay':{enabled:true,color:'#a85877',alpha:.2,blend:'screen'}},sample:{controllers:{'sampling-grid':{size:grid}},'noise-dither':{enabled:true,amount:31,size:2,colorMode:'rgb',seed:7,motion:{enabled:true,type:'noise-refresh',period:2,steps:12}},threshold:{enabled:true,threshold:.5,dark:'#142332',light:'#ffdaa0',mask:{type:'ellipse',x:w*.1,y:h*.1,w:w*.8,h:h*.8},motion:{enabled:true,period:2,steps:12,amount:.1}}}}};
    }
    const executor=rt.modules.sceneGpu.create(),pool=new Map(),out=canvas(),expected=canvas(),rows=[];
    const get=(w,h,g)=>{const key=[w,h,g].join(':');if(!pool.has(key)){const scene=fixture(w,h,g);pool.set(key,{cpu:rt.createRuntime(scene),gpu:rt.createRuntime(scene)});}return pool.get(key);};
    const shapes=[[320,180,4],[333,187,3],[640,360,3],[480,270,1],[320,180,4],[333,187,3]];
    try{
      for(let round=0;round<3;round++)for(const [w,h,grid]of shapes){
        const {cpu,gpu}=get(w,h,grid),time=.2+round*.13;cpu.renderTo(expected,time);
        const began=performance.now(),stats=gpu.renderTo(out,time,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor}),callMs=performance.now()-began;
        rows.push({w,h,grid,round,callMs,backend:stats.sceneBackend,...difference(expected,out),...executor.stats(),initialized:stats.sceneGpu.initialized,surfacesRebuilt:stats.sceneGpu.surfacesRebuilt,surfacePrepareMs:stats.sceneGpu.surfacePrepareMs,calibrationMs:stats.sceneGpu.nearestCalibration?.prepareMs,externalTextures:textures.size,externalPrograms:programs.size,programCreates});
      }
      const last=get(333,187,3),before=executor.stats();last.cpu.renderTo(expected,.9);const warm=last.gpu.renderTo(out,.9,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor});
      const sameSize={...difference(expected,out),before,after:executor.stats(),initialized:warm.sceneGpu.initialized,surfacesRebuilt:warm.sceneGpu.surfacesRebuilt};
      const failed=get(997,561,3),gl=contexts.at(-1),texImage=gl.texImage2D;
      gl.texImage2D=function(...args){if(args[3]===997&&args[4]===561)throw Error('injected-surface-allocation');return texImage.apply(this,args);};
      let failure;
      try{failed.cpu.renderTo(expected,.4);const s=failed.gpu.renderTo(out,.4,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor});failure={backend:s.sceneBackend,reason:s.sceneGpu.reason,...difference(expected,out),...executor.stats(),externalTextures:textures.size,externalPrograms:programs.size};}finally{gl.texImage2D=texImage;}
      executor.dispose();const recovered=failed.gpu.renderTo(out,.4,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor});
      const recovery={backend:recovered.sceneBackend,...difference(expected,out),contexts:contexts.length};
      contexts.at(-1).getExtension('WEBGL_lose_context').loseContext();await new Promise(r=>setTimeout(r,30));
      const lost=last.gpu.renderTo(out,.9,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor});last.cpu.renderTo(expected,.9);
      const contextLoss={backend:lost.sceneBackend,reason:lost.sceneGpu.reason,...difference(expected,out)};
      executor.dispose();const released={...executor.stats(),externalTextures:textures.size,externalPrograms:programs.size};
      denySurfaceSize=true;
      const denied=last.gpu.renderTo(out,.9,{sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor});
      const deviceLimit={backend:denied.sceneBackend,reason:denied.sceneGpu.reason,...difference(expected,out),externalTextures:textures.size,externalPrograms:programs.size};
      return {renderer,rows,sameSize,failure,recovery,contextLoss,released,deviceLimit};
    }finally{executor.dispose();for(const pair of pool.values()){pair.cpu.dispose();pair.gpu.dispose();}}
  });
  const report={date:'2026-10-24',browser:browser.version(),os:process.platform,headless:true,runtimeSha256:createHash('sha256').update(source).digest('hex'),method:'18 alternating-size frames, three cycles; full scene CPU/GPU including transparency/mask; not GPU device timing',errors,...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,'docs/architecture/v4-gpu-surface-lifecycle-2026-10-24-result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  assert.ok(result.rows.every(row=>row.backend==='gpu'&&row.contexts===1&&row.preMax<=2&&row.alphaMax<=1&&row.liveTextures===row.externalTextures&&row.programCount===row.externalPrograms));
  assert.ok(result.rows.slice(1).every(row=>!row.initialized&&row.surfacesRebuilt));
  assert.equal(result.rows[5].programCreates,result.rows.at(-1).programCreates,'revisited geometries must not compile more programs');
  assert.ok(result.rows.every(row=>row.liveSurfaceTextures===8+Number(row.nearestCalibrationBytes>0)&&row.liveTextures===row.liveSurfaceTextures+3&&row.programCount<=7));
  assert.ok(result.rows[4].textureBytes<result.rows[2].textureBytes,'returning to a smaller size must release larger surfaces');
  assert.equal(result.sameSize.before.allocations,result.sameSize.after.allocations);assert.equal(result.sameSize.surfacesRebuilt,false);
  assert.equal(result.failure.backend,'cpu');assert.equal(result.failure.reason,'injected-surface-allocation');assert.equal(result.failure.externalTextures,0);assert.equal(result.failure.externalPrograms,0);
  assert.equal(result.recovery.backend,'gpu');assert.equal(result.contextLoss.backend,'cpu');assert.equal(result.contextLoss.reason,'webgl-context-lost');
  assert.equal(result.deviceLimit.backend,'cpu');assert.equal(result.deviceLimit.reason,'webgl-surface-size-limit');assert.equal(result.deviceLimit.externalTextures,0);assert.equal(result.deviceLimit.externalPrograms,0);
  for(const row of [result.sameSize,result.failure,result.recovery,result.contextLoss,result.deviceLimit])assert.ok(row.preMax<=2&&row.alphaMax<=1);
  assert.equal(result.released.externalTextures,0);assert.equal(result.released.externalPrograms,0);assert.equal(result.released.textureBytes,0);assert.deepEqual(errors,[]);
}finally{await browser.close();}
