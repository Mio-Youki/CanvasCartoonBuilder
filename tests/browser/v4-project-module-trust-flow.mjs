import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage(),dialogs=[];
page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EditorVNextProjectPackage&&window.EditorVNextModuleLoader&&window.openV4ProjectDocument);
  const result=await page.evaluate(async()=>{
    const manifest={format:'tosampool-scene-module/v1',id:'trusted-box',version:1,title:'可信方块',parameters:[]},source=`window.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render({ctx,width,height}){ctx.fillStyle='#36cc88';ctx.fillRect(-width/2,-height/2,width,height);}});`,scene={format:'tosampool-scene/v4',width:8,height:6,loop:1,assets:{},modules:{'trusted-box':{manifest,source:'data:text/javascript;charset=utf-8,'+encodeURIComponent(source)}},entities:[{id:'box',type:'procedural',moduleId:'trusted-box',moduleVersion:1,x:0,y:0,w:8,h:6}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};
    const packed=await EditorVNextProjectPackage.build(scene,{projectId:'trusted'});const files=EditorVNextProjectArchive.unpack(EditorVNextProjectArchive.pack(packed.files));ToSampoolV4Workspace.createBlank({width:1,height:1});await openV4ProjectDocument({name:'trusted.tosampool.zip',files});const output=document.createElement('canvas');await ToSampoolV4Workspace.renderTo(output,0);return{module:ToSampoolV4Workspace.requireDocument().modules['trusted-box'].manifest.id,pixel:[...output.getContext('2d').getImageData(3,3,1,1).data]};
  });
  assert.equal(result.module,'trusted-box');assert.ok(result.pixel[1]>150,'explicitly trusted module must render after project restore');assert.equal(dialogs.length,1);assert.match(dialogs[0],/trusted-box@1/);console.log('✓ V4 Project Module Trust Flow：恢复只在确认后执行程序构件并渲染通过');
} finally { await browser.close(); }
