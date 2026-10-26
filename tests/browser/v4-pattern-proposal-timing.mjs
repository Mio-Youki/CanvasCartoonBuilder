import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/p5-dual-ray');mkdirSync(out,{recursive:true});
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'examples/pattern-proposals/dual-ray/preview.html')).href);await page.waitForFunction(()=>window.patternReview);
  const field=key=>page.locator('[data-review-param="'+key+'"]'),clock=key=>page.locator('[data-review-clock="'+key+'"]');
  assert.equal(await page.locator('[data-color-alpha="colorA"]').count(),1);
  assert.equal(await page.locator('[data-color-alpha="colorA"] [data-review-param="alphaA"]').count(),1,'透明度必须属于同一颜色绑定，而非重复参数卡');
  async function openColor(){await page.locator('[data-color-alpha="colorA"] .color-swatch').click();}
  async function closeColor(){await page.locator('.color-pop-close').click();}
  await openColor();await page.locator('.color-alpha-input').fill('45');assert.equal(await page.evaluate(()=>patternReview.values().alphaA),.45,'百分比输入写入0–1，而不改变参数ID');
  await page.locator('.color-alpha-input').fill('');assert.equal(await page.evaluate(()=>patternReview.values().alphaA),.45,'临时清空输入不能写入黑底或零透明度');await closeColor();
  await page.locator('[data-parameter-reset]').click();
  await field('motion').uncheck();assert.equal(await field('period').count(),0);await field('motion').check();assert.equal(await field('period').count(),1);
  const initial=await page.locator('canvas').evaluate(c=>c.toDataURL());await field('centerX').fill('.3');assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),initial);
  for(const carrier of ['ellipse','regular','free','rect']){await field('carrier').selectOption(carrier);assert.equal(await page.evaluate(()=>patternReview.values().carrier),carrier);}
  await page.locator('[data-parameter-reset]').click();
  await page.locator('[data-review-experiment]').check();await page.locator('[data-review-segment="target"]').click();assert.equal(await clock('carrier').isDisabled(),true);
  await clock('centerX').click();await field('centerX').fill('.2');await clock('pairs').click();await field('pairs').fill('20');await clock('colorA').click();await openColor();await page.locator('.color-hex').fill('#ffffff');await page.locator('.color-hex').press('Tab');await closeColor();
  await page.locator('[data-review-segment="change"]').click();assert.equal(await field('centerX').isDisabled(),true);
  const middle=await page.evaluate(()=>patternReview.values());assert.ok(Math.abs(middle.centerX-.41)<1e-8);assert.equal(middle.pairs,12);assert.notEqual(middle.colorA,'#e6dec8');assert.notEqual(middle.colorA,'#ffffff');
  await page.locator('[data-review-segment="target"]').click();await clock('alphaA').click();await openColor();await page.locator('.color-alpha-input').fill('40');await closeColor();await page.locator('[data-review-segment="change"]').click();assert.ok(Math.abs(await page.evaluate(()=>patternReview.values().alphaA)-.7)<1e-8);assert.equal(await field('alphaA').textContent(),'70%','中段透明度仍显示百分比');
  await page.locator('[data-review-segment="target"]').click();assert.equal(await page.evaluate(()=>patternReview.values().pairs),20);await clock('centerX').click();await page.locator('[data-review-segment="change"]').click();assert.equal(await page.evaluate(()=>patternReview.values().centerX),.62);
  await page.locator('.review-test-options select').selectOption('hold');assert.equal(await page.evaluate(()=>patternReview.values().colorA),'#e6dec8');await page.locator('.review-test-options select').selectOption('linear');
  assert.equal(await page.evaluate(()=>patternReview.proposal().status),'awaiting-visual-review');
  const raster=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=480;c.height=270;const g=c.getContext('2d'),p=ToSampoolDualRayProposal.defaults(),draw=t=>{g.clearRect(0,0,480,270);ToSampoolDualRayProposal.paint(g,p,t,{x:20,y:20,w:440,h:230});return c.toDataURL();};
    const a=draw(0),b=draw(.07),end=draw(12);return{changed:a!==b,loop:a===end,outside:g.getImageData(0,0,1,1).data[3]};
  });assert.equal(raster.changed,true);assert.equal(raster.loop,true);assert.equal(raster.outside,0);
  const benchmarks=await page.evaluate(()=>{
    const result=[];for(const [width,height]of [[960,540],[1920,1080]]){const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d'),p=ToSampoolDualRayProposal.defaults(),samples=[];
      for(let i=0;i<180;i++){const t=performance.now();g.clearRect(0,0,width,height);ToSampoolDualRayProposal.paint(g,p,i/30,{x:24,y:24,w:width-48,h:height-48});if(i>=30)samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);result.push({width,height,pairs:p.pairs,frames:samples.length,p95Ms:samples[Math.ceil(samples.length*.95)-1],note:'Canvas绘制命令提交，不含完整显示合成'});
    }return result;
  });writeFileSync(resolve(out,'performance.json'),JSON.stringify(benchmarks,null,2));
  await page.screenshot({path:resolve(out,'timeline.png')});await page.locator('[data-parameter-reset]').click();await page.screenshot({path:resolve(out,'default.png')});
  const definition=JSON.parse(readFileSync(resolve(root,'examples/resources/folded-frame.tosampool-pattern.json'),'utf8'));definition.id='review.timeline-fixture';definition.parameters[0].timing='Linear';definition.parameters[1].timing='Step';definition.parameters[2].timing='No';
  const editor=await browser.newPage({viewport:{width:1440,height:1000}});editor.on('pageerror',e=>errors.push(String(e)));await editor.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await editor.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
  await editor.evaluate(def=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180,loop:12});classicV4Changes.run('时序能力夹具',s=>{const installed=EditorV4PatternLifecycle.install(s,def),p=EditorV4Resources.createPatternPart(s,installed.presetId,{id:'p',w:160,h:100});s.entities=[{id:'owner',type:'vector',x:60,y:30,w:160,h:100,parts:[p]}];EditorVNextTimelineState.track(s,'owner');EditorVNextTimelineState.split(s,'owner',1/3);EditorVNextTimelineState.split(s,'owner',2/3);});state.t=10;classicV4Inspector.focusExtension('owner','p','provider');},definition);
  assert.equal(await editor.locator('[data-parameter-timing="radius"]').count(),0);await editor.locator('[data-parameter-timing="gap"]').click();await editor.locator('[data-extension-param="provider.gap"]').fill('60');await editor.locator('[data-extension-param="provider.gap"]').press('Tab');
  await editor.locator('[data-parameter-timing="arm"]').click();await editor.locator('[data-extension-param="provider.arm"]').fill('100');await editor.locator('[data-extension-param="provider.arm"]').press('Tab');
  const actual=await editor.evaluate(()=>{classicV4Changes.run('中段过渡',s=>EditorVNextTimelineState.setLinear(s,'owner',1));const s=ToSampoolV4Workspace.current(),frame=ToSampoolRuntimeVNext.modules.frame.create(ToSampoolRuntimeVNext.modules.scene.normalize(s),6);return frame.valuesFor(s.entities[0]).parts[0].recipe.params;});
  assert.ok(Math.abs(actual.gap-36)<1e-8);assert.equal(actual.arm,28);assert.equal(actual.radius,0);
  const pixels=await editor.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;await ToSampoolV4Workspace.renderTo(c,2);const a=c.toDataURL();await ToSampoolV4Workspace.renderTo(c,6);return a!==c.toDataURL();});assert.equal(pixels,true,'formal Runtime must draw interpolated geometry');
  const delivery=await editor.evaluate(()=>({scene:ToSampoolV4Workspace.current(),html:EditorVNextDeliveryBuilder.embedHtml({scene:ToSampoolV4Workspace.current(),runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'parameter-timing-fixture'}).data}));
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(delivery.html);await exported.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules.parameterTiming);
  const exportedGap=await exported.evaluate(s=>{const api=ToSampoolRuntimeVNext.modules,frame=api.frame.create(api.scene.normalize(s),6);return frame.valuesFor(s.entities[0]).parts[0].recipe.params.gap;},delivery.scene);assert.ok(Math.abs(exportedGap-36)<1e-8,'embedded export uses the same capability gate');await exported.close();
  await editor.locator('[data-parameter-timing="gap"]').click();assert.equal(await editor.evaluate(()=>Object.hasOwn(ToSampoolV4Workspace.current().timeline.tracks.owner.segments[2].values,'partsById.p.recipe.params.gap')),false);
  assert.equal(await editor.evaluate(()=>EditorV4PatternRegistry.byId('proposal.dual-ray').category),'attached');assert.deepEqual(errors,[]);
  console.log('✓ 放射候选：载体与参数／旋转循环／透明外部／三段真实输入与清除继承／Step和颜色Linear／正式Inspector与Runtime渲染／未注册候选；性能',benchmarks);
}finally{await browser.close();}
