import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==='webgl2'&&window.__denyTestWebgl)return null;
      const result=original.call(this,type,...args);if(type==='webgl2'&&result)window.__previewTestGl=result;return result;
    };
  });
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?editor-gpu-preview=1');
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  assert.equal(await page.locator('#preview-backend').inputValue(),'cpu');
  await page.selectOption('#preview-quality','full');
  await page.evaluate(()=>{
    if(state.playing)togglePlay();
    const scene=EditorVNextScene.blank({width:333,height:187,loop:2});scene.background.alpha=0;
    scene.entities=[{id:'shape',type:'rect',x:15,y:13,w:180,h:120,fill:'#ff8a3080'}];
    scene.sceneEffects.sample={controllers:{'sampling-grid':{size:3}},threshold:{enabled:true,threshold:.5,dark:'#102030',light:'#ffccaa'}};
    ToSampoolV4Workspace.replace(scene);state.t=.4;classicV4View.scheduleRender('gpu-preview-fixture');
  });
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='cpu');
  const cpu=await page.evaluate(()=>Array.from(classicV4View.canvas.getContext('2d').getImageData(0,0,333,187).data));
  await page.selectOption('#preview-backend','gpu-experimental');
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu');
  const gpu=await page.evaluate(()=>Array.from(classicV4View.canvas.getContext('2d').getImageData(0,0,333,187).data));
  let max=0;for(let i=0;i<cpu.length;i++)max=Math.max(max,Math.abs(cpu[i]-gpu[i]));assert.equal(max,0);
  await page.click('#preview-backend-status');assert.equal(await page.locator('#preview-backend-details').evaluate(el=>el.matches(':popover-open')),true);
  assert.match(await page.locator('#preview-backend-report').innerText(),/GPU 执行时间：未采集/);await page.keyboard.press('Escape');
  await page.evaluate(()=>{classicV4Changes.run('添加不支持组合',s=>{s.sceneEffects.overlay['texture-overlay']={enabled:true,texture:'grid'};});});
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='unsupported-effect:texture-overlay');
  assert.match(await page.locator('#preview-backend-status').innerText(),/CPU.*回退/);
  await page.evaluate(()=>classicV4Changes.undo());await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu');
  await page.evaluate(()=>classicV4Changes.redo());await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='unsupported-effect:texture-overlay');
  await page.evaluate(()=>classicV4Changes.undo());await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu');
  await page.evaluate(async()=>{
    const gl=window.__previewTestGl,extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss test requires WEBGL_lose_context');
    await new Promise(resolve=>{gl.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();resolve();},{once:true});extension.loseContext();});
    classicV4View.scheduleRender('context-loss-test');
  });
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='webgl-context-lost');
  const lost=await page.evaluate(()=>Array.from(classicV4View.canvas.getContext('2d').getImageData(0,0,333,187).data));assert.deepEqual(lost,cpu);
  await page.selectOption('#preview-backend','cpu');await page.selectOption('#preview-backend','gpu-experimental');
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu');
  await page.evaluate(()=>{window.__previewTestGl.drawArrays=()=>{throw Error('test-draw-failure');};classicV4View.scheduleRender('draw-failure-test');});
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='test-draw-failure');
  const failed=await page.evaluate(()=>Array.from(classicV4View.canvas.getContext('2d').getImageData(0,0,333,187).data));assert.deepEqual(failed,cpu);
  await page.selectOption('#preview-backend','cpu');await page.evaluate(()=>{window.__denyTestWebgl=true;});await page.selectOption('#preview-backend','gpu-experimental');
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='webgl2-unavailable');
  await page.selectOption('#preview-backend','cpu');await page.evaluate(()=>{window.__denyTestWebgl=false;});await page.selectOption('#preview-backend','gpu-experimental');
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu');
  await page.evaluate(()=>{const scene=JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()));scene.width=399;ToSampoolV4Workspace.replace(scene);});
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.scene==='gpu'&&classicV4View.canvas.width===399);
  await page.evaluate(()=>{ToSampoolV4Workspace.mutate(scene=>{scene.sceneEffects={pipeline:['overlay','sample'],overlay:{},sample:{}};});});
  await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.reason==='no-supported-effect');
  assert.match(await page.locator('#preview-backend-status').innerText(),/无需处理/);
  await page.selectOption('#preview-backend','cpu');await page.waitForFunction(()=>classicV4PreviewBackend.snapshot().last?.requested==='cpu');
  const result=await page.evaluate(()=>({backend:classicV4PreviewBackend.snapshot(),json:JSON.stringify(ToSampoolV4Workspace.current()),performance:classicV4View.performance()}));
  assert.ok(result.backend.coldPlayer.samples>0);assert.equal(result.backend.last.deviceGpuMs,null);
  assert.ok(result.backend.last.timing.runtimeCallMs>=0);assert.ok(result.backend.last.timing.playerPrepareMs>=0);
  assert.equal(result.json.includes('sceneBackend'),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:browser.version(),maxPixelDifference:max,defaultBackend:'cpu',fallback:'unsupported-effect:texture-overlay',undoRedo:true,contextLossAndRecovery:true,drawFailureFallback:true,noWebglFallback:true,replaceAndResize:true,noEffect:true,deviceTiming:result.backend.last.deviceTiming,timing:result.backend.last.timing},null,2));
}finally{await browser.close();}
