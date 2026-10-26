#!/usr/bin/env node
// Actual Player budget: source drawing, effect preparation and final Canvas output.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const photoData=`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`;
const browser=await chromium.launch({executablePath:edge,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1024,height:720}});
  await page.goto('about:blank');
  await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
  await page.addScriptTag({path:resolve(root,'tests/browser/fixtures/v4-gpu-player-fixture.js')});
  const canvasTransition=process.argv.includes('--canvas-transition');
  const profileApi=process.argv.includes('--profile-api');
  const gpuStages=process.argv.includes('--gpu-stages');
  const withThreshold=process.argv.includes('--with-threshold');
  const withNoise=process.argv.includes('--with-noise');
  const withTint=process.argv.includes('--with-tint'),withDispersion=process.argv.includes('--with-dispersion');
  if((withThreshold||withNoise||withTint||withDispersion)&&gpuStages)throw new Error('Multi-card stage query labels require a separate diagnostic; use whole-context timing');
  const frameEndValidation=process.argv.includes('--frame-end-validation');
  const fixedSurfaces=process.argv.includes('--fixed-surfaces'),traceSurfaces=fixedSurfaces||process.argv.includes('--trace-surfaces');
  const repetitions=Number((process.argv.find(x=>x.startsWith('--repetitions='))||'--repetitions=1').split('=')[1]);
  if(!Number.isInteger(repetitions)||repetitions<1||repetitions>4)throw new Error('Invalid repetitions');
  const reportTag=(process.argv.find(value=>value.startsWith('--report-tag='))||'').slice(13);
  if(reportTag&&!/^[a-z0-9-]+$/.test(reportTag))throw new Error('Invalid report tag');
  const profile=profileApi||gpuStages||process.argv.includes('--profile');
  const result=await page.evaluate(async ({photoData,canvasTransition,profile,profileApi,gpuStages,frameEndValidation,fixedSurfaces,traceSurfaces,repetitions,withThreshold,withNoise,withTint,withDispersion})=>{
    const rt=window.ToSampoolRuntimeVNext,contexts=[];
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){const result=original.call(this,type,...args);if(type==='webgl2'&&result)contexts.push(result);return result;};
    const photo=await new Promise((done,fail)=>{const image=new Image();image.onload=()=>done(image);image.onerror=fail;image.src=photoData;});
    const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.style.width='960px';c.style.height=`${h/w*960}px`;return c;};
    const percentile=(values,p)=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];};
    const summary=values=>values.length?{median:+percentile(values,.5).toFixed(2),p95:+percentile(values,.95).toFixed(2),max:+Math.max(...values).toFixed(2)}:null;
    const scene=(w,h,mode)=>window.createGpuPlayerFixture(photo,w,h,mode);
    const diff=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let rgb=0,alpha=0;for(let i=0;i<x.length;i+=4){rgb+=Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]);alpha+=Math.abs(x[i+3]-y[i+3]);}return{rgb:+(rgb/(a.width*a.height*3)).toFixed(4),alpha:+(alpha/(a.width*a.height)).toFixed(4)};};
    const rows=[],visual=[];let renderer=null;
    for(let repetition=0;repetition<repetitions;repetition++)for(const [w,h] of [[640,360],[1920,1080]])for(const mode of ['single','single-mask','dual-mask']) {
      const config=scene(w,h,mode),snapshots={};
      if(withThreshold)config.sceneEffects.sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.12,period:2},...(mode!=='single'?{mask:{type:'ellipse',x:w*.2,y:h*.1,w:w*.65,h:h*.75}}:{})};
      if(withNoise)config.sceneEffects.sample['noise-dither']={enabled:true,amount:31,size:1,colorMode:'rgb',seed:7,motion:{enabled:true,type:'noise-refresh',period:2,steps:12},...(mode!=='single'?{mask:{type:'ellipse',x:w*.1,y:h*.15,w:w*.7,h:h*.7}}:{})};
      if(withTint)config.sceneEffects.overlay={'tint-overlay':{enabled:true,color:'#d4657980',alpha:.35,blend:'screen',...(mode!=='single'?{mask:{type:'ellipse',x:w*.1,y:h*.1,w:w*.8,h:h*.8}}:{})}};
      if(withDispersion)config.sceneEffects.sample['edge-dispersion']={enabled:true,distance:2,angle:35,width:2,strength:.5,source:'auto',order:'bgr',...(mode!=='single'?{mask:{type:'ellipse',x:w*.15,y:h*.1,w:w*.7,h:h*.8}}:{})};
      for(const backend of (repetition%2?['gpu','cpu']:['cpu','gpu'])) {
        const player=rt.createRuntime(config),output=canvas(w,h);document.body.replaceChildren(output);
        const options=backend==='gpu'?{sceneBackend:'gpu-experimental',sceneGpuTransitions:!canvasTransition,sceneGpuValidation:frameEndValidation?'frame-end':'per-side',sceneSurfacePolicy:fixedSurfaces?'fixed-roles':'pool',sceneSurfaceTrace:traceSurfaces,sceneProfile:profile}:{sceneProfile:profile};
        const timeFor=frame=>(mode==='dual-mask'?4.05:.05)+frame/60;
        for(let i=0;i<8;i++)player.renderTo(output,timeFor(i),options);
        let gl=null,timer=null;
        if(backend==='gpu'){
          gl=contexts.at(-1);timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!timer)throw new Error('GPU timer query unavailable');
          const info=gl.getExtension('WEBGL_debug_renderer_info');renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        }
        const main=[],gaps=[],queries=[],phases={},apiPhases={},stageQueries=[],surfaceIds={};let previous=0,lastStats,apiTimes={},measuredFrame=0,drawIndex=0,uploadIndex=0,measuring=false,sourceTargetAliases=0;
        if(profileApi&&gl)for(const name of ['checkFramebufferStatus','getAttribLocation','getUniformLocation','drawArrays','getError','texSubImage2D']){const method=gl[name].bind(gl);gl[name]=(...args)=>{const start=performance.now();const result=method(...args);apiTimes[name]=(apiTimes[name]||0)+performance.now()-start;return result;};}
        if(gpuStages&&gl)for(const name of ['texSubImage2D','drawArrays']){
          const method=gl[name].bind(gl);
          gl[name]=(...args)=>{
            if(!measuring)return method(...args);
            let phase;
            if(name==='texSubImage2D')phase=mode==='single'?'lowUpload':['lowUpload','maskUpload','fullSourceUpload'][uploadIndex++%3];
            else{const draw=drawIndex++,perSide=mode==='single'?2:3;phase=mode==='dual-mask'&&draw===perSide*2?'transitionDraw':draw%perSide===0?'fieldDraw':mode!=='single'&&draw%perSide===1?'baseCopyDraw':'outputDraw';}
            const query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);
            try{return method(...args);}finally{gl.endQuery(timer.TIME_ELAPSED_EXT);stageQueries.push({query,phase,frame:measuredFrame});}
          };
        }
        const initialStats=player.getLastFrameStats(),initialAllocations=initialStats.sceneGpu?.allocations||0;
        for(let frame=8;frame<72;frame++){
          const now=await new Promise(requestAnimationFrame);if(previous)gaps.push(now-previous);previous=now;
          let query=null;if(gl&&!gpuStages){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);}
          apiTimes={};measuredFrame=frame;drawIndex=0;uploadIndex=0;
          const start=performance.now();measuring=true;try{lastStats=player.renderTo(output,timeFor(frame),options);}finally{measuring=false;}const elapsed=performance.now()-start;main.push(elapsed);
          if(profile){let accounted=0;for(const [name,value] of Object.entries(lastStats.sceneProfileMs||{})){(phases[name]||(phases[name]=[])).push(value);accounted+=value;}if(accounted>elapsed+.05)throw new Error('profile stages overlap');(phases.unaccounted||(phases.unaccounted=[])).push(Math.max(0,elapsed-accounted));}
          if(profileApi)for(const [name,value] of Object.entries(apiTimes))(apiPhases[name]||(apiPhases[name]=[])).push(value);
          if(traceSurfaces&&backend==='gpu'){
            for(const [prefix,trace] of [['incoming',lastStats.sceneSurfaceTrace],['outgoing',lastStats.transitionSurfaceTrace]])for(const [role,value] of Object.entries(trace||{}))if(value)(surfaceIds[`${prefix}.${role}`]||(surfaceIds[`${prefix}.${role}`]=new Set())).add(value.id);
            if(lastStats.transitionTargetTrace&&lastStats.sceneSurfaceTrace?.source?.id===lastStats.transitionTargetTrace.id)sourceTargetAliases++;
          }
          if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(query);}
        }
        const gpu=[],stageFrames={};let disjoint=false,error=0;
        if(gl){gl.finish();await new Promise(resolve=>setTimeout(resolve,60));disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT);for(const query of queries){if(!disjoint&&gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}
          for(const item of stageQueries){if(!disjoint&&gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE)){const value=gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6;const frames=stageFrames[item.phase]||(stageFrames[item.phase]=new Map());frames.set(item.frame,(frames.get(item.frame)||0)+value);}gl.deleteQuery(item.query);}error=gl.getError();
        }
        rows.push({size:`${w}x${h}`,mode,backend,mainThreadMs:summary(main),frameGapMs:summary(gaps),over25msPercent:+(gaps.filter(value=>value>25).length/gaps.length*100).toFixed(2),gpuContextQueryMs:summary(gpu),gpuSamples:gpu.length,disjoint,error,actualBackend:lastStats.sceneBackend,previousBackend:lastStats.transitionBackend||null,transitionCompositeBackend:lastStats.transitionCompositeBackend||null,contexts:lastStats.sceneGpu?.contexts||0,texturesAdded:(lastStats.sceneGpu?.allocations||0)-initialAllocations,gpuTextureMiB:+((lastStats.sceneGpu?.textureBytes||0)/1048576).toFixed(2),frameUploads:lastStats.frameGpuUploads,framePasses:lastStats.frameGpuPasses,backingWrites:lastStats.backingSizeWrites-initialStats.backingSizeWrites,previousSurfaceReuses:lastStats.transitionSurfaces?.reuses||0});
        rows.at(-1).repetition=repetition;
        if(traceSurfaces&&backend==='gpu')rows.at(-1).surfaceTrace={distinctIds:Object.fromEntries(Object.entries(surfaceIds).map(([role,ids])=>[role,[...ids]])),sourceTargetAliases,fixedRoleAllocationsAdded:(lastStats.surfaces.roleAllocations||0)-(initialStats.surfaces.roleAllocations||0),fixedRoleSurfaceCount:lastStats.surfaces.roleSurfaceCount||0,fixedRolePixels:lastStats.surfaces.rolePixels||0,previousRolePixels:lastStats.transitionSurfaces?.rolePixels||0};
        if(profile)rows.at(-1).phaseMs=Object.fromEntries(Object.entries(phases).map(([name,values])=>[name,summary(values)]));
        if(profileApi)rows.at(-1).nestedWebglApiMs=Object.fromEntries(Object.entries(apiPhases).map(([name,values])=>[name,summary(values)]));
        if(gpuStages&&gl){rows.at(-1).gpuStageMs=Object.fromEntries(Object.entries(stageFrames).map(([name,frames])=>[name,{...summary([...frames.values()]),frameSamples:frames.size}]));rows.at(-1).gpuStageQueryCount=stageQueries.length;}
        // Fixed-time visual readback is deliberately outside playback timing.
        player.renderTo(output,mode==='dual-mask'?4.4:.4,options);const copy=canvas(w,h);copy.getContext('2d').drawImage(output,0,0);snapshots[backend]=copy;
        player.dispose();
      }
      visual.push({repetition,size:`${w}x${h}`,mode,...diff(snapshots.cpu,snapshots.gpu)});
    }
    HTMLCanvasElement.prototype.getContext=original;return {renderer,framesPerCase:64,canvasTransition,profile,profileApi,gpuStages,frameEndValidation,fixedSurfaces,traceSurfaces,repetitions,withThreshold,withNoise,withTint,withDispersion,rows,visual};
  },{photoData,canvasTransition,profile,profileApi,gpuStages,frameEndValidation,fixedSurfaces,traceSurfaces,repetitions,withThreshold,withNoise,withTint,withDispersion});
  console.log(JSON.stringify(result,null,2));
  assert.ok(result.visual.every(row=>row.rgb<.3&&row.alpha<.05),'actual Player output changed');
  assert.ok(result.rows.every(row=>row.error===0&&!row.disjoint&&row.backingWrites===0&&row.texturesAdded===0));
  assert.ok(result.rows.filter(row=>row.backend==='gpu').every(row=>row.actualBackend==='gpu'&&row.contexts===1&&(gpuStages?Object.values(row.gpuStageMs).every(stage=>stage.frameSamples===64):row.gpuSamples>=56)));
  if(gpuStages)assert.ok(result.rows.filter(row=>row.backend==='gpu').every(row=>row.gpuStageQueryCount===64*(row.mode==='single'?3:row.mode==='single-mask'?6:canvasTransition?12:13)));
  const cards=1+Number(withThreshold)+Number(withNoise)+Number(withDispersion);
  assert.ok(result.rows.filter(row=>row.backend==='gpu'&&row.mode==='dual-mask').every(row=>row.previousBackend==='gpu'&&row.frameUploads===4+cards*2&&row.framePasses===2*(cards*4-1+(withTint?5:0))+(canvasTransition?0:1)&&row.transitionCompositeBackend===(canvasTransition?'cpu':'gpu')&&row.previousSurfaceReuses>0));
  if(profile)assert.ok(result.rows.every(row=>row.phaseMs.sourceDraw&&row.phaseMs.unaccounted));
  if(traceSurfaces)assert.ok(result.rows.filter(row=>row.backend==='gpu').every(row=>row.surfaceTrace.fixedRoleAllocationsAdded===0&&Object.values(row.surfaceTrace.distinctIds).every(ids=>ids.length>=1)));
  if(fixedSurfaces)assert.ok(result.rows.filter(row=>row.backend==='gpu').every(row=>row.surfaceTrace.sourceTargetAliases===0&&Object.values(row.surfaceTrace.distinctIds).every(ids=>ids.length===1)));
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-gpu-player-performance-${canvasTransition?'canvas-transition':'gpu-transition'}${gpuStages?'-gpu-stages':profileApi?'-profile-api':profile?'-profile':''}${frameEndValidation?'-frame-end':''}${fixedSurfaces?'-fixed-surfaces':traceSurfaces?'-surface-trace':''}${withThreshold?'-threshold-chain':''}${withNoise?'-noise':''}${withTint?'-tint':''}${withDispersion?'-dispersion':''}${reportTag?'-'+reportTag:''}-result.json`),JSON.stringify(result,null,2)+'\n');
} finally {await browser.close();}
