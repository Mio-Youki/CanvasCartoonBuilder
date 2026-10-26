import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true}),name='tosampool-resource-test-'+Date.now();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));const url=pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href;
 await page.goto(url);await page.waitForFunction(()=>window.EditorV4ResourceLibrary&&window.ToSampoolV4Workspace?.hasDocument);
 const first=await page.evaluate(async name=>{
  if(state.playing)togglePlay();const scene=EditorVNextScene.blank(),svg='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#cc3344"/></svg>');scene.assets={photo:{locator:svg,width:8,height:8}};
  const preset=EditorV4Resources.addPattern(scene,{id:'bookmark-bracket',engineId:'brackets',params:{layout:'corners'},style:{color:'#ffcc33',width:4}});scene.modules={rain:{manifest:{format:'tosampool-scene-module/v1',id:'rain',version:1,parameters:[{key:'intensity',type:'number',default:.5}],assets:[]},source:'data:text/javascript,'+encodeURIComponent('window.RESOURCE_CODE_EXECUTED=true;')}};
  const library=EditorV4ResourceLibrary.create({name}),hash=await library.pin(scene,[{kind:'asset',id:'photo'},{kind:'pattern',id:preset},{kind:'module',id:'rain'}]);await library.close();return{hash,pinned:scene.resourcePins.includes(hash),executed:!!window.RESOURCE_CODE_EXECUTED};
 },name);assert.equal(first.pinned,true);assert.equal(first.executed,false);
 await page.reload();await page.waitForFunction(()=>window.EditorV4ResourceLibrary&&window.ToSampoolV4Workspace?.hasDocument);
 const result=await page.evaluate(async({name,hash})=>{
  if(state.playing)togglePlay();const library=EditorV4ResourceLibrary.create({name}),rows=await library.list(),scene=EditorVNextScene.blank({width:120,height:80});await library.importInto(scene,hash);
  const part=EditorV4Resources.createPatternPart(scene,'bookmark-bracket',{id:'p',w:100,h:60});scene.entities=[{id:'v',type:'vector',x:10,y:10,w:100,h:60,parts:[part]}];ToSampoolV4Workspace.replace(scene);await classicV4View.render();const before=classicV4View.canvas.toDataURL();
  await library.remove(hash);await classicV4View.render();const after=classicV4View.canvas.toDataURL(),pkg=await EditorVNextProjectPackage.build(scene),restored=(await EditorVNextProjectPackage.restore(pkg.files)).scene;
  const html=EditorVNextDeliveryBuilder.embedHtml({scene:restored,runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'resource-r1'}).data,remaining=(await library.list()).length;await library.close();return{count:rows.length,empty:remaining,same:before===after,resources:pkg.manifest.resources.length,executed:!!window.RESOURCE_CODE_EXECUTED,html};
 },{name,hash:first.hash});assert.equal(result.count,1);assert.equal(result.empty,0);assert.equal(result.same,true);assert.equal(result.resources,3);assert.equal(result.executed,false);
 const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(result.html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
 await page.evaluate(async name=>{await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('测试数据库未关闭'));});},name);
 assert.deepEqual(errors,[]);console.log('✓ 资源R1浏览器：IndexedDB显式收藏／刷新后读取／跨项目复制／删除不影响实例／未执行JS／工程与HTML');
}finally{await browser.close();}
