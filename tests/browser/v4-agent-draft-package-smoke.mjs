import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),fixture=resolve(root,'tests/fixtures/agent-draft-smoke'),files=[];
function walk(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const full=resolve(folder,entry.name);if(entry.isDirectory())walk(full);else files.push({path:relative(fixture,full).split(sep).join('/'),data:readFileSync(full).toString('base64'),mime:full.endsWith('.json')?'application/json':'application/octet-stream'});}}
walk(fixture);
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage();
try{
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EditorVNextAgentDraftPackage&&window.EditorVNextProjectPackage&&window.EditorVNextAssetLoader&&window.ToSampoolRuntimeVNext);
  const result=await page.evaluate(async packed=>{
    const decode=value=>{const binary=atob(value),out=new Uint8Array(binary.length);for(let index=0;index<binary.length;index+=1)out[index]=binary.charCodeAt(index);return out;};
    const files=packed.map(file=>({path:file.path,mime:file.mime,data:decode(file.data)})),checked=EditorVNextAgentDraftPackage.inspect(files),restored=await EditorVNextProjectPackage.restore(files),assets=await EditorVNextAssetLoader.resolve(restored.scene,{host:EditorHost,baseUrl:location.href}),player=ToSampoolRuntimeVNext.createRuntime(restored.scene,assets),canvas=document.createElement('canvas'),samples=[];
    for(const time of [0,.5,1,1.5,2,2.5,3,3.5]){const start=performance.now(),stats=player.renderTo(canvas,time);samples.push({time,ms:performance.now()-start,direct:stats.directObjects,particles:stats.particlesDrawn});}
    const ordered=samples.map(item=>item.ms).sort((a,b)=>a-b),p95=ordered[Math.min(ordered.length-1,Math.ceil(ordered.length*.95)-1)];return{draftId:checked.draftId,width:canvas.width,height:canvas.height,p95,samples};
  },files);
  assert.equal(result.draftId,'smoke-winter-cabin');assert.equal(result.width,160);assert.equal(result.height,90);assert.ok(result.samples.every(item=>item.direct>=3),'草稿包必须在固定时间点实际绘制主体');assert.ok(result.samples.every(item=>item.particles===12),'草稿包必须实际运行粒子发射器');assert.ok(Number.isFinite(result.p95));
  console.log('✓ v4 Agent Draft Package Runtime smoke：固定时间、项目恢复与粒子渲染通过');
}finally{await browser.close();}
