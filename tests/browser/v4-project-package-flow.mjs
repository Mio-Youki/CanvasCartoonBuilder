import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.EditorVNextProjectPackage&&window.EditorVNextProjectArchive&&window.saveV4ProjectDocument&&window.openV4ProjectDocument);
  const result=await page.evaluate(async()=>{
    const scene=ToSampoolV4Workspace.requireDocument();
    const svg='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4" height="4"%3E%3Crect width="4" height="4" fill="%2344aaff"/%3E%3C/svg%3E';
    scene.assets={sky:{locator:svg,mime:'image/svg+xml',width:4,height:4,recipe:{width:2}},spare:{locator:svg,mime:'image/svg+xml',width:1,height:1}};
    scene.entities=[{id:'sky-image',type:'image',assetId:'sky',x:0,y:0,w:4,h:4}];ToSampoolV4Workspace.replace(scene,{locator:'weather.tosampool.zip'});
    const before=document.createElement('canvas');await ToSampoolV4Workspace.renderTo(before,0);const beforePixels=[...before.getContext('2d').getImageData(0,0,before.width,before.height).data];
    let captured=null;window.EditorHost={saveProject:async value=>(captured=value,{mode:'download',name:value.name})};
    await saveV4ProjectDocument();const files=EditorVNextProjectArchive.unpack(EditorVNextProjectArchive.pack(captured.files));
    ToSampoolV4Workspace.createBlank({width:1,height:1});await openV4ProjectDocument({name:'weather.tosampool.zip',files});
    const restored=ToSampoolV4Workspace.requireDocument(),after=document.createElement('canvas');await ToSampoolV4Workspace.renderTo(after,0);const afterPixels=[...after.getContext('2d').getImageData(0,0,after.width,after.height).data];return{name:captured.name,paths:files.map(file=>file.path),width:restored.width,assetIds:Object.keys(restored.assets),entity:restored.entities[0].assetId,locator:restored.assets.sky.locator,pixelsMatch:JSON.stringify(beforePixels)===JSON.stringify(afterPixels)};
  });
  assert.equal(result.name,'weather.tosampool.zip');assert.ok(result.paths.includes('project.tosampool.json'));assert.ok(result.paths.includes('assets/sky/asset.json'));assert.ok(result.paths.includes('render/scene.runtime.js'),'项目包应附带可部署的共享 Player 场景脚本');assert.deepEqual(result.assetIds.sort(),['sky','spare']);assert.equal(result.entity,'sky');assert.match(result.locator,/^data:image\/svg\+xml;base64,/);assert.equal(result.pixelsMatch,true);assert.deepEqual(errors,[]);
  console.log('✓ V4 Project Package Flow：页面保存、清空与 ZIP 显式恢复通过');
} finally { await browser.close(); }
