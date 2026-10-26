// Actual editor transaction/view path. Compare cold device rebuild vs session reuse.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const reportTag=process.argv.find(arg=>arg.startsWith('--report-tag='))?.split('=')[1];
if(reportTag&&!/^[a-z0-9-]+$/.test(reportTag))throw Error('Invalid report tag');
const runtimeSha256=createHash('sha256').update(readFileSync(resolve(root,'home-scene-vnext.js'))).digest('hex');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet(),textures=new Set();
    window.__gpuEdits={textures,contexts:0,renderer:null};
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      const gl=original.call(this,type,...args);
      if(type==='webgl2'&&gl&&!seen.has(gl)){
        seen.add(gl);__gpuEdits.contexts++;
        const info=gl.getExtension('WEBGL_debug_renderer_info');__gpuEdits.renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
        const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
        gl.createTexture=()=>{const t=create();textures.add(t);return t;};gl.deleteTexture=t=>{textures.delete(t);return remove(t);};
      }
      return gl;
    };
  });
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-edit-reuse=1');
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  await page.selectOption('#preview-quality','full');
  await page.selectOption('#preview-backend','gpu-experimental');
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const ws=ToSampoolV4Workspace,view=classicV4View,backend=classicV4PreviewBackend,observations=[];
    window.classicV4PreviewBackend=Object.freeze({...backend,observeFrame(stats,timing){backend.observeFrame(stats,timing);observations.push({revision:ws.revision,stats,timing});}});
    const raf=()=>new Promise(r=>requestAnimationFrame(r)),drain=async()=>{await raf();await raf();};
    const snapshot=c=>{const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const difference=(a,b)=>{let preMax=0,alphaMax=0;for(let i=0;i<a.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(a[i+c]*a[i+3]/255)-Math.round(b[i+c]*b[i+3]/255)));}return {preMax,alphaMax};};
    const fixture=()=>{
      const s=EditorVNextScene.blank({width:640,height:360,loop:4});s.background.alpha=0;
      s.entities=[{id:'shape',type:'ellipse',x:50,y:30,w:430,h:250,fill:'#fa8630',alpha:.73},{id:'rect',type:'rect',x:140,y:80,w:200,h:150,fill:'#25758a',alpha:.6}];
      s.sceneEffects.sample={controllers:{'sampling-grid':{size:3}},threshold:{enabled:true,threshold:.5,dark:'#17283c',light:'#f9dab0'}};
      return s;
    };
    async function compareCpu(){
      const player=EditorVNextRuntimeAdapter.create(ws.current(),await ws.runtimeAssets()),expected=document.createElement('canvas');
      try{player.renderTo(expected,state.t,{sceneBackend:'cpu'});return difference(snapshot(expected),snapshot(view.canvas));}finally{player.dispose();}
    }
    const rows=[];
    for(const mode of ['forced-rebuild','session-reuse']){
      ws.replace(fixture());state.t=.9;await view.render();await drain();
      const startContexts=__gpuEdits.contexts,samples=[],visual=[];
      for(let i=0;i<16;i++){
        if(mode==='forced-rebuild')ws.releasePlayer();
        const start=observations.length;
        classicV4Changes.run('GPU编辑复用夹具',s=>{
          s.entities[0].x=40+i*3;
          // Change evaluated effect parameters too, not merely source positions.
          if(i%2)s.sceneEffects.sample.threshold.threshold=.25+(i%4)*.12;
        });
        const revision=ws.revision;await view.render();await drain();
        const observed=observations.slice(start).find(row=>row.revision===revision);
        if(!observed)throw Error('Missing editor revision observation');
        samples.push({runtimeMs:observed.timing.runtimeCallMs,prepareMs:observed.timing.playerPrepareMs,editorMs:observed.timing.editorRenderMs,playerCreated:observed.timing.playerCreated,initialized:!!observed.stats.sceneGpu?.initialized,allocations:observed.stats.sceneGpu?.allocations,backend:observed.stats.sceneBackend,calibrationMs:observed.stats.sceneGpu?.nearestCalibration?.prepareMs});
        visual.push(await compareCpu());
      }
      const measured=samples.slice(4),p95=key=>measured.map(row=>row[key]).sort((a,b)=>a-b)[Math.ceil(measured.length*.95)-1];
      const contexts=__gpuEdits.contexts-startContexts,liveBeforeRelease=__gpuEdits.textures.size;
      ws.releasePlayer();
      rows.push({mode,warmupEdits:4,samples:measured.length,contexts,liveBeforeRelease,liveAfterRelease:__gpuEdits.textures.size,runtimeP95:p95('runtimeMs'),prepareP95:p95('prepareMs'),editorP95:p95('editorMs'),visual,raw:samples});
    }
    ws.replace(fixture());await view.render();await drain();
    const sizing=[],sizingContexts=__gpuEdits.contexts;
    for(const grid of [4,3,1,3]){
      const start=observations.length;
      classicV4Changes.run('GPU工作尺寸夹具',s=>{s.sceneEffects.sample.controllers['sampling-grid'].size=grid;});
      const revision=ws.revision;await view.render();await drain();const frame=observations.slice(start).find(row=>row.revision===revision);
      if(!frame)throw Error('Missing grid edit observation');
      sizing.push({grid,...await compareCpu(),contextsAdded:__gpuEdits.contexts-sizingContexts,initialized:frame.stats.sceneGpu.initialized,surfacesRebuilt:frame.stats.sceneGpu.surfacesRebuilt,programCount:frame.stats.sceneGpu.programCount});
    }
    classicV4Changes.run('GPU撤销夹具',s=>{s.entities[0].x=180;});await view.render();await drain();
    classicV4Changes.undo();const afterUndoRelease=__gpuEdits.textures.size;await view.render();await drain();const undo=await compareCpu();
    classicV4Changes.redo();const afterRedoRelease=__gpuEdits.textures.size;await view.render();await drain();const redo=await compareCpu();
    ws.mutate(s=>{s.width=641;});const afterResizeRelease=__gpuEdits.textures.size;await view.render();await drain();const resize=await compareCpu();
    ws.mutate(s=>{s.assets={unused:{locator:'data:image/png;base64,unused'}};});const afterAssetsRelease=__gpuEdits.textures.size;
    ws.replace(fixture());const afterReplaceRelease=__gpuEdits.textures.size;await view.render();await drain();const replacement=await compareCpu();
    ws.releasePlayer();window.classicV4PreviewBackend=backend;
    return {rows,sizing,boundaries:{afterUndoRelease,afterRedoRelease,afterResizeRelease,afterAssetsRelease,afterReplaceRelease},visual:{undo,redo,resize,replacement},liveTextures:__gpuEdits.textures.size,renderer:__gpuEdits.renderer};
  });
  const report={date:'2026-10-24',browser:browser.version(),runtimeSha256,viewport:[1600,1000],deviceScaleFactor:1,headless:true,method:'16 edits per mode, first 4 warmup, CPU/GPU fixed-time comparison after every edit; GPU device time not collected',errors,...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-editor-gpu-edit-reuse-2026-10-24${reportTag?'-'+reportTag:''}-result.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  for(const row of result.rows){assert.equal(row.liveAfterRelease,0);assert.ok(row.visual.every(v=>v.preMax<=2&&v.alphaMax<=1));assert.ok(row.raw.every(v=>v.backend==='gpu'&&v.playerCreated));}
  assert.equal(result.rows[0].contexts,16);assert.equal(result.rows[1].contexts,0);
  assert.ok(result.rows[0].raw.every(v=>v.initialized));assert.ok(result.rows[1].raw.every(v=>!v.initialized&&v.calibrationMs===0));
  assert.equal(new Set(result.rows[1].raw.map(v=>v.allocations)).size,1);
  assert.ok(result.sizing.every(row=>row.contextsAdded===0&&!row.initialized&&row.surfacesRebuilt&&row.programCount<=3&&row.preMax<=2&&row.alphaMax<=1));
  assert.ok(Object.values(result.boundaries).every(v=>v===0));assert.ok(Object.values(result.visual).every(v=>v.preMax<=2&&v.alphaMax<=1));
  assert.equal(result.liveTextures,0);assert.deepEqual(errors,[]);
}finally{await browser.close();}
