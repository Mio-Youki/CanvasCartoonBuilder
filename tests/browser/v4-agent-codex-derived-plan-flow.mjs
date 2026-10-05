import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.EditorVNextAgentCreativeBridge&&window.EditorVNextCodexDerivedPlan);
  await page.evaluate(()=>{
    const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wHwMDEwMDAwMAAA0gAgGKV2VRAAAAAElFTkSuQmCC';
    ToSampoolV4Workspace.mutate(scene=>{scene.assets={photo:{name:'山谷照片',locator:png,mime:'image/png',width:1200,height:800,recipe:{width:1200,height:800}}};scene.entities=[];});
    ToSampoolV4Assets.select('photo');
    const bridge=EditorVNextAgentCreativeBridge.create({target:window,timeout:1000});
    window.ToSampoolV4AgentAdapter=bridge;
    window.addEventListener(EditorVNextAgentCreativeBridge.REQUEST,event=>{
      const detail=event.detail||{},payload=detail.payload||{};
      if(detail.kind!=='propose'||payload.phase!=='derive-plan')return;
      const result=EditorVNextCodexDerivedPlan.response({plan:{format:'tosampool-derived-asset-plan/v1',summary:'Codex 已识别前景人物、山脊与天空；请先逐项确认位置和遮挡补全。',tasks:[
        {id:'hiker',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'红衣徒步者',roi:{x:.42,y:.36,w:.11,h:.35},occlusionRepair:false,notes:'保留完整人物轮廓。'},
        {id:'ridge',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'近景山脊',roi:{x:.05,y:.25,w:.9,h:.7},occlusionRepair:true,notes:'人物移开后需补全被遮挡区域。'},
        {id:'sky',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'天空',roi:{x:0,y:0,w:1,h:.52},occlusionRepair:true,notes:'山脊边缘需要向外延展。'}
      ]}},payload);
      window.dispatchEvent(new CustomEvent(EditorVNextAgentCreativeBridge.RESPONSE,{detail:{requestId:detail.requestId,result}}));
    });
  });
  await page.click('#btn-generate');
  await page.getByRole('button',{name:'派生素材'}).click();
  await page.getByRole('button',{name:'添加素材所选'}).click();
  await page.locator('.agent-creative-wizard [name="prompt"]').fill('把这张山谷照片分离为可移动人物、山脊和天空');
  await page.locator('.agent-creative-composer').evaluate(form=>form.requestSubmit());
  await page.waitForSelector('.agent-creative-derive .agent-creative-derive-task');
  assert.equal(await page.locator('.agent-creative-derive-task').count(),4,'Codex 三张计划卡应加上编辑器自动维护的背景卡');
  assert.equal(await page.locator('.agent-creative-derive-task').nth(0).locator('input[aria-label]').inputValue(),'红衣徒步者');
  assert.equal(await page.locator('.agent-creative-derive-task').nth(1).locator('input[aria-label]').inputValue(),'近景山脊');
  assert.equal(await page.locator('.agent-creative-derive-task').nth(2).locator('input[aria-label]').inputValue(),'天空');
  assert.match(await page.locator('.agent-creative-derive-task').nth(2).textContent(),/遮挡补全：是/);
  assert.match(await page.locator('.agent-creative-chat').textContent(),/Codex 已识别前景人物/);
  assert.deepEqual(errors,[]);
  console.log('✓ v4 Codex 规划桥：宿主计划卡已替代本地派生兜底');
}finally{await browser.close();}
