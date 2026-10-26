import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
import {validateVNextScene} from '../../scripts/validate-scene-vnext.mjs';
const root=resolve(import.meta.dirname,'../..'),folder=resolve(root,'examples/agent-pattern-g4'),scenes=['baseline','revision'].map(n=>JSON.parse(readFileSync(resolve(folder,n+'.tosampool.json'),'utf8')));
for(const scene of scenes)assert.equal(validateVNextScene(scene).valid,true);
assert.deepEqual(scenes[0].entities.slice(1),scenes[1].entities.slice(1),'修改不得误改其他对象');
const a=scenes[0].entities[0],b=scenes[1].entities[0];assert.equal(a.parts[0].strokeWidth,b.parts[0].strokeWidth);assert.equal(b.parts[0].recipe.params.length,75);assert.equal(b.parts[0].recipe.params.shaftMode,'fixed');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p)),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],images=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
 const dir=resolve(root,'docs/design/evidence/pattern-g4-2026-10-18');mkdirSync(dir,{recursive:true});
 for(const name of['baseline','revision']){
  await page.evaluate(({text,name})=>{window.showOpenFilePicker=async()=>[{getFile:async()=>new File([text],name+'.tosampool.json',{type:'application/json'})}];},{text:readFileSync(resolve(folder,name+'.tosampool.json'),'utf8'),name});
  await page.locator('#btn-open').click();
  await page.waitForFunction(length=>ToSampoolV4Workspace.current().entities[0]?.parts[0]?.recipe?.params.length===length,name==='baseline'?50:75);
  if(await page.evaluate(()=>state.playing))await page.evaluate(()=>togglePlay());
  images.push(await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();}));
  await page.locator('#'+await page.evaluate(()=>classicV4View.canvas.id)).screenshot({path:resolve(dir,name+'.png')});
 }
 assert.notEqual(images[0],images[1]);
 await page.evaluate(()=>{const o=ToSampoolV4Workspace.current().entities[0];classicV4Inspector.focusExtension(o.id,o.parts[0].id,'corner-arrows');});
 const field=k=>page.locator('[data-extension-param="corner-arrows.'+k+'"]');assert.equal(await field('length').inputValue(),'75');
 const before=await page.evaluate(()=>classicV4View.canvas.toDataURL());await field('length').fill('55');await field('length').press('Tab');
 assert.notEqual(await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();}),before);
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('length').inputValue(),'75');
 assert.equal(await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();}),before);
 const html=await page.evaluate(async()=>{const p=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),s=(await EditorVNextProjectPackage.restore(p.files)).scene;if(s.entities[0].parts[0].recipe.params.shaftCap!=='point')throw Error('重开丢失尖头');return EditorVNextDeliveryBuilder.embedHtml({scene:s,name:'g4',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;});
 const output=await browser.newPage();output.on('pageerror',e=>errors.push(String(e)));await output.setContent(html);await output.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await output.close();assert.deepEqual(errors,[]);
 console.log('✓ G4受限使用实验：Agent首轮文件有效／真实打开／修改隔离／画面变化／Inspector编辑撤销／重开与HTML');
}finally{await browser.close();}
