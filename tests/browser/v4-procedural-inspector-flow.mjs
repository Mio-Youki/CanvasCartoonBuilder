import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=procedural-inspector',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&typeof classicV4Inspector!=='undefined'&&typeof classicV4View!=='undefined');
  await page.evaluate(()=>{
    const manifest={format:'tosampool-scene-module/v1',id:'inspector-cabin',version:1,title:'参数小屋',purpose:'以 Manifest 控制，不向编辑器公开源码。',parameters:[
      {key:'warmth',label:'窗光强度',type:'number',default:.5,min:0,max:1,step:.1,timing:'linear-safe'},
      {key:'tone',label:'窗光颜色',type:'color',default:'#ffcc66'},
      {key:'roof',label:'屋顶样式',type:'select',default:'gable',options:[{value:'gable',label:'尖顶'},{value:'flat',label:'平顶'}]},
      {key:'snow',label:'积雪',type:'boolean',default:true}
    ]};
    const scope=ToSampoolV4Workspace.nextModuleScope();
    ToSampoolRuntimeVNext.modules.sceneModules.withScope(scope,()=>ToSampoolRuntimeVNext.modules.sceneModules.register({manifest,render({ctx,width,height,params}){ctx.fillStyle=params.tone;ctx.fillRect(-width/2,-height/2,width,height);}}));
    ToSampoolV4Workspace.replace({format:'tosampool-scene/v4',width:96,height:64,loop:4,assets:{},entities:[{id:'cabin',name:'参数小屋',type:'procedural',moduleId:'inspector-cabin',moduleVersion:1,params:{},x:0,y:0,w:48,h:32,scaleX:1,scaleY:1,alpha:1}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}},{moduleScope:scope});
    classicV4View.select('cabin');
  });
  await page.waitForFunction(()=>document.querySelector('[data-v4-procedural-module="inspector-cabin"]'));
  const labels=await page.locator('[data-v4-procedural-module="inspector-cabin"] .global-field > span').allTextContents();
  assert.deepEqual(labels,['窗光强度','窗光颜色','屋顶样式','积雪'],'Inspector must expose only Manifest-declared procedural parameters');
  const updated=await page.evaluate(()=>{
    const field=Array.from(document.querySelectorAll('[data-v4-procedural-module="inspector-cabin"] .global-field')).find(node=>node.querySelector('span')?.textContent==='窗光强度');
    const input=field.querySelector('input');input.value='0.8';input.dispatchEvent(new Event('change',{bubbles:true}));
    return ToSampoolV4Workspace.current().entities[0].params.warmth;
  });
  assert.equal(updated,.8,'Manifest number control must update procedural params');
  const undoPixels=await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));const canvas=document.querySelector('#v4-classic-stage'),before=[...canvas.getContext('2d').getImageData(20,16,1,1).data];classicV4Changes.run('修改程序构件色彩',scene=>scene.entities[0].params={tone:'#0033cc'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const changed=[...canvas.getContext('2d').getImageData(20,16,1,1).data];classicV4Shortcuts.undo();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const restored=[...canvas.getContext('2d').getImageData(20,16,1,1).data];return{before,changed,restored,scope:ToSampoolV4Workspace.moduleScope};});
  assert.notDeepEqual(undoPixels.changed,undoPixels.before,'程序构件参数修改必须重绘画布');
  assert.deepEqual(undoPixels.restored,undoPixels.before,'程序构件参数撤销必须重绘回历史画面，而非仅撤回选择框');
  assert.match(undoPixels.scope,/workspace-/, '撤销后必须仍在同一 Workspace Module 作用域');
  await page.click('#btn-timing-mode');
  const timed=await page.evaluate(()=>{
    const field=Array.from(document.querySelectorAll('[data-v4-procedural-module="inspector-cabin"] .global-field')).find(node=>node.querySelector('span')?.textContent==='窗光强度');
    const input=field.querySelector('input');input.value='0.3';input.dispatchEvent(new Event('change',{bubbles:true}));
    return ToSampoolV4Workspace.current().timeline.tracks.cabin?.segments?.[0]?.values?.['params.warmth'];
  });
  assert.equal(timed,.3,'linear-safe Manifest param must use the shared object timing track when armed');
  assert.deepEqual(errors,[],'procedural Inspector must not trigger page errors');
  console.log('✓ V4 Procedural Inspector：Manifest 参数、受控写入与对象时序轨道通过');
} finally { await browser.close(); }
