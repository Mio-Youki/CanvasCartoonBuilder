import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EditorVNextAgentContextPack&&window.EditorVNextProjectPackage&&window.EditorVNextModuleLoader&&window.ToSampoolRuntimeVNext);
  const result=await page.evaluate(async()=>{
    const pack=EditorVNextAgentContextPack.create({intent:{subject:'模板 Runtime 验证',dimensions:{width:320,height:180},loop:4,assetPolicy:'code-only'},beats:[{id:'a',from:0,to:4,summary:'测试'}]}),template=pack.outputTemplates;
    const files=[
      {path:'project.tosampool.json',data:JSON.stringify(template.project),mime:'application/json'},
      {path:'modules/example-scene-module.manifest.json',data:JSON.stringify(template.moduleManifest),mime:'application/json'},
      {path:'modules/example-scene-module.js',data:template.moduleSource,mime:'text/javascript'}
    ];
    const restored=await EditorVNextProjectPackage.restore(files),scene=restored.scene;scene._moduleScope='context-template-runtime';
    await EditorVNextModuleLoader.trustAndLoad(scene,['example-scene-module'],{scope:scene._moduleScope});
    const assets=await EditorVNextAssetLoader.resolve(scene,{host:EditorHost,baseUrl:location.href}),player=ToSampoolRuntimeVNext.createRuntime(scene,assets),canvas=document.createElement('canvas'),stats=player.renderTo(canvas,1);
    return {width:canvas.width,height:canvas.height,direct:stats.directObjects,capsule:stats.capsuleObjects,particles:stats.particlesDrawn,modules:Object.keys(scene.modules).length};
  });
  assert.deepEqual(result,{width:320,height:180,direct:1,capsule:1,particles:48,modules:1});
  assert.deepEqual(errors,[]);
  console.log('✓ v4 Agent Context Pack：可复制 Module / 粒子 / 图元骨架可通过实际 Runtime 渲染');
}finally{await browser.close();}
