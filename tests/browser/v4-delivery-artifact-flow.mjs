import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EditorVNextDeliveryBuilder&&window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__&&window.ToSampoolV4Workspace?.hasDocument);
  const embed=await page.evaluate(async()=>{
    const svg='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="6"%3E%3Crect width="8" height="6" fill="%23ffcc33"/%3E%3C/svg%3E';
    const scene={format:'tosampool-scene/v4',width:8,height:6,loop:2,assets:{used:{locator:svg,mime:'image/svg+xml',width:8,height:6},UNUSED_DELIVERY_ASSET_9:{locator:svg,mime:'image/svg+xml',width:8,height:6}},entities:[{id:'image',type:'image',assetId:'used',x:0,y:0,w:8,h:6}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};
    return EditorVNextDeliveryBuilder.embedHtml({scene,runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'delivery-check'}).data;
  });
  const artifact=await browser.newPage();await artifact.setContent(embed,{waitUntil:'load'});await artifact.waitForFunction(()=>document.querySelector('[data-tosampool-scene]')?.dataset.tosampoolReady==='1',null,{timeout:5000});
  const result=await artifact.evaluate(()=>{const root=document.querySelector('[data-tosampool-scene]'),canvas=root.querySelector('canvas'),pixel=canvas.getContext('2d').getImageData(2,2,1,1).data;return{ready:root.dataset.tosampoolReady,width:canvas.width,height:canvas.height,pixel:[...pixel],hasUnused:document.documentElement.innerHTML.includes('UNUSED_DELIVERY_ASSET_9')};});
  assert.equal(result.ready,'1');assert.deepEqual([result.width,result.height],[8,6]);assert.ok(result.pixel[0]>200&&result.pixel[1]>150,'embed must render the frozen referenced image');assert.equal(result.hasUnused,false,'embed must omit unreferenced image data');await artifact.close();assert.deepEqual(errors,[]);
  const proceduralEmbed=await page.evaluate(()=>{const manifest={format:'tosampool-scene-module/v1',id:'embed-probe',version:1,parameters:[]},source=`window.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render({ctx,width,height}){ctx.fillStyle='#ff3355';ctx.fillRect(-width/2,-height/2,width,height);}});`,scene={format:'tosampool-scene/v4',width:6,height:4,loop:1,assets:{},modules:{'embed-probe':{manifest}},entities:[{id:'procedural',type:'procedural',moduleId:'embed-probe',moduleVersion:1,x:0,y:0,w:6,h:4}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};return EditorVNextDeliveryBuilder.embedHtml({scene,runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'procedural-delivery',moduleSources:{'embed-probe':source}}).data;});
  const proceduralArtifact=await browser.newPage();await proceduralArtifact.setContent(proceduralEmbed,{waitUntil:'load'});await proceduralArtifact.waitForFunction(()=>document.querySelector('[data-tosampool-scene]')?.dataset.tosampoolReady==='1',null,{timeout:5000});const proceduralPixel=await proceduralArtifact.evaluate(()=>[...document.querySelector('canvas').getContext('2d').getImageData(2,2,1,1).data]);assert.ok(proceduralPixel[0]>200&&proceduralPixel[2]>50,'embed must register and render its declared procedural module before scene startup');await proceduralArtifact.close();
  const runtimeResult=await page.evaluate(async()=>{
    const svg='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="5" height="4"%3E%3Crect width="5" height="4" fill="%2344aaff"/%3E%3C/svg%3E';
    const scene={format:'tosampool-scene/v4',width:5,height:4,loop:1,assets:{used:{locator:svg,mime:'image/svg+xml'}},entities:[{id:'image',type:'image',assetId:'used',x:0,y:0,w:5,h:4}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};
    const runtime=EditorVNextDeliveryBuilder.runtimeScript({scene,name:'runtime-check'}),root=document.createElement('div'),canvas=document.createElement('canvas'),script=document.createElement('script');root.dataset.tosampoolScene='runtime-check';root.append(canvas);document.body.append(root);script.src=URL.createObjectURL(new Blob([runtime.data],{type:'text/javascript'}));document.body.append(script);
    await new Promise((resolve,reject)=>{const until=performance.now()+5000;const poll=()=>root.dataset.tosampoolReady==='1'?resolve():root.dataset.tosampoolError?reject(new Error(root.dataset.tosampoolError)):performance.now()>until?reject(new Error('runtime artifact timed out')):setTimeout(poll,20);poll();});
    const pixel=canvas.getContext('2d').getImageData(2,2,1,1).data;URL.revokeObjectURL(script.src);root.remove();script.remove();return{width:canvas.width,height:canvas.height,pixel:[...pixel]};
  });
  assert.deepEqual([runtimeResult.width,runtimeResult.height],[5,4]);assert.ok(runtimeResult.pixel[2]>150,'shared-player runtime script must render referenced image');
  console.log('✓ V4 Delivery Artifact Flow：可复制 embed 片段可单独渲染，且只携带已引用素材');
} finally { await browser.close(); }
