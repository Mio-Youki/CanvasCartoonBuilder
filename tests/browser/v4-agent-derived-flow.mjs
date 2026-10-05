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
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.ToSampoolV4AgentCreative&&window.ToSampoolV4Assets);
  await page.evaluate(()=>{
    const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wHwMDEwMDAwMAAA0gAgGKV2VRAAAAAElFTkSuQmCC';
    ToSampoolV4Workspace.mutate(scene=>{scene.assets={photo:{name:'徒步照片',locator:png,mime:'image/png',width:2,height:2,recipe:{width:2,height:2}}};scene.entities=[];});
    ToSampoolV4Assets.select('photo');
    window.ToSampoolV4DerivedAssetAdapter={derive:async task=>({format:'tosampool-derived-asset/v1',taskId:task.id,asset:{id:'hiker-cutout',name:'徒步者透明候选',width:2,height:2,frames:[{locator:png,mime:'image/png'}],derivation:{kind:task.kind,semantic:task.semantic,alpha:true,method:'browser-fixture'}}})};
  });
  await page.click('#btn-generate');
  await page.getByRole('button',{name:'派生素材'}).click();
  await page.getByRole('button',{name:'添加素材所选'}).click();
  await page.getByRole('button',{name:'变体生成'}).click();
  await page.waitForFunction(()=>document.querySelector('.agent-creative-context button[aria-pressed="true"]')?.textContent==='变体生成');
  assert.match(await page.locator('.agent-creative-chat').textContent(),/已切换为“变体生成”/);
  await page.getByRole('button',{name:'素材分层'}).click();
  await page.waitForFunction(()=>document.querySelector('.agent-creative-context button[aria-pressed="true"]')?.textContent==='素材分层');
  await page.locator('.agent-creative-wizard [name="prompt"]').fill('分离照片中的徒步者');
  await page.locator('.agent-creative-composer').evaluate(form=>form.requestSubmit());
  await page.waitForSelector('.agent-creative-derive .agent-creative-derive-task');
  assert.equal(await page.locator('.agent-creative-derive-task').count(),2,'素材分层应包含 Agent 目标和自动残余背景任务');
  assert.match(await page.locator('.agent-creative-derive-task').first().textContent(),/遮挡补全：否/,'分层卡必须暴露遮挡补全字段');
  await page.locator('.agent-creative-derive-task').first().locator('input[type="checkbox"]').check();
  await page.waitForFunction(()=>/遮挡补全：是/.test(document.querySelector('.agent-creative-derive-task')?.textContent||''));
  await page.getByRole('button',{name:'位置：已定位'}).click();
  await page.waitForSelector('.agent-roi-wizard .agent-roi-selection');
  await page.getByRole('button',{name:'应用位置'}).click();
  await page.locator('.agent-creative-derive-task').first().click();
  await page.getByRole('button',{name:'生成第一轮 Alpha 候选'}).click();
  await page.waitForSelector('.agent-creative-derive img.agent-creative-draft-preview');
  assert.equal(await page.evaluate(()=>Boolean(ToSampoolV4Workspace.current().assets['hiker-cutout'])),false,'生成候选不得提前写入素材栏');
  await page.getByRole('button',{name:'接受到素材栏'}).click();
  await page.waitForFunction(()=>Boolean(ToSampoolV4Workspace.current().assets['hiker-cutout']));
  assert.deepEqual(errors,[]);
  console.log('✓ v4 Agent 创作：派生素材先出方案与透明候选，接受后才进入素材栏');
}finally{await browser.close();}
