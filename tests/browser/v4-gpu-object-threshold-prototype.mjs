// Historical test-only adapter. Formal pilot admission is narrower than this prototype.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const runtimeSource=readFileSync(resolve(root,'home-scene-vnext.js'),'utf8');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const photo='data:image/jpeg;base64,'+readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64');
const freshReference=process.argv.includes('--fresh-reference'),resetSourceSmoothing=process.argv.includes('--reset-source-smoothing');
const reportTag=process.argv.find(arg=>arg.startsWith('--report-tag='))?.split('=')[1];
if(reportTag&&!/^[a-z0-9-]+$/.test(reportTag))throw Error('Invalid report tag');
const tag=reportTag?'-'+reportTag:freshReference?'-fresh-reference':resetSourceSmoothing?'-reset-source-smoothing':'';
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.addScriptTag({content:runtimeSource});
  const result=await page.evaluate(async({photo,freshReference,resetSourceSmoothing})=>{
    const rt=ToSampoolRuntimeVNext,image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=photo;});
    let renderer=null;const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=getContext.call(this,type,...args);if(type==='webgl2'&&ctx&&!renderer){const info=ctx.getExtension('WEBGL_debug_renderer_info');renderer=info?ctx.getParameter(info.UNMASKED_RENDERER_WEBGL):ctx.getParameter(ctx.RENDERER);}return ctx;};
    const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const pixels=canvas=>{const c=make(canvas.width,canvas.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const diff=(a,b)=>{if(a.width!==b.width||a.height!==b.height)throw Error('Capsule size mismatch');const x=pixels(a),y=pixels(b);let preMax=0,alphaMax=0;for(let i=0;i<x.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(x[i+3]-y[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(x[i+c]*x[i+3]/255)-Math.round(y[i+c]*y[i+3]/255)));}return {preMax,alphaMax};};
    const stats=()=>({maskedObjects:0,capsuleObjects:0,unsupportedEffects:[]});
    const evaluated=(entity,frame)=>{
      const group=entity.effects.sample,output={};
      for(const [id,config]of Object.entries(group))if(id!=='controllers')output[id]=config.enabled?frame.effectValuesFor('object',entity.id,id,config):config;
      output.controllers={};for(const [id,config]of Object.entries(group.controllers||{}))output.controllers[id]=frame.controllerValuesFor('object',entity.id,id,config);
      return output;
    };
    function preflight(entity,frame){
      const stages=entity.effects.pipeline||['mask','decorate','sample'];
      if(stages.indexOf('sample')!==stages.length-1)return 'prototype-sample-not-last';
      const group=evaluated(entity,frame);
      if(Object.keys(group.controllers).some(id=>id!=='sampling-grid'))return 'prototype-unsupported-controller';
      if((group.controllers['sampling-grid']?.alphaMode||'keep')!=='keep')return 'prototype-grid-alpha';
      for(const [id,c]of Object.entries(group))if(id!=='controllers'&&c.enabled&&(id!=='threshold'||c.mask?.type&&c.mask.type!=='none'))return 'prototype-unsupported-sampling';
      return null;
    }
    function gpuCapsule(scene,entity,frame,surfaces,executor){
      const reason=preflight(entity,frame);if(reason)return {handled:false,reason};
      // Same real bounds/content/formation/mask/decorate, but no sampling yet.
      const prefix={...entity,effects:{...entity.effects,pipeline:entity.effects.pipeline.filter(stage=>stage!=='sample')}};
      let firstAcquire=true;
      const sourcePool={...surfaces,acquire(w,h){const c=surfaces.acquire(w,h);if(firstAcquire){firstAcquire=false;if(resetSourceSmoothing)c.getContext('2d').imageSmoothingEnabled=true;}return c;}};
      const source=rt.modules.objects.createCapsule(scene,prefix,frame,stats(),sourcePool);
      const group=evaluated(entity,frame),carrier={width:source.bounds.w,height:source.bounds.h,sceneEffects:{overlay:{},sample:group}};
      // No second timeline interpretation: scene executor receives evaluated data.
      const values={...frame,effectValuesFor:(_scope,_owner,_id,value)=>value,controllerValuesFor:(_scope,_owner,_id,value)=>value};
      const output=surfaces.acquire(source.bounds.w,source.bounds.h);
      const began=performance.now(),result=executor.render(source.capsule,carrier,values,surfaces,output.getContext('2d'),{}),kernelCallMs=performance.now()-began;
      surfaces.release(source.capsule);
      if(!result.handled){surfaces.release(output);return result;}
      return {handled:true,capsule:output,bounds:source.bounds,result,kernelCallMs};
    }
    function composite(capsule,bounds,frame,entity){
      const output=make(1280,720),ctx=output.getContext('2d'),values=frame.valuesFor(entity);
      ctx.fillStyle='#7b8b9c';ctx.fillRect(0,0,output.width,output.height);
      ctx.globalAlpha=values.alpha*values.parentAlpha;ctx.globalCompositeOperation=rt.modules.blend.toCanvas(values.blend);ctx.drawImage(capsule,bounds.x,bounds.y);return output;
    }
    function fixture(kind,grid,w=420,h=237){
      const entity={id:'paint',type:'image',assetId:'photo',x:140,y:90,w,h,alpha:.65,effects:{pipeline:['mask','decorate','sample'],sample:{controllers:{'sampling-grid':{size:grid}},threshold:{enabled:true,threshold:.5,dark:'#17283c',light:'#f9dca0',motion:{enabled:true,amount:.12,period:2,steps:12}}}}};
      const scene={format:'tosampool-scene/v4',width:1280,height:720,loop:8,background:{alpha:0},assets:{photo:{image}},entities:[entity]};
      if(kind==='vector'){entity.type='vector';entity.parts=[{id:'one',type:'rect',x:0,y:0,w,h,fill:'#8a7f65'},{id:'outside',type:'ellipse',x:-28,y:32,w:65,h:57,fill:'#e86d40'}];}
      if(kind==='transformed'){entity.rot=23;entity.skewX=14;entity.skewY=-7;}
      if(kind==='mask'){entity.effects.mask={type:'ellipse',x:170,y:110,w:250,h:170,invert:true};}
      if(kind==='follow-mask'){entity.effects.mask={type:'rect',x:170,y:100,w:200,h:160,follow:true};entity.anim={bob:{amount:12,period:2,angle:90}};}
      if(kind==='decorated'){entity.effects.decorate={projection:{enabled:true,color:'#1b253a',distance:9,angle:30,alpha:.6},outline:{enabled:true,width:4,color:'#e86d40',alpha:.7}};}
      if(kind==='parent-blend'){scene.entities.unshift({id:'group',type:'group',x:40,y:20,w:500,h:300,rot:7,alpha:.6});entity.parentId='group';entity.blend='multiply';}
      if(kind==='timed')scene.timeline={tracks:{'effect:object:paint:threshold':{segments:[{f:[0,.5],values:{threshold:.2,'motion.enabled':false}},{f:[.5,1],values:{threshold:.8,'motion.enabled':false}}]},'controller:object:paint:sampling-grid':{segments:[{f:[0,.5],values:{size:3}},{f:[.5,1],values:{size:4}}]}}};
      const normalized=rt.modules.scene.normalize(scene);
      if(kind==='follow-mask'){const owner=normalized.entities.find(e=>e.id==='paint');owner.effects.mask.followMatrix=Array.from(rt.modules.frame.create(normalized,0).valuesFor(owner).worldMatrix);}
      return normalized;
    }
    const visual=[],releases=[];
    for(const kind of ['image','vector','transformed','mask','follow-mask','decorated','parent-blend','timed'])for(const grid of [1,3]){
      const scene=fixture(kind,grid),entity=scene.entities.find(e=>e.id==='paint'),cpuPool=rt.modules.surfaces.create(),gpuPool=rt.modules.surfaces.create(),executor=rt.modules.sceneGpu.create();
      try{
        for(const time of [.2,5,.2]){
          if(freshReference)cpuPool.clear();
          let firstAcquire=true,cpuSourceSmoothing=null;
          const cpuSurfaces={...cpuPool,acquire(w,h){const c=cpuPool.acquire(w,h);if(firstAcquire){firstAcquire=false;cpuSourceSmoothing=c.getContext('2d').imageSmoothingEnabled;if(resetSourceSmoothing)c.getContext('2d').imageSmoothingEnabled=true;}return c;}};
          const frame=rt.modules.frame.create(scene,time),cpu=rt.modules.objects.createCapsule(scene,entity,frame,stats(),cpuSurfaces),gpu=gpuCapsule(scene,entity,frame,gpuPool,executor);
          if(!gpu.handled)throw Error('Unexpected prototype fallback: '+gpu.reason);
          const sample=evaluated(entity,frame);
          visual.push({kind,grid,time,cpuSourceSmoothing,evaluatedGrid:sample.controllers['sampling-grid'].size,evaluatedThreshold:sample.threshold.threshold,followMatrix:kind==='follow-mask'?rt.modules.masks.followMatrix(entity.effects.mask,entity,frame):null,bounds:cpu.bounds,capsule:diff(cpu.capsule,gpu.capsule),final:diff(composite(cpu.capsule,cpu.bounds,frame,entity),composite(gpu.capsule,gpu.bounds,frame,entity)),contexts:executor.stats().contexts});
          cpuPool.release(cpu.capsule);gpuPool.release(gpu.capsule);
        }
      }finally{executor.dispose();releases.push(executor.stats().textureBytes);cpuPool.clear();gpuPool.clear();}
    }
    const rejected=[];
    for(const change of ['sample-first','extra-effect','alpha-mode']){
      const scene=fixture('image',3),entity=scene.entities[0];
      if(change==='sample-first')entity.effects.pipeline=['sample','mask','decorate'];
      if(change==='extra-effect')entity.effects.sample.halftone={enabled:true};
      if(change==='alpha-mode')entity.effects.sample.controllers['sampling-grid'].alphaMode='hard';
      const frame=rt.modules.frame.create(scene,.2),pool=rt.modules.surfaces.create(),executor=rt.modules.sceneGpu.create();
      const result=gpuCapsule(scene,entity,frame,pool,executor);rejected.push({change,reason:result.reason,allocations:executor.stats().allocations});executor.dispose();pool.clear();
    }
    const performanceRows=[];
    for(const [w,h]of [[640,360],[1280,720]])for(const mode of ['cpu','gpu']){
      const scene=fixture('image',1,w,h),entity=scene.entities[0],pool=rt.modules.surfaces.create(),executor=rt.modules.sceneGpu.create(),samples=[];
      let initial=null,initialAllocations=null,capsuleSize=null;
      try{
        for(let i=0;i<28;i++){
          const frame=rt.modules.frame.create(scene,.2+i/30),start=performance.now();
          const result=mode==='cpu'?rt.modules.objects.createCapsule(scene,entity,frame,stats(),pool):gpuCapsule(scene,entity,frame,pool,executor);
          const elapsed=performance.now()-start;if(mode==='gpu'&&!result.handled)throw Error(result.reason);
          capsuleSize={width:result.bounds.w,height:result.bounds.h,pixels:result.bounds.w*result.bounds.h};
          if(i===0)initial={capsuleCallMs:elapsed,kernelCallMs:result.kernelCallMs??null};if(i===3)initialAllocations=executor.stats().allocations;
          if(i>=4)samples.push(elapsed);pool.release(result.capsule);
        }
        const ordered=samples.slice().sort((a,b)=>a-b);performanceRows.push({w,h,capsuleSize,mode,initial,warmup:4,samples:samples.length,p50:ordered[11],p95:ordered[22],max:ordered.at(-1),extraAllocations:executor.stats().allocations-initialAllocations,textureBytes:executor.stats().textureBytes,explicitArtworkReadbackBytes:mode==='gpu'?0:null,deviceGpuMs:null});
      }finally{executor.dispose();releases.push(executor.stats().textureBytes);pool.clear();}
    }
    const cpuPlayerRepeat=[];
    for(const kind of ['image','decorated']){
      const player=rt.createRuntime(fixture(kind,3)),target=make(1280,720);player.renderTo(target,.2);const first=make(1280,720);first.getContext('2d').drawImage(target,0,0);
      player.renderTo(target,5);player.renderTo(target,.2);cpuPlayerRepeat.push({kind,...diff(first,target)});player.dispose();
    }
    return {visual,rejected,performanceRows,releases,cpuPlayerRepeat,renderer,objectRegistryCapability:rt.modules.backendCapabilities.describe('threshold','object')};
  },{photo,freshReference,resetSourceSmoothing});
  const report={date:'2026-10-24',browser:browser.version(),headless:true,os:process.platform,runtimeSha256:createHash('sha256').update(runtimeSource).digest('hex'),freshReference,resetSourceSmoothing,method:'Independent capsule prototype, not editor integration; 4 warmup + 24 samples; CPU content through Canvas output included, final placement excluded',errors,...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-gpu-object-threshold-prototype-2026-10-24${tag}-result.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({cases:result.visual.length,failures:result.visual.filter(row=>row.capsule.preMax>2||row.capsule.alphaMax>1||row.final.preMax>2||row.final.alphaMax>1),rejected:result.rejected,performanceRows:result.performanceRows,releases:result.releases,errors},null,2));
  assert.ok(result.visual.every(row=>row.capsule.preMax<=2&&row.capsule.alphaMax<=1&&row.final.preMax<=2&&row.final.alphaMax<=1));
  assert.ok(result.rejected.every(row=>row.reason&&row.allocations===0));assert.ok(result.releases.every(n=>n===0));
  assert.ok(result.performanceRows.every(row=>row.extraAllocations===0));assert.equal(result.objectRegistryCapability.implementation,'object-sampling-pilot/v2');assert.ok(result.objectRegistryCapability.conditions.includes('effective-grid-one'));assert.deepEqual(errors,[]);
  assert.ok(result.cpuPlayerRepeat.every(row=>row.preMax===0&&row.alphaMax===0));
  assert.ok(result.visual.some(row=>row.kind==='follow-mask'&&row.followMatrix[5]!==0),'follow mask must actually move');
  assert.ok(result.visual.filter(row=>row.kind==='timed').every(row=>row.evaluatedGrid===(row.time===5?4:3)&&row.evaluatedThreshold===(row.time===5?.8:.2)),'object timing must be evaluated before the GPU adapter');
}finally{await browser.close();}
