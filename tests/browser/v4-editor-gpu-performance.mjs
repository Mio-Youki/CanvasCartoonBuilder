#!/usr/bin/env node
// Real view + workspace + source decoding + diagnostics. Not a Player-only bench.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const quick=process.argv.includes('--quick');
const diagnostic=process.argv.includes('--diagnose');
const directReadback=process.argv.includes('--direct-readback');
const grid=Number((process.argv.find(arg=>arg.startsWith('--grid='))||'--grid=3').split('=')[1]);
const diagnosticCase=(process.argv.find(arg=>arg.startsWith('--case='))||'--case=threshold').split('=')[1];
const diagnosticSize=Number((process.argv.find(arg=>arg.startsWith('--size='))||'--size=640').split('=')[1]);
const reportTag=(process.argv.find(arg=>arg.startsWith('--report-tag='))||'--report-tag=').split('=')[1];
if(reportTag&&!/^[a-z0-9-]+$/.test(reportTag))throw Error('Invalid report tag');
if(!['threshold','chain','chain-mask','none'].includes(diagnosticCase)||![640,1280,1920].includes(diagnosticSize))throw Error('Invalid diagnostic case/size');
if(!Number.isInteger(grid)||grid<1||grid>16)throw Error('Invalid diagnostic grid');
const samples=quick?16:32,warmup=quick?4:8;
const sizes=diagnostic?[[diagnosticSize,diagnosticSize*9/16]]:quick?[[640,360]]:[[640,360],[1280,720],[1920,1080]];
const photoPath=resolve(root,'examples/assets/karsten.jpg');
const bytes=readFileSync(photoPath),photo='data:image/jpeg;base64,'+bytes.toString('base64');
const hash=path=>createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
const executablePath=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?editor-gpu-performance=1');
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  await page.selectOption('#preview-quality','full');
  const result=await page.evaluate(async({photo,sizes,samples,warmup,quick,diagnostic,diagnosticCase,grid,directReadback})=>{
    if(state.playing)togglePlay();
    const ws=ToSampoolV4Workspace,view=classicV4View,originalBackend=classicV4PreviewBackend;
    let observation=null,renderer=null,extensions=null,sourcePaintStates=new Set();
    if(diagnostic)for(const prototype of [CanvasRenderingContext2D.prototype,OffscreenCanvasRenderingContext2D.prototype]){
      const draw=prototype.drawImage;
      prototype.drawImage=function(...args){if(args[0] instanceof HTMLImageElement){const m=this.getTransform();sourcePaintStates.add(JSON.stringify({smoothing:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality,alpha:this.globalAlpha,matrix:[m.a,m.b,m.c,m.d,m.e,m.f]}));}return draw.apply(this,args);};
    }
    window.classicV4PreviewBackend=Object.freeze({...originalBackend,observeFrame(stats,timing){originalBackend.observeFrame(stats,timing);observation={stats,timing};}});
    const textureSet=new Set(),contexts=new WeakSet(),getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      const value=getContext.call(this,type,...args);
      if(type==='webgl2'&&value&&!contexts.has(value)){
        contexts.add(value);const info=value.getExtension('WEBGL_debug_renderer_info');
        renderer=info?value.getParameter(info.UNMASKED_RENDERER_WEBGL):value.getParameter(value.RENDERER);
        extensions={timerQuery:!!value.getExtension('EXT_disjoint_timer_query_webgl2')};
        const create=value.createTexture.bind(value),remove=value.deleteTexture.bind(value);
        value.createTexture=()=>{const t=create();if(t)textureSet.add(t);return t;};
        value.deleteTexture=t=>{textureSet.delete(t);return remove(t);};
      }
      return value;
    };
    const raf=()=>new Promise(resolve=>requestAnimationFrame(timestamp=>resolve({timestamp,arrival:performance.now()})));
    const summarize=values=>{
      if(!values.length)return null;
      const sorted=values.slice().sort((a,b)=>a-b),at=p=>sorted[Math.ceil(sorted.length*p)-1];
      return{samples:values.length,p50:at(.5),p95:at(.95),max:sorted.at(-1)};
    };
    const pixels=()=>{
      if(directReadback)return view.canvas.getContext('2d').getImageData(0,0,view.canvas.width,view.canvas.height).data;
      // Reading the persistent product Canvas repeatedly can change Chromium's
      // backing strategy. Keep inspection readback on a separate snapshot.
      const copy=document.createElement('canvas');copy.width=view.canvas.width;copy.height=view.canvas.height;
      const ctx=copy.getContext('2d',{willReadFrequently:true});ctx.drawImage(view.canvas,0,0);
      return ctx.getImageData(0,0,copy.width,copy.height).data;
    };
    function compare(a,b,w){
      let preMax=0,alphaMax=0,large=0;const first=[];
      for(let i=0;i<a.length;i+=4){
        alphaMax=Math.max(alphaMax,Math.abs(a[i+3]-b[i+3]));
        for(let c=0;c<3;c++){
          const d=Math.abs(Math.round(a[i+c]*a[i+3]/255)-Math.round(b[i+c]*b[i+3]/255));
          preMax=Math.max(preMax,d);if(d>2){large++;if(first.length<8)first.push({x:(i/4)%w,y:Math.floor(i/4/w),channel:c,cpu:Array.from(a.slice(i,i+4)),gpu:Array.from(b.slice(i,i+4))});}
        }
      }
      return{preMax,alphaMax,channelsOver2:large,first};
    }
    function fixture(w,h,mode,dynamic){
      const scene=EditorVNextScene.blank({width:w,height:h,loop:8});scene.background.alpha=.4;
      scene.assets={photo:{locator:photo}};
      scene.entities=[{id:'photo',type:'image',assetId:'photo',x:0,y:0,w,h,alpha:.85},
        {id:'shape',type:'ellipse',x:w*.15,y:h*.2,w:w*.25,h:h*.35,fill:'#f09638',alpha:.55}];
      if(dynamic)scene.entities[0].anim={bob:{amount:5,period:2,angle:0}};
      if(mode==='none')return scene;
      const sample=scene.sceneEffects.sample;sample.controllers={'sampling-grid':{size:grid}};
      sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3',motion:{enabled:dynamic,amount:.12,period:2,steps:24}};
      if(mode==='threshold')return scene;
      scene.sceneEffects.overlay['tint-overlay']={enabled:true,color:'#d4657980',alpha:.35,blend:'screen',motion:{enabled:dynamic,type:'fade',amount:.15,period:3}};
      sample['noise-dither']={enabled:true,amount:31,size:1,colorMode:'rgb',seed:7,motion:{enabled:dynamic,type:'noise-refresh',period:2,steps:12}};
      sample['uneven-sampling']={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:'wave',scale:63,contrast:.8,seed:5},motion:{enabled:dynamic,type:'uneven-motion',period:3,steps:24,flowSpeed:1,tideAmount:.2}};
      sample['edge-dispersion']={enabled:true,distance:2,angle:35,width:2,strength:.5,source:'auto',order:'bgr'};
      if(mode==='chain-mask')for(const effect of [...Object.values(scene.sceneEffects.overlay),...Object.entries(sample).filter(([id])=>id!=='controllers').map(([,value])=>value)])effect.mask={type:'ellipse',x:w*.1,y:h*.1,w:w*.8,h:h*.8};
      return scene;
    }
    async function install(scene,backend){
      originalBackend.setPolicy(backend);observation=null;ws.replace(scene);
      await view.render();
      if(!observation)await view.render();
      if(!observation)throw Error('Missing initial editor observation');
      const initial={...observation.timing,backend:observation.stats.sceneBackend,initialized:!!observation.stats.sceneGpu?.initialized};
      // Drain the replacement's already queued editor redraw before sampling.
      await raf();await raf();
      return initial;
    }
    async function run(w,h,mode,dynamic,backend){
      sourcePaintStates=new Set();
      state.t=.25;
      const initial=await install(fixture(w,h,mode,dynamic),backend);
      const time=i=>dynamic?.25+i/24:.75;
      for(let i=0;i<warmup;i++){state.t=time(i);await view.render();}
      const rows=[],gaps=[],timestamps=[],coldInitializations=[];let previous=null,initialAllocations=null;
      for(let i=0;i<samples;i++){
        const tick=await raf();if(previous){gaps.push(tick.arrival-previous.arrival);timestamps.push(tick.timestamp-previous.timestamp);}previous=tick;
        state.t=time(warmup+i);observation=null;const began=performance.now();await view.render();const ended=performance.now();
        if(!observation)throw Error('Editor render was superseded during isolated benchmark');
        const {stats,timing}=observation;
        if(stats.previewPixelDivMultiplier!==1)throw Error('Full quality must keep divisor 1');
        if(initialAllocations===null)initialAllocations=stats.sceneGpu?.allocations||0;
        if(timing.playerCreated||stats.sceneGpu?.initialized)coldInitializations.push(i);
        rows.push({editor:timing.editorRenderMs,runtime:timing.runtimeCallMs,prepare:timing.playerPrepareMs,outer:ended-began});
      }
      const last=observation.stats;
      state.t=.9;await view.render();const output=new Uint8ClampedArray(pixels());
      const record={size:[w,h],mode,dynamic,requested:backend,actual:last.sceneBackend,reason:last.sceneGpu?.reason||null,initial,warmup,samples,
        editorRenderMs:summarize(rows.map(v=>v.editor)),runtimeCallMs:summarize(rows.map(v=>v.runtime)),prepareMs:summarize(rows.map(v=>v.prepare)),outerViewCallMs:summarize(rows.map(v=>v.outer)),actualRafArrivalGapMs:summarize(gaps),rafTimestampGapMs:summarize(timestamps),
        deviceGpuMs:null,deviceTiming:'not-collected',initializationsDuringSamples:coldInitializations,extraTextureAllocations:(last.sceneGpu?.allocations||0)-initialAllocations,
        uploads:last.frameGpuUploads||0,passes:last.frameGpuPasses||0,textureBytes:last.sceneGpu?.textureBytes||0,workPixels:last.workPixels||0,pixelPasses:last.pixelPasses||0,sourcePaintStates:[...sourcePaintStates].map(JSON.parse),fixedTime:observation.stats.time,raw:rows};
      ws.releasePlayer();record.liveTexturesAfterRelease=textureSet.size;
      return{record,output};
    }
    const rows=[],visual=[];
    for(const [w,h] of sizes)for(const mode of (diagnostic?[diagnosticCase]:['none','threshold','chain','chain-mask']))for(const dynamic of (diagnostic?[false]:[false,true])){
      const pair={};
      // Alternate backend order so all GPU measurements do not follow CPU.
      const order=(mode==='threshold'||mode==='chain-mask')?['gpu-experimental','cpu']:['cpu','gpu-experimental'];
      for(const backend of order){const result=await run(w,h,mode,dynamic,backend);pair[backend]=result.output;rows.push(result.record);}
      visual.push({size:[w,h],mode,dynamic,...compare(pair.cpu,pair['gpu-experimental'],w)});
    }
    // Native scheduling is measured separately, never labelled as throughput.
    const scheduling=[];
    for(const backend of (diagnostic?[]:['cpu','gpu-experimental'])){
      state.t=.25;await install(fixture(1280,720,'chain',true),backend);
      for(let i=0;i<4;i++)await view.render();
      const captured=[],proxy=window.classicV4PreviewBackend;
      window.classicV4PreviewBackend=Object.freeze({...proxy,observeFrame(stats,timing){proxy.observeFrame(stats,timing);captured.push({at:performance.now(),runtime:timing.runtimeCallMs,editor:timing.editorRenderMs,backend:stats.sceneBackend});}});
      const start=performance.now();togglePlay();await new Promise(resolve=>setTimeout(resolve,quick?1000:2500));if(state.playing)togglePlay();
      await raf();await raf();window.classicV4PreviewBackend=proxy;
      scheduling.push({requested:backend,durationMs:performance.now()-start,frames:captured.length,targetFps:classicV4View.performance().quality.targetFps,actualBackend:captured.at(-1)?.backend||null,renderArrivalGapMs:summarize(captured.slice(1).map((v,i)=>v.at-captured[i].at)),runtimeCallMs:summarize(captured.map(v=>v.runtime)),editorRenderMs:summarize(captured.map(v=>v.editor))});
      ws.releasePlayer();
    }
    originalBackend.setPolicy('cpu');
    return{renderer,extensions,rows,visual,scheduling,liveTexturesAtEnd:textureSet.size,policy:'full; no source version cache; default Canvas final transitions',forcedMode:'paused direct editor view.render, one request per RAF; not native playback FPS'};
  },{photo,sizes,samples,warmup,quick,diagnostic,diagnosticCase,grid,directReadback});
  if(diagnostic)console.log(JSON.stringify({sourcePaint:result.rows.map(row=>({backend:row.requested,time:row.fixedTime,states:row.sourcePaintStates})),visual:result.visual},null,2));
  // Preserve failed evidence too. A report file does not imply a passed gate.
  const report={date:'2026-10-24',quick,environment:{browser:browser.version(),os:process.platform,viewport:[1600,1000],deviceScaleFactor:1,headless:true,renderer:result.renderer},source:{photo:'examples/assets/karsten.jpg',photoSha256:createHash('sha256').update(bytes).digest('hex'),runtimeSha256:hash('home-scene-vnext.js'),viewSha256:hash('editor/classic-v4-view-controller.js')},method:{samples,warmup,grid,diagnostic,diagnosticCase,visualReadback:directReadback?'persistent-canvas':'isolated-copy',deviceTiming:'not-collected; GPU submission is not GPU execution',singleRun:true},gates:{visual:result.visual.every(v=>v.preMax<=2&&v.alphaMax<=1&&v.channelsOver2===0),resources:result.rows.every(row=>row.liveTexturesAfterRelease===0&&row.extraTextureAllocations===0)&&result.liveTexturesAtEnd===0,pageErrors:errors.length===0},errors,limitations:['Non-divisible Canvas nearest-neighbor rounding remains a known visual blocker; aligned-grid results are not general acceptance.'],...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-editor-gpu-performance-2026-10-24-grid${grid}${diagnostic?'-'+diagnosticCase+'-'+diagnosticSize:''}${quick?'-quick':''}${reportTag?'-'+reportTag:''}-result.json`),JSON.stringify(report,null,2)+'\n');
  for(const row of result.rows){
    assert.equal(row.actual,row.mode==='none'?'cpu':row.requested==='cpu'?'cpu':'gpu',JSON.stringify(row));
    assert.equal(row.liveTexturesAfterRelease,0);assert.equal(row.extraTextureAllocations,0);assert.deepEqual(row.initializationsDuringSamples,[]);
    assert.equal(row.samples,samples);if(row.actual==='gpu')assert.ok(row.uploads>0,'no source-version cache: static rows must upload too');
  }
  assert.ok(result.visual.every(v=>v.preMax<=2&&v.alphaMax<=1&&v.channelsOver2===0),JSON.stringify(result.visual));
  assert.ok(result.scheduling.every(v=>v.frames>0&&v.actualBackend===(v.requested==='cpu'?'cpu':'gpu')));
  assert.equal(result.liveTexturesAtEnd,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({environment:report.environment,grid,rows:result.rows.map(row=>({size:row.size,mode:row.mode,dynamic:row.dynamic,requested:row.requested,actual:row.actual,editorP95:row.editorRenderMs.p95,runtimeP95:row.runtimeCallMs.p95,initCallMs:row.initial.runtimeCallMs,textureMiB:row.textureBytes/1048576})),visual:result.visual,scheduling:result.scheduling,liveTexturesAtEnd:result.liveTexturesAtEnd},null,2));
}finally{await browser.close();}
