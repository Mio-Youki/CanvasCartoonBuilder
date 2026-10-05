import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),dialogs=[];
page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});

try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace&&window.openV4ProjectDocument&&window.EditorVNextProjectPackage);
  const result=await page.evaluate(async()=>{
    const svg=color=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="${color}"/></svg>`);
    const make=(projectId,title,color,moduleColor)=>{
      const manifest={format:'tosampool-scene-module/v1',id:'same-project-module',version:1,title,parameters:[]};
      const source=`window.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render({ctx,width,height}){ctx.fillStyle=${JSON.stringify(moduleColor)};ctx.fillRect(-width/2,-height/2,width,height);}});`;
      const scene={format:'tosampool-scene/v4',width:8,height:6,loop:1,assets:{image:{name:title+' asset',locator:svg(color),mime:'image/svg+xml',width:8,height:6}},modules:{'same-project-module':{manifest,source:'data:text/javascript;charset=utf-8,'+encodeURIComponent(source)}},entities:[{id:'module-object',type:'procedural',moduleId:'same-project-module',moduleVersion:1,x:0,y:0,w:8,h:6}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};
      return EditorVNextProjectPackage.build(scene,{projectId,displayName:title});
    };
    const packedA=await make('project-a','Project A','#aa1100','#aa1100');
    const packedB=await make('project-b','Project B','#0011aa','#0011aa');
    await openV4ProjectDocument({name:'project-a.tosampool.zip',files:packedA.files});
    const first=document.createElement('canvas');await ToSampoolV4Workspace.renderTo(first,0);
    const aPixel=[...first.getContext('2d').getImageData(3,3,1,1).data];
    await new Promise(resolve=>setTimeout(resolve,30));
    const shelfA=document.querySelector('#lib').textContent;
    await openV4ProjectDocument({name:'project-b.tosampool.zip',files:packedB.files});
    const second=document.createElement('canvas');await ToSampoolV4Workspace.renderTo(second,0);
    const bPixel=[...second.getContext('2d').getImageData(3,3,1,1).data];
    await new Promise(resolve=>setTimeout(resolve,30));
    return {aPixel,bPixel,shelfA,shelfB:document.querySelector('#lib').textContent,scope:ToSampoolV4Workspace.moduleScope};
  });
  assert.ok(result.aPixel[0]>150&&result.aPixel[2]<80,'项目 A 应渲染自己的同名 Module');
  assert.ok(result.bPixel[2]>150&&result.bPixel[0]<80,'项目 B 应替换为自己的同名 Module');
  assert.match(result.shelfA,/Project A asset/);
  assert.match(result.shelfB,/Project B asset/);
  assert.doesNotMatch(result.shelfB,/Project A asset/,'打开项目 B 后素材栏不得残留项目 A');
  assert.equal(result.scope,'project:project-b');
  assert.equal(dialogs.length,2,'每个项目的程序构件都必须单独请求信任');
  console.log('✓ V4 项目会话隔离：连续打开同名 Module 项目时 Runtime 与素材栏互不污染通过');
} finally { await browser.close(); }
