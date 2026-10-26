// Real editor, explicit object-only policy. Source generation/final composite stay Canvas.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const runtimeDigest=()=>createHash('sha256').update(readFileSync(resolve(root,'home-scene-vnext.js'))).digest('hex');
const runtimeSha256=runtimeDigest();
const reportTag=process.argv.find(arg=>arg.startsWith('--report-tag='))?.split('=')[1];if(reportTag&&!/^[a-z0-9-]+$/.test(reportTag))throw Error('Invalid report tag');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();window.__objectGpuTest={textures:new Set(),contexts:0,renderer:null};
    HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&__objectGpuTest.deny)return null;const gl=original.call(this,type,...args);if(type==='webgl2'&&gl&&!seen.has(gl)){
      seen.add(gl);__objectGpuTest.contexts++;__objectGpuTest.gl=gl;const info=gl.getExtension('WEBGL_debug_renderer_info');__objectGpuTest.renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
      const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);gl.createTexture=()=>{const t=create();__objectGpuTest.textures.add(t);return t;};gl.deleteTexture=t=>{__objectGpuTest.textures.delete(t);return remove(t);};
    }return gl;};
  });
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?object-gpu-pilot=1');
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  assert.equal(await page.locator('#preview-backend').inputValue(),'cpu');
  await page.selectOption('#preview-quality','full');
  await page.selectOption('#preview-backend','gpu-object-pilot');
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const ws=ToSampoolV4Workspace,view=classicV4View,backend=classicV4PreviewBackend,observations=[];
    window.classicV4PreviewBackend=Object.freeze({...backend,observeFrame(stats,timing){backend.observeFrame(stats,timing);observations.push({revision:ws.revision,stats,timing});}});
    const raf=()=>new Promise(r=>requestAnimationFrame(r)),drain=async()=>{await raf();await raf();};
    const source=document.createElement('canvas');source.width=640;source.height=360;const ctx=source.getContext('2d'),gradient=ctx.createLinearGradient(0,0,640,360);gradient.addColorStop(0,'#163959');gradient.addColorStop(.5,'#dc813c');gradient.addColorStop(1,'#fff5cd80');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(320,180,310,170,0,0,Math.PI*2);ctx.fill();const locator=source.toDataURL();
    function fixture(){const s=EditorVNextScene.blank({width:1000,height:650,loop:4});s.background={color:'#71859a',alpha:.6};s.assets={source:{locator}};s.entities=[{id:'large',type:'image',assetId:'source',x:60,y:60,w:640,h:360,alpha:.7,effects:{pipeline:['mask','decorate','sample'],sample:{controllers:{'sampling-grid':{size:1}},threshold:{enabled:true,threshold:.5,dark:'#182536',light:'#f8d29a',motion:{enabled:true,amount:.12,period:2,steps:12}}}}}];return s;}
    const pixels=c=>{const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const cctx=copy.getContext('2d',{willReadFrequently:true});cctx.drawImage(c,0,0);return cctx.getImageData(0,0,c.width,c.height).data;};
    const diff=(a,b)=>{let preMax=0,alphaMax=0;for(let i=0;i<a.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(a[i+c]*a[i+3]/255)-Math.round(b[i+c]*b[i+3]/255)));}return {preMax,alphaMax};};
    async function compare(){const p=EditorVNextRuntimeAdapter.create(ws.current(),await ws.runtimeAssets()),c=document.createElement('canvas');try{p.renderTo(c,state.t,{sceneBackend:'cpu'});return diff(pixels(c),pixels(view.canvas));}finally{p.dispose();}}
    async function render(){await view.render();await drain();return observations.at(-1);}
    async function install(s){const start=observations.length;ws.replace(s);const revision=ws.revision;state.t=.2;await render();return observations.slice(start).find(v=>v.revision===revision);}
    const visual=[];
    function samplingFixture(kind){const doc=fixture(),sample=doc.entities[0].effects.sample;delete sample.threshold;
      if(kind.includes('noise')||kind.endsWith('chain'))sample['noise-dither']={enabled:true,amount:35,size:1,seed:17,colorMode:kind==='noise-mono'?'mono':'rgb',motion:{enabled:true,type:'noise-refresh',period:2,steps:8}};
      if(kind.includes('dispersion')||kind.endsWith('chain'))sample['edge-dispersion']={enabled:true,distance:4,width:2,strength:.65,angle:25,source:kind==='dispersion-contour'?'contour':kind==='dispersion-contrast'?'contrast':'all',order:'rgb'};
      if(kind.includes('threshold')||kind.endsWith('chain'))sample.threshold=fixture().entities[0].effects.sample.threshold;
      if(kind==='decorated-chain'){doc.entities[0].effects.pipeline=['decorate','mask','sample'];doc.entities[0].effects.decorate={projection:{enabled:true,color:'#173359',distance:9,alpha:.6,angle:30},outline:{enabled:true,color:'#ffc883',width:4,alpha:.7}};doc.entities[0].effects.mask={type:'ellipse',x:40,y:40,w:680,h:400};}
      return doc;
    }
    const samplingVisual=[];
    const signature=c=>{const bytes=pixels(c);let value=2166136261;for(let i=0;i<bytes.length;i++)value=Math.imul(value^bytes[i],16777619);return value>>>0;};
    for(const kind of ['noise-mono','noise-rgb','dispersion-all','dispersion-contour','dispersion-contrast','noise-threshold','noise-dispersion','threshold-dispersion','chain','decorated-chain']){
      const doc=samplingFixture(kind);await install(doc);
      for(const t of [.2,.8,.2]){state.t=t;await render();samplingVisual.push({kind,t,signature:signature(view.canvas),...await compare(),object:observations.at(-1).stats.objectGpu});}
    }
    const timedSampling=samplingFixture('chain');timedSampling.timeline.tracks={
      'effect:object:large:noise-dither':{segments:[{f:[0,.5],values:{amount:0,size:1,seed:17}},{f:[.5,1],values:{amount:85,size:3,seed:-17}}]},
      'effect:object:large:edge-dispersion':{segments:[{f:[0,.5],values:{distance:0,strength:0}},{f:[.5,1],values:{distance:7,angle:125,strength:.8}}]}
    };await install(timedSampling);for(const t of [.2,2.4,.2]){state.t=t;await render();samplingVisual.push({kind:'step-chain',t,signature:signature(view.canvas),...await compare(),object:observations.at(-1).stats.objectGpu});}
    await install(fixture());visual.push({kind:'base',...await compare(),scene:observations.at(-1).stats.sceneBackend,object:observations.at(-1).stats.objectGpu});
    const decorated=fixture(),a=decorated.entities[0];a.parts=[{id:'outside',type:'ellipse',x:-24,y:45,w:60,h:90,fill:'#fa8358'}];a.effects.decorate={projection:{enabled:true,color:'#173359',distance:9,alpha:.6,angle:30},outline:{enabled:true,color:'#ffc883',width:4,alpha:.7}};a.effects.mask={type:'ellipse',x:40,y:40,w:680,h:400};
    await install(decorated);
    backend.setPolicy('cpu');await render();const cpuPrefixImage=pixels(view.canvas),cpuPrefixFresh=await compare();
    backend.setPolicy('gpu-object-pilot');await render();const prefixControl={cpuFreshVsSteady:cpuPrefixFresh,pilotVsCpuSteady:diff(cpuPrefixImage,pixels(view.canvas)),object:observations.at(-1).stats.objectGpu};
    const prefixVisual=[];
    for(const kind of ['projection','outline','combined','include-projection','wide-outline','decorate-before-mask','transparent-parent','screen-blend','transformed']){
      const doc=JSON.parse(JSON.stringify(decorated)),owner=doc.entities[0];
      if(kind==='projection')delete owner.effects.decorate.outline;
      if(kind==='outline')delete owner.effects.decorate.projection;
      if(kind==='include-projection')owner.effects.decorate.outline.includeProjection=true;
      if(kind==='wide-outline')owner.effects.decorate.outline.width=16;
      if(kind==='decorate-before-mask')owner.effects.pipeline=['decorate','mask','sample'];
      if(kind==='transparent-parent'){doc.entities.unshift({id:'parent',type:'group',x:10,y:10,w:800,h:500,alpha:.4});owner.parentId='parent';owner.alpha=.3;}
      if(kind==='screen-blend'){owner.blend='screen';owner.effects.decorate.projection.blend='multiply';owner.effects.decorate.outline.blend='screen';}
      if(kind==='transformed'){owner.rot=17;owner.skewX=9;owner.skewY=-6;}
      await install(doc);for(const t of [.2,1.2,.2]){state.t=t;await render();prefixVisual.push({kind,t,...await compare(),object:observations.at(-1).stats.objectGpu});}
    }
    const maskParts=fixture();maskParts.entities[0].parts=a.parts;maskParts.entities[0].effects.mask=a.effects.mask;
    await install(maskParts);visual.push({kind:'parts-mask',...await compare(),object:observations.at(-1).stats.objectGpu});
    const timed=fixture();timed.entities.unshift({id:'parent',type:'group',x:20,y:10,w:800,h:500,alpha:.65});timed.entities[1].parentId='parent';timed.entities[1].blend='multiply';timed.entities[1].effects.decorate=a.effects.decorate;
    timed.timeline.tracks={large:{segments:[{f:[0,.25],values:{x:60,rot:0}},{f:[.25,.75],type:'linear'},{f:[.75,1],values:{x:100,rot:12}}]},'effect:object:large:threshold':{segments:[{f:[0,.5],values:{threshold:.3,'motion.enabled':false}},{f:[.5,1],values:{threshold:.7,'motion.enabled':false}}]}};
    timed.timeline.tracks['effect:object:large:projection']={segments:[{f:[0,.5],values:{distance:5,angle:30,alpha:.25}},{f:[.5,1],values:{distance:12,angle:115,alpha:.8}}]};
    await install(timed);
    for(const t of [.3,1.8,3.5,.3]){state.t=t;await render();const frame=ToSampoolRuntimeVNext.modules.frame.create(ws.current(),t),owner=ws.current().entities.find(e=>e.id==='large');visual.push({kind:'step-linear-seek',t,...await compare(),evaluatedX:frame.valuesFor(owner).x,evaluatedRot:frame.valuesFor(owner).rot,object:observations.at(-1).stats.objectGpu});}
    const multi=fixture(),second=JSON.parse(JSON.stringify(multi.entities[0]));second.id='second';second.x=310;second.y=270;second.w=500;second.h=300;multi.entities.push(second);await install(multi);const frameBudget={...await compare(),object:observations.at(-1).stats.objectGpu};
    const rejected=[];
    for(const kind of ['grid','chain','order','small','large','transition','decorate','formation']){const s=fixture(),owner=s.entities[0];if(kind==='grid')owner.effects.sample.controllers['sampling-grid'].size=3;if(kind==='chain')owner.effects.sample['color-map']={enabled:true,count:16};if(kind==='order'){owner.effects.pipeline=['sample','mask','decorate'];owner.effects.mask={type:'ellipse',x:100,y:80,w:350,h:200};}if(kind==='small'){owner.w=64;owner.h=64;}if(kind==='large'){owner.w=1500;owner.h=900;}if(kind==='transition')s.timeline.scenes=[{f:[0,.5]},{f:[.5,1],transition:{type:'wipe',duration:.4}}];if(kind==='decorate')owner.effects.decorate={'inner-light':{enabled:true,size:5,layers:2,color:'#ffffff',alpha:.5}};if(kind==='formation')owner.effects.formation={'color-grade':{enabled:true,hue:15}};await install(s);rejected.push({kind,...await compare(),object:observations.at(-1).stats.objectGpu,live:__objectGpuTest.textures.size});}
    await install(decorated);const contexts=__objectGpuTest.contexts;
    classicV4Changes.run('对象试点位移',s=>{s.entities[0].x=100;});await render();const edited={...await compare(),newContexts:__objectGpuTest.contexts-contexts};
    classicV4Changes.undo();const undoReleased=__objectGpuTest.textures.size;await render();const undo=await compare();classicV4Changes.redo();const redoReleased=__objectGpuTest.textures.size;await render();const redo=await compare();
    const gl=__objectGpuTest.gl,draw=gl.drawArrays;gl.drawArrays=()=>{throw Error('injected-object-draw');};let drawFailure;try{await render();drawFailure={...await compare(),object:observations.at(-1).stats.objectGpu,live:__objectGpuTest.textures.size};}finally{gl.drawArrays=draw;}
    ws.releasePlayer();await render();const lossGl=__objectGpuTest.gl;await new Promise(r=>{lossGl.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();r();},{once:true});lossGl.getExtension('WEBGL_lose_context').loseContext();});await render();const contextLoss={...await compare(),object:observations.at(-1).stats.objectGpu};
    ws.releasePlayer();__objectGpuTest.deny=true;await render();const unavailable={...await compare(),object:observations.at(-1).stats.objectGpu};__objectGpuTest.deny=false;ws.releasePlayer();
    await install(samplingFixture('chain'));const chainGl=__objectGpuTest.gl,chainDraw=chainGl.drawArrays;let calls=0,chainFailure;chainGl.drawArrays=function(...args){if(++calls===4)throw Error('injected-object-chain-draw');return chainDraw.apply(this,args);};try{await render();chainFailure={...await compare(),calls,object:observations.at(-1).stats.objectGpu,live:__objectGpuTest.textures.size};}finally{chainGl.drawArrays=chainDraw;ws.releasePlayer();}
    const performanceRows=[];
    for(const kind of ['base','decorated','noise-rgb','dispersion-all','chain'])for(const policy of ['cpu','gpu-object-pilot']){backend.setPolicy(policy);const first=await install(kind==='base'?fixture():kind==='decorated'?decorated:samplingFixture(kind)),initial={...first.timing,objectInitialized:!!first.stats.objectGpu?.initialized},raw=[];for(let i=0;i<28;i++){state.t=.2+i/30;const sample=await render();if(i>=4)raw.push({...sample.timing,objectInitialized:!!sample.stats.objectGpu?.initialized});}const rows=raw.map(v=>v.runtimeCallMs).sort((a,b)=>a-b),p95=key=>raw.map(v=>v[key]).sort((a,b)=>a-b)[22];performanceRows.push({kind,policy,samples:rows.length,warmup:4,initial,p50:rows[11],p95:rows[22],max:rows.at(-1),editorP95:p95('editorRenderMs'),playerPrepareP95:p95('playerPrepareMs'),raw,stats:observations.at(-1).stats.objectGpu||null,...await compare()});ws.releasePlayer();}
    backend.setPolicy('cpu');window.classicV4PreviewBackend=backend;ws.releasePlayer();
    return {visual,samplingVisual,prefixControl,prefixVisual,frameBudget,rejected,edited,undoReleased,redoReleased,undo,redo,drawFailure,chainFailure,contextLoss,unavailable,performanceRows,liveTextures:__objectGpuTest.textures.size,renderer:__objectGpuTest.renderer};
  });
  assert.equal(runtimeDigest(),runtimeSha256,'Runtime changed during browser acceptance; rerun against a stable build');
  const report={date:'2026-10-25',browser:browser.version(),os:process.platform,headless:true,viewport:[1600,1000],runtimeSha256,runtimeStableDuringRun:true,method:'Real editor transactions/view/workspace; full quality; 4 warmup + 24 samples; Runtime synchronous time, not device GPU time',errors,...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-editor-object-gpu-pilot-2026-10-25${reportTag?'-'+reportTag:''}-result.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  for(const row of [...result.visual,...result.samplingVisual,...result.prefixVisual,result.frameBudget,...result.rejected,result.edited,result.undo,result.redo,result.drawFailure,result.chainFailure,result.contextLoss,result.unavailable,...result.performanceRows])assert.ok(row.preMax<=2&&row.alphaMax<=1,JSON.stringify(row));
  assert.equal(result.samplingVisual.length,33);assert.ok(result.samplingVisual.every(row=>row.object.handled===1));
  for(const kind of ['noise-mono','noise-rgb','chain','step-chain']){const rows=result.samplingVisual.filter(row=>row.kind===kind);assert.notEqual(rows[0].signature,rows[1].signature,kind+' must change');assert.equal(rows[0].signature,rows[2].signature,kind+' seek must repeat');}
  assert.equal(result.chainFailure.calls,4);assert.equal(result.chainFailure.live,0);assert.equal(result.chainFailure.object.rows[0].reason,'injected-object-chain-draw');
  assert.ok(result.visual.every(row=>row.object.handled===1));assert.equal(result.visual[0].scene,'cpu');
  assert.equal(result.prefixControl.object.handled,1);assert.ok(result.prefixControl.pilotVsCpuSteady.preMax<=2&&result.prefixControl.pilotVsCpuSteady.alphaMax<=1);
  assert.equal(result.prefixVisual.length,27);assert.ok(result.prefixVisual.every(row=>row.object.handled===1));
  assert.deepEqual(result.prefixControl.cpuFreshVsSteady,{preMax:0,alphaMax:0},'CPU decorate prefix must be stable between a fresh Player and persistent editor');
  assert.ok(result.visual.some(row=>row.kind==='step-linear-seek'&&row.evaluatedRot>0&&row.evaluatedRot<12));
  assert.equal(result.frameBudget.object.handled,1);assert.ok(result.frameBudget.object.rows.some(row=>row.reason==='object-frame-budget-used'));
  assert.ok(result.rejected.every(row=>row.object.handled===0&&row.live===0));assert.equal(result.edited.newContexts,0);assert.equal(result.undoReleased,0);assert.equal(result.redoReleased,0);
  assert.equal(result.drawFailure.live,0);assert.equal(result.drawFailure.object.rows[0].reason,'injected-object-draw');assert.equal(result.contextLoss.object.rows[0].reason,'webgl-context-lost');assert.equal(result.unavailable.object.rows[0].reason,'webgl2-unavailable');
  assert.equal(result.liveTextures,0);assert.deepEqual(errors,[]);
  for(const row of result.performanceRows.filter(v=>v.policy==='gpu-object-pilot')){assert.ok(row.initial.objectInitialized);assert.ok(row.raw.every(v=>!v.objectInitialized));assert.equal(row.stats.handled,1);}
}finally{await browser.close();}
