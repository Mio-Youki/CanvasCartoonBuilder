import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.EditorV4ElementPresets&&typeof classicV4Changes!=='undefined');
 const result=await page.evaluate(async()=>{
   if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4Changes.clear();
   classicV4Changes.run('建立审阅输入',scene=>{scene.entities=[{id:'source',type:'vector',x:40,y:20,w:40,h:30,rot:15,alpha:.7,anim:{bob:{amount:3,period:2,angle:90}},parts:[{id:'p',type:'rect',x:0,y:0,w:40,h:30,fill:'#ee8844'}]}];scene.timeline.tracks.source={segments:[{f:[0,1],values:{w:100,rot:80}}]};});
   const api=EditorV4ElementPresets;let key;
   classicV4Changes.run('收入元素预设',scene=>{key=api.add(scene,'source');});
   const original=JSON.stringify(ToSampoolV4Workspace.current().entities[0]);
   let ids;classicV4Changes.run('新建两个独立实例',scene=>{ids=[api.instantiate(scene,key,{x:10,y:10}).id,api.instantiate(scene,key,{x:100,y:10}).id];});
   const scene=ToSampoolV4Workspace.current(),saved=scene.elementPresets[key];
   const basic=saved.root.w===40&&saved.root.rot===15&&scene.timeline.tracks[ids[0]]==null;
   classicV4Changes.undo();const undo=ToSampoolV4Workspace.current().entities.length===1&&!!ToSampoolV4Workspace.current().elementPresets[key];classicV4Changes.redo();
   classicV4Changes.run('独立修改',document=>document.entities.find(e=>e.id===ids[0]).parts[0].fill='#00ff00');
   const current=ToSampoolV4Workspace.current(),independent=current.entities.find(e=>e.id===ids[1]).parts[0].fill==='#ee8844'&&current.elementPresets[key].root.parts[0].fill==='#ee8844';
   const presetScene=EditorVNextScene.blank({width:160,height:96});presetScene.elementPresets=JSON.parse(JSON.stringify(current.elementPresets));
   const specimen=api.instantiate(presetScene,key,{x:40,y:20}),reference=EditorVNextScene.blank({width:160,height:96});reference.entities=[JSON.parse(original)];
   // The reference deliberately has no timeline: compare authored base content.
   const one=ToSampoolRuntimeVNext.createRuntime(reference),two=ToSampoolRuntimeVNext.createRuntime(presetScene),c=document.createElement('canvas');let same=true;
   for(const t of [0,.5,1.25]){one.renderTo(c,t);const a=c.toDataURL();two.renderTo(c,t);same=same&&a===c.toDataURL();}one.dispose();two.dispose();
   const built=await EditorVNextProjectPackage.build(presetScene),opened=(await EditorVNextProjectPackage.restore(built.files)).scene;
   const html=EditorVNextDeliveryBuilder.embedHtml({scene:opened,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'independent-element'}).data;
   return{basic,undo,independent,same,sourceUnchanged:JSON.stringify(current.entities[0])===original,presetSaved:!!opened.elementPresets[key],html};
 });
 assert.equal(result.basic,true);assert.equal(result.undo,true);assert.equal(result.independent,true);assert.equal(result.same,true);assert.equal(result.sourceUnchanged,true);assert.equal(result.presetSaved,true);
 const descriptor=JSON.parse(readFileSync(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
 const program=await page.evaluate(async descriptor=>{
   const scene=EditorVNextScene.blank({width:160,height:96}),id=descriptor.manifest.id,scope='rc2-program-browser';scene._moduleScope=scope;scene.modules={[id]:descriptor};
   scene.entities=[{id:'program-source',type:'procedural',moduleId:id,moduleVersion:1,params:{amount:88,period:6,color:'#ff6600',seed:13},x:25,y:16,w:100,h:60,alpha:.8,anim:{bob:{amount:4,period:2,angle:90}}}];
   const key=EditorV4ElementPresets.add(scene,'program-source'),bundle=await EditorV4Resources.capture(scene,[{kind:'element',id:key}]);
   const target=EditorVNextScene.blank({width:160,height:96});target._moduleScope=scope;await EditorV4Resources.importInto(target,bundle);
   let blocked=false;try{EditorV4ElementPresets.instantiate(target,key);}catch(error){blocked=/显式信任/.test(error.message);}
   await EditorVNextModuleLoader.trustAndLoad(target,[id],{scope});EditorV4ElementPresets.instantiate(target,key,{x:25,y:16});
   const p=ToSampoolRuntimeVNext.createRuntime(scene),q=ToSampoolRuntimeVNext.createRuntime(target),canvas=document.createElement('canvas');let same=true,authoredAtZero;
   for(const time of [0,.5,1.25]){p.renderTo(canvas,time);const a=canvas.toDataURL();if(time===0)authoredAtZero=a;q.renderTo(canvas,time);same=same&&a===canvas.toDataURL();}p.dispose();q.dispose();
   const defaults=JSON.parse(JSON.stringify(target));defaults.entities[0].params.amount=60;const d=ToSampoolRuntimeVNext.createRuntime(defaults);d.renderTo(canvas,0);const differentFromDefault=authoredAtZero!==canvas.toDataURL();d.dispose();
   return{blocked,same,differentFromDefault,html:EditorVNextDeliveryBuilder.embedHtml({scene:target,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'program-element-preset',moduleSources:{[id]:EditorVNextModuleLoader.dataUrlText(descriptor.locator)}}).data};
 },descriptor);assert.equal(program.blocked,true);assert.equal(program.same,true);assert.equal(program.differentFromDefault,true);
 const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));
 for(const html of [result.html,program.html]){await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));assert.equal(await exported.locator('[data-tosampool-error]').count(),0);}await exported.close();
 assert.deepEqual(errors,[]);console.log('✓ RC2-a浏览器数据闭环：基础值而非时序／独立结构／三时刻像素／单次撤销重做／保存重开／HTML；无新UI入口');
}finally{await browser.close();}
