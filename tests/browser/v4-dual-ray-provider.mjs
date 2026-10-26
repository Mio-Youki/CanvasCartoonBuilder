import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/dual-ray-provider');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
  await page.addScriptTag({path:resolve(root,'tests/fixtures/dual-ray-approved-paint.js')});
  const results=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,modules=runtime.modules,definition=modules.dualRayPattern.definition,defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.default]));
    const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const baseScene=(w,h,params)=>({format:'tosampool-scene/v4',width:w,height:h,loop:12,background:{color:'#ffffff',alpha:0},assets:{},entities:[{id:'owner',type:'vector',x:0,y:0,w,h,parts:[{id:'part',type:'custom',x:0,y:0,w,h,recipe:{id:definition.id,version:definition.version,definition,params}}]}],timeline:{tracks:{}}});
    const compare=(a,b)=>{const pa=a.getContext('2d').getImageData(0,0,a.width,a.height).data,pb=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let differences=0,max=0;for(let i=0;i<pa.length;i++){if(pa[i]!==pb[i])differences++;max=Math.max(max,Math.abs(pa[i]-pb[i]));}return{differences,max};};
    const cases=[];
    for(const carrier of ['rect','ellipse','regular','free'])for(const alphaA of [1,.55]){
      const params={...defaults,carrier,alphaA},w=320,h=180,a=makeCanvas(w,h),b=makeCanvas(w,h),player=runtime.createRuntime(baseScene(w,h,params));
      try{for(const t of [0,1.25,11.9]){a.getContext('2d').clearRect(0,0,w,h);dualRayApprovedPaint(a.getContext('2d'),params,t,{x:0,y:0,w,h});player.renderTo(b,t);cases.push({carrier,alphaA,time:t,...compare(a,b)});}}finally{player.dispose();}
    }
    const performance=[];
    for(const [w,h]of [[960,540],[1920,1080]]){
      const canvas=makeCanvas(w,h),player=runtime.createRuntime(baseScene(w,h,defaults));
      try{for(let i=0;i<12;i++)player.renderTo(canvas,i/30);const samples=[];let frame;for(let i=0;i<60;i++){const start=globalThis.performance.now();frame=player.renderTo(canvas,(i+12)/30);samples.push(globalThis.performance.now()-start);}samples.sort((a,b)=>a-b);performance.push({w,h,p95Ms:samples[Math.ceil(samples.length*.95)-1],workPixels:frame.workPixels,pixelPasses:frame.pixelPasses,offscreenPeakPixels:frame.surfaces.peakPixels});}finally{player.dispose();}
    }
    const sample=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
    const render=scene=>{const c=makeCanvas(100,100),player=runtime.createRuntime(scene);try{const frame=player.renderTo(c,1);return{c,frame};}finally{player.dispose();}};
    const maskedScene=baseScene(100,100,defaults);maskedScene.entities[0].effects={mask:{type:'rect',x:0,y:0,w:50,h:100}};const masked=render(maskedScene);
    const translucentScene=baseScene(100,100,defaults);translucentScene.entities[0].alpha=.4;const translucent=render(translucentScene);
    const partAlphaScene=baseScene(100,100,defaults);partAlphaScene.entities[0].parts[0].alpha=.4;const partAlpha=render(partAlphaScene);
    const layeredScene=baseScene(100,100,defaults);layeredScene.entities[0].parts.push({id:'top',type:'rect',x:10,y:10,w:20,h:20,fill:'#00ff00',stroke:null});const forward=sample(render(layeredScene).c,20,20);layeredScene.entities[0].parts.reverse();const backward=sample(render(layeredScene).c,20,20);
    const pipeline=[];for(const order of [['mask','decorate','sample'],['sample','decorate','mask'],['decorate','mask','sample']]){const s=baseScene(100,100,defaults);s.entities[0].effects={pipeline:order,mask:{type:'rect',x:0,y:0,w:75,h:100},decorate:{'tint-overlay':{enabled:true,color:'#ff0000',alpha:.1,blend:'multiply'}},sample:{controllers:{'sampling-grid':{size:2}}}};const {frame}=render(s);pipeline.push({order,unsupported:frame.unsupportedEffects.length,capsuleObjects:frame.capsuleObjects});}
    return{cases,performance,interactions:{maskOutside:sample(masked.c,75,50)[3],maskInside:sample(masked.c,25,50)[3],objectAlpha:sample(translucent.c,25,50)[3],partAlpha:sample(partAlpha.c,25,50)[3],forward,backward,pipeline}};
  });
  assert.ok(results.cases.every(c=>c.differences===0),JSON.stringify(results.cases.filter(c=>c.differences)));
  assert.ok(results.performance.every(r=>r.workPixels===0&&r.pixelPasses===0&&r.offscreenPeakPixels===0),'no-effect native provider must stay on fast path');
  const interaction=results.interactions;assert.equal(interaction.maskOutside,0);assert.equal(interaction.maskInside,255);assert.ok(Math.abs(interaction.objectAlpha-102)<=1);assert.ok(Math.abs(interaction.partAlpha-102)<=1);assert.deepEqual(interaction.forward,[0,255,0,255]);assert.notDeepEqual(interaction.backward,interaction.forward);assert.ok(interaction.pipeline.every(p=>p.unsupported===0&&p.capsuleObjects===1));
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180,loop:12});classicV4Changes.run('正式双色放射夹具',scene=>{const definition=ToSampoolRuntimeVNext.modules.dualRayPattern.definition,installed=EditorV4PatternLifecycle.install(scene,definition),p=EditorV4Resources.createPatternPart(scene,installed.presetId,{id:'p',w:160,h:100});scene.entities=[{id:'owner',type:'vector',x:40,y:30,w:160,h:100,parts:[p]}];EditorVNextTimelineState.track(scene,'owner');EditorVNextTimelineState.split(scene,'owner',1/3);EditorVNextTimelineState.split(scene,'owner',2/3);});state.t=10;classicV4Inspector.focusExtension('owner','p','provider');});
  assert.equal(await page.locator('[data-generator-color]').count(),2);assert.equal(await page.locator('[data-extension-param="provider.alphaA"]').count(),0);
  assert.equal(await page.locator('[data-parameter-timing="colorA"]').count(),1);assert.equal(await page.locator('[data-parameter-timing="alphaA"]').count(),1);
  await page.locator('[data-generator-color="colorA"] .color-swatch').click();await page.locator('.color-pop .color-hex').fill('#ff3300');await page.locator('.color-pop .color-hex').press('Tab');
  await page.locator('.color-pop .color-alpha-input').fill('55');await page.locator('.color-pop .color-alpha-input').press('Tab');await page.locator('.color-pop-close').click();
  const paintValues=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.params);assert.equal(paintValues.colorA,'#ff3300');assert.ok(Math.abs(paintValues.alphaA-.55)<1e-7);
  await page.locator('[data-extension-param="provider.motion"]').uncheck();assert.equal(await page.locator('[data-extension-param="provider.period"]').count(),0);
  await page.locator('[data-extension-param="provider.motion"]').check();assert.equal(await page.locator('[data-extension-param="provider.period"]').count(),1);
  await page.locator('[data-parameter-timing="angle"]').click();await page.locator('[data-extension-param="provider.angle"]').fill('120');await page.locator('[data-extension-param="provider.angle"]').press('Tab');
  const timeline=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current();classicV4Changes.run('中段过渡',d=>EditorVNextTimelineState.setLinear(d,'owner',1));return ToSampoolRuntimeVNext.modules.frame.create(ToSampoolRuntimeVNext.modules.scene.normalize(ToSampoolV4Workspace.current()),6).valuesFor(s.entities[0]).parts[0].recipe.params.angle;});assert.ok(Math.abs(timeline-60)<1e-7);
  const exported=await page.evaluate(()=>({scene:ToSampoolV4Workspace.current(),source:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}));
  const exportPage=await browser.newPage();await exportPage.addScriptTag({content:exported.source});
  const exportedAngle=await exportPage.evaluate(s=>{const api=ToSampoolRuntimeVNext.modules,c=document.createElement('canvas');c.width=320;c.height=180;const runtime=ToSampoolRuntimeVNext.createRuntime(s);try{runtime.renderTo(c,6);return api.frame.create(api.scene.normalize(s),6).valuesFor(s.entities[0]).parts[0].recipe.params.angle;}finally{runtime.dispose();}},exported.scene);assert.ok(Math.abs(exportedAngle-60)<1e-7);
  await page.screenshot({path:resolve(out,'inspector.png')});assert.deepEqual(errors,[]);
  writeFileSync(resolve(out,'results.json'),JSON.stringify({scope:'formal-native-pattern-no-scene-module-bridge',...results,note:'同步CPU/Canvas提交；不包含完整GPU完成与编辑器UI帧耗时。'},null,2),'utf8');
  console.log('✓ 双色放射：24组旧预览逐像素一致／正式Runtime快路径／真实Inspector共享颜色控件／动态展开／对象轨Linear／内联Runtime；性能',results.performance);
}finally{await browser.close();}
