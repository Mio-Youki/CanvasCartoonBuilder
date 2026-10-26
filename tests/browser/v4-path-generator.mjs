import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/path-generator');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
 await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180,loop:12});classicV4View.select(null);classicV4Patterns.open('patterns');classicV4ResourceEntries.patterns.setScope('project');});
 await page.locator('[data-pattern-import]').setInputFiles(resolve(root,'examples/resources/dual-ray.tosampool-resource.json'));
 const card=page.locator('[data-pattern-id="proposal.dual-ray"]');await card.waitFor();
 async function draw(carrier){await card.locator('[data-pattern-action="create"]').click();await page.locator('[data-pattern-carrier="'+carrier+'"]').click();const box=await page.locator('#v4-classic-stage').boundingBox();await page.mouse.move(box.x+box.width*.15,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.75,{steps:5});await page.mouse.up();}
 await draw('rect');await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===1);
 const owner=await page.evaluate(()=>({id:ToSampoolV4Workspace.current().entities[0].id,part:ToSampoolV4Workspace.current().entities[0].parts[0].id}));
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].type),'rect');
 assert.equal(await page.getByText('保留图样缓存；颜色、粗细及内部参数暂不可编辑。',{exact:true}).count(),0);
 assert.equal(await page.locator('[data-path-generator="proposal.dual-ray"]').count(),1);assert.ok(await page.locator('[data-parameter-generator="proposal.dual-ray"]').count()>0);assert.equal(await page.locator('[data-parameter-timing="carrier"]').count(),0);
 assert.equal(await page.locator('[data-extension-param="showSource"]').count(),1);
 await page.evaluate(({id,part})=>{classicV4Changes.run('叠加轮廓嵌套',s=>EditorV4PatternRegistry.enable(s.entities.find(e=>e.id===id).parts.find(p=>p.id===part),'nested'));classicV4Inspector.focusExtension(id,part,'proposal.dual-ray');},owner);
 await page.locator('[data-v4-pattern-id="proposal.dual-ray"] .struct-label').click();assert.equal(await page.locator('[data-path-generator="proposal.dual-ray"]').count(),1);
 const order=await page.evaluate(({id,part})=>{const p=ToSampoolV4Workspace.current().entities.find(e=>e.id===id).parts.find(p=>p.id===part);return EditorV4PatternRegistry.attached(p);},owner);assert.deepEqual(order,['proposal.dual-ray','nested']);
 const priorPixels=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;await ToSampoolV4Workspace.renderTo(c,0);return c.toDataURL();});
 const native=page.locator('[data-v4-pattern-id="proposal.dual-ray"]'),nested=page.locator('[data-v4-pattern-id="nested"]');const a=await native.boundingBox(),b=await nested.boundingBox();await page.mouse.move(a.x+60,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+60,b.y+2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(({id,part})=>EditorV4PatternRegistry.attached(ToSampoolV4Workspace.current().entities.find(e=>e.id===id).parts.find(p=>p.id===part)).at(-1),owner),'proposal.dual-ray');
 assert.notEqual(await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;await ToSampoolV4Workspace.renderTo(c,0);return c.toDataURL();}),priorPixels,'调序必须改变真实覆盖画面，而非只移动树条目');
 await page.evaluate(({id,part})=>{classicV4Changes.run('三段对象轨',s=>{EditorVNextTimelineState.track(s,id);EditorVNextTimelineState.split(s,id,1/3);EditorVNextTimelineState.split(s,id,2/3);});state.t=10;classicV4Inspector.focusExtension(id,part,'proposal.dual-ray');},owner);
 await page.locator('#btn-timing-mode').click();await page.locator('[data-extension-param="generator|proposal.dual-ray|angle"]').fill('120');await page.locator('[data-extension-param="generator|proposal.dual-ray|angle"]').press('Tab');
 const timing=await page.evaluate(({id})=>{const s=ToSampoolV4Workspace.current(),key='partsById.'+encodeURIComponent(s.entities.find(e=>e.id===id).parts[0].id).replace(/\./g,'%2E')+'.extensionsById.proposal%2Edual-ray.params.angle';return{value:s.timeline.tracks[id].segments[2].values[key],key};},owner);assert.equal(timing.value,120);
 await page.locator('#stage-meta-bar .stage-meta-title').click();await page.keyboard.press('Control+z');assert.equal(await page.evaluate(({id,key})=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[2].values[key],{id:owner.id,key:timing.key}),undefined);
 await page.evaluate(()=>{classicV4View.select(null);classicV4ResourceEntries.patterns.setScope('project');classicV4Patterns.open('patterns');});await draw('ellipse');await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===2);
 const second=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[1].parts[0]);assert.equal(second.type,'ellipse');assert.ok(second.extensions['proposal.dual-ray'].enabled);assert.equal(second.recipe,undefined);assert.equal(second.geometrySnapshot,undefined);
 await page.addScriptTag({path:resolve(root,'tests/fixtures/dual-ray-approved-paint.js')});
 const different=await page.evaluate(()=>{const r=ToSampoolRuntimeVNext,m=r.modules,d=m.dualRayPattern.definition;let different=0;for(const carrier of ['rect','ellipse','regular','free'])for(const alphaA of [1,.55])for(const time of [0,1.25,11.9]){const params={...Object.fromEntries(d.parameters.map(p=>[p.key,p.default])),carrier,alphaA},part={...m.dualRayPattern.carrier(params,{x:0,y:0,w:320,h:180}),id:'p',fill:null,stroke:null,extensions:{attached:[d.id],showSource:false,[d.id]:{enabled:true,definition:d,params}}},scene={format:'tosampool-scene/v4',width:320,height:180,loop:12,background:{color:'#ffffff',alpha:0},assets:{},entities:[{id:'v',type:'vector',x:0,y:0,w:320,h:180,parts:[part]}],timeline:{tracks:{}}},a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=320;a.height=b.height=180;dualRayApprovedPaint(a.getContext('2d'),params,time,{x:0,y:0,w:320,h:180});const player=r.createRuntime(scene);try{player.renderTo(b,time);}finally{player.dispose();}const x=a.getContext('2d').getImageData(0,0,320,180).data,y=b.getContext('2d').getImageData(0,0,320,180).data;for(let i=0;i<x.length;i++)if(x[i]!==y[i])different++;}return different;});assert.equal(different,0,'正式附着路径24组画面与冻结的原绘制算法一致');
 await page.evaluate(()=>updateClassicV4PerformanceUi(performance.now(),true));assert.match(await page.locator('#preview-perf').textContent(),/渲染P95/);assert.match(await page.locator('#preview-perf').getAttribute('title'),/调度回调间隔/);
 await page.screenshot({path:resolve(out,'attached-inspector.png')});assert.deepEqual(errors,[]);
 console.log('✓ 真实图样操作：项目导入→选择载体拖绘→保留图元→子条目定位→与嵌套共存拖动排序→顶部时序兼容及Ctrl+Z→项目卡片再次绘制椭圆且可编辑，共用参数时钟且无缓存降级');
}finally{await browser.close();}
