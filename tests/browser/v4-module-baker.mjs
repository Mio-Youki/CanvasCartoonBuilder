import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Resources&&window.EditorV4ModuleBaker);
 await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4View.select(null);classicV4Changes.clear();});
 await page.locator('[data-library-tab="assets"]').click();const shelf=page.locator('#v4-material-baking');
 page.once('dialog',d=>d.accept());await page.locator('#file').setInputFiles(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'));
 await page.waitForFunction(()=>ToSampoolV4Workspace.current().modules?.['example.rain-curtain']);await page.evaluate(()=>classicV4ResourceEntries.settled());
 await page.locator('[data-element-preset-id] [data-material-action="place"]').click();
 await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().entities.length===1);
 await page.evaluate(()=>{
   classicV4Changes.run('烘焙测试',scene=>{
     const e=scene.entities[0];e.params.amount=18;e.params.color='#ff6600';e.params.assetId='provenance-only-not-a-dependency';e.rot=13;e.alpha=.7;
     scene.entities.push({id:'other',type:'rect',x:0,y:0,w:20,h:20,fill:'#00ff00'});
     scene.background={color:'#2233ff',alpha:1};
   });state.t=.75;classicV4Changes.clear();window.R4B_SOURCE=JSON.stringify(ToSampoolV4Workspace.current());
 });
 const reference=await page.evaluate(()=>{
   const scene=JSON.parse(R4B_SOURCE);scene.entities=scene.entities.filter(e=>e.type==='procedural');scene.background={alpha:0};scene.sceneEffects={};
   const p=ToSampoolRuntimeVNext.createRuntime(scene),c=document.createElement('canvas');p.renderTo(c,state.t,{preview:{pixelDivMultiplier:1}});const url=c.toDataURL();p.dispose();return url;
 });
 await shelf.locator('[data-resource-action="freeze-module"]').click();
 await page.waitForFunction(()=>!classicV4Resources.busy&&Object.values(ToSampoolV4Workspace.current().assets).some(a=>a.moduleBake?.mode==='freeze'));
 const frozen=await page.evaluate(()=>Object.entries(ToSampoolV4Workspace.current().assets).find(([id,a])=>a.moduleBake?.mode==='freeze'));
 assert.equal(frozen[1].locator,reference,'冻结画面匹配Full对象，排除背景及其他图层');
 assert.equal(frozen[1].moduleBake.times[0],.75);
 assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().entities)===JSON.stringify(JSON.parse(R4B_SOURCE).entities)),true,'原对象不能被替换');
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().assets).length),0);
 await page.evaluate(()=>classicV4Changes.redo());assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().assets).length),1);
 const frames=shelf.locator('[data-module-bake-frames]');await frames.fill('8');
 await shelf.locator('[data-resource-action="bake-module"]').click();
 await page.waitForFunction(()=>!classicV4Resources.busy&&Object.values(ToSampoolV4Workspace.current().assets).some(a=>a.frames?.length===8));
 const asset=await page.evaluate(()=>Object.entries(ToSampoolV4Workspace.current().assets).find(([id,a])=>a.frames?.length===8));
 assert.equal(asset[1].fps,2);assert.equal(asset[1].frames.length,8);assert.notEqual(asset[1].frames[0].locator,asset[1].frames[1].locator);
 const failures=await page.evaluate(async()=>{
   const scene=ToSampoolV4Workspace.current(),id=scene.entities[0].id,before=JSON.stringify(scene),abort=new AbortController();let cancelled=false,failed=false,stale=false,missing=false,budget=false;
   try{await EditorV4ModuleBaker.render(scene,id,{mode:'sequence',frames:8,signal:abort.signal,onProgress:()=>abort.abort()});}catch(e){cancelled=e.name==='AbortError';}
   try{await EditorV4ModuleBaker.render(scene,id,{encode:()=>{throw Error('encoder failure');}});}catch(e){failed=/encoder failure/.test(e.message);}
   try{await EditorV4ModuleBaker.render(scene,id,{encode:()=>({bytes:EditorV4ModuleBaker.limits.encodedBytes+1,locator:'data:image/png;base64,AA=='})});}catch(e){budget=/预算/.test(e.message);}
   let changed=false;try{await EditorV4ModuleBaker.render(scene,id,{mode:'sequence',frames:8,assertCurrent:()=>{if(changed)throw Error('stale project');},onProgress:()=>changed=true});}catch(e){stale=/stale project/.test(e.message);}
   const unknown=JSON.parse(JSON.stringify(scene));delete unknown.modules[unknown.entities[0].moduleId];
   try{await EditorV4ModuleBaker.render(unknown,id);}catch(e){missing=/依赖|未加载/.test(e.message);}
   return{cancelled,failed,stale,missing,budget,untouched:before===JSON.stringify(scene)};
 });assert.deepEqual(failures,{cancelled:true,failed:true,stale:true,missing:true,budget:true,untouched:true});
 const composite=await page.evaluate(async()=>{
   const scene=JSON.parse(R4B_SOURCE),e=scene.entities[0];scene.background={alpha:0};scene.entities=scene.entities.filter(item=>item.id===e.id);
   scene.entities.push({id:'parent',type:'group',x:3,y:2,w:160,h:96,alpha:.8});e.parentId='parent';
   e.parts=[{id:'mark',type:'rect',x:5,y:5,w:8,h:10,fill:'#ff00ff'}];
   e.effects={pipeline:['decorate','sample','mask'],mask:{type:'ellipse',x:5,y:5,w:145,h:80},decorate:{outline:{enabled:true,width:1,color:'#ff00ff',alpha:1}},sample:{controllers:{'sampling-grid':{size:2}}}};
   scene.timeline.tracks[e.id]={segments:[{f:[0,.5],values:{'params.amount':18}},{f:[.5,1],values:{'params.amount':5}}]};
   const out=[];
   for(const time of [.75,2.5]){
     const p=ToSampoolRuntimeVNext.createRuntime(scene),c=document.createElement('canvas');p.renderTo(c,time,{preview:{pixelDivMultiplier:1}});const expected=c.toDataURL();
     const nonempty=c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v);p.dispose();
     const baked=await EditorV4ModuleBaker.render(scene,e.id,{time});out.push(nonempty&&expected===baked.frames[0].locator);
   }return out;
 });assert.deepEqual(composite,[true,true],'父变换／图元／蒙版／描边／采样格／参数时序必须匹配正式Runtime');
 // Verify the actual cancel button. A long but tiny job leaves enough event-loop turns.
 await frames.fill('120');const assetsBefore=await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().assets).length);
 await shelf.locator('[data-resource-action="bake-module"]').click();await shelf.locator('[data-resource-action="cancel-bake"]').click();
 await page.waitForFunction(()=>!classicV4Resources.busy);assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().assets).length),assetsBefore);
 assert.match(await shelf.locator('.v4-resource-message').innerText(),/取消/);
 const delivery=await page.evaluate(async assetId=>{
   const original=ToSampoolV4Workspace.current(),bundle=await EditorV4Resources.capture(original,[{kind:'asset',id:assetId}]),scene=EditorVNextScene.blank({width:160,height:96});
   const imported=await EditorV4Resources.importInto(scene,bundle),id=imported.assets[assetId];EditorVNextAssetState.placeImage(scene,id,{x:0,y:0,w:160,h:96});scene.background={alpha:0};
   const project=await EditorVNextProjectPackage.build(scene),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;
   return{modules:Object.keys(opened.modules||{}),entries:bundle.entries.length,provenance:opened.assets[id].moduleBake,
     html:EditorVNextDeliveryBuilder.embedHtml({scene:opened,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'baked-sequence'}).data};
 },asset[0]);assert.deepEqual(delivery.modules,[]);assert.equal(delivery.entries,1);assert.equal(delivery.provenance.mode,'sequence');
 const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(delivery.html);
 await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));assert.equal(await exported.locator('[data-tosampool-error]').count(),0);
 const a=await exported.locator('canvas').evaluate(c=>c.toDataURL());await exported.waitForTimeout(600);assert.notEqual(await exported.locator('canvas').evaluate(c=>c.toDataURL()),a);await exported.close();
 if(process.argv.includes('--capture')){
   await page.evaluate(()=>classicV4Changes.run('清理测试来源参数',scene=>delete scene.entities[0].params.assetId));await frames.fill('8');
   const dir=resolve(root,'docs/design/evidence/resource-r4b-2026-10-19');mkdirSync(dir,{recursive:true});await page.screenshot({path:resolve(dir,'bake.png')});
 }
 assert.deepEqual(errors,[]);console.log('✓ R4b浏览器：Full像素等价／真实当前帧／8帧循环／取消无半成品／失败与过期拦截／源码缺失拒绝／撤销／资源项目往返／无Module动态HTML');
}finally{await browser.close();}
