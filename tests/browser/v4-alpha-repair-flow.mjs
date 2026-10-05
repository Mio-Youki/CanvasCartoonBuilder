#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const executablePath=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!executablePath)throw new Error('找不到 Edge，无法执行 Alpha 修边浏览器流程');
const browser=await chromium.launch({headless:true,executablePath});
try{
  const page=await browser.newPage({viewport:{width:1200,height:820}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof classicV4AlphaRepair!=='undefined'&&!!document.querySelector('#v4-classic-stage'));
  await page.evaluate(()=>{
    const source=document.createElement('canvas');source.width=24;source.height=20;const g=source.getContext('2d');g.fillStyle='#d84646';g.fillRect(0,0,24,20);g.fillStyle='#fff';g.fillRect(8,4,8,12);
    const dataUrl=source.toDataURL('image/png');ToSampoolV4Workspace.mutate(scene=>EditorVNextAssetState.addAsset(scene,{assetId:'alpha-test',name:'Alpha 修边夹具',locator:dataUrl,mime:'image/png',width:24,height:20,recipe:{backgroundRemoval:{enabled:true,color:[216,70,70],tolerance:12,feather:0,connected:false}}}));ToSampoolV4Assets.select('alpha-test');
  });
  await page.waitForFunction(()=>document.querySelectorAll('#lib .lib-item').length===1);
  await page.evaluate(()=>document.querySelector('#lib .asset-card-action.add')?.click());
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.some(item=>item.assetId==='alpha-test'));
  assert.deepEqual(await page.evaluate(async()=>Object.keys(await ToSampoolV4Workspace.runtimeAssets())),['alpha-test'],'素材卡片放入画布必须传递稳定的 v4 assetId');
  await page.evaluate(()=>classicV4AlphaRepair.open('alpha-test'));
  await page.waitForSelector('#v4-alpha-repair-stage');
  assert.equal(await page.locator('#inspector-context .inspector-kicker').textContent(),'素材 · Alpha 修边');
  const box=await page.locator('#v4-alpha-repair-stage').boundingBox();assert.ok(box&&box.width>10,'Alpha 修边必须接管中央舞台');
  await page.evaluate(()=>classicV4AlphaRepair.setTool('poly-subtract'));
  await page.mouse.click(box.x+2,box.y+2);await page.mouse.click(box.x+18,box.y+2);await page.mouse.click(box.x+2,box.y+16);
  await page.getByRole('button',{name:'完成多边形',exact:true}).click();
  const result=await page.evaluate(()=>classicV4AlphaRepair.apply());
  assert.ok(result&&result.assetId,'应用必须生成派生素材');
  await page.waitForFunction(()=>document.querySelectorAll('#lib .lib-item').length===2);
  const derived=await page.evaluate(id=>ToSampoolV4Workspace.current().assets[id],result.assetId);
  assert.equal(derived.sourceAssetId,'alpha-test');assert.equal(derived.derivation.kind,'alpha-mask');assert.equal(derived.derivation.alpha,true);assert.ok(/^data:image\/png;base64,/.test(derived.locator));assert.equal(derived.recipe.backgroundRemoval.enabled,false,'Alpha 派生必须冻结未去背景的 RGB 预处理，才能恢复原色');
  assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.type==='image').assetId,result.assetId),result.assetId,'应用必须默认替换正在场景中使用的源对象');
  assert.deepEqual(await page.evaluate(async()=>Object.keys(await ToSampoolV4Workspace.runtimeAssets()).sort()),[result.assetId],'Runtime 不应再解码仅用于溯源的原素材');
  assert.equal(await page.locator('#v4-alpha-repair-stage').count(),0,'应用后必须归还普通舞台');
  await page.evaluate(id=>classicV4AlphaRepair.open(id),result.assetId);await page.evaluate(()=>classicV4AlphaRepair.setTool('restore'));
  const restoreBox=await page.locator('#v4-alpha-repair-stage').boundingBox();assert.ok(restoreBox,'再次编辑必须重新接管修边舞台');await page.mouse.click(restoreBox.x+restoreBox.width*3/24,restoreBox.y+restoreBox.height*3/20);await page.evaluate(()=>classicV4AlphaRepair.apply());
  assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().assets).length),2,'再次修边既有派生素材必须原地更新，而不是继续复制整张图片');
  const restored=await page.evaluate(async id=>{const image=(await ToSampoolV4Workspace.runtimeAssets())[id].image,canvas=document.createElement('canvas');canvas.width=24;canvas.height=20;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return Array.from(context.getImageData(3,3,1,1).data);},result.assetId);
  assert.deepEqual(restored,[216,70,70,255],'恢复 Alpha 必须重新露出原始 RGB，而不是透明区的黑色');
  await page.evaluate(()=>document.querySelector('#lib .lib-item[data-v4-asset-id="alpha-test"] .asset-card-action.delete')?.click());
  await page.waitForFunction(()=>!ToSampoolV4Workspace.current().assets['alpha-test']);
  assert.equal(await page.locator('#lib .lib-item[data-v4-asset-id="alpha-test"]').count(),0,'删除未引用素材后，素材架不能在下次同步时复活旧卡片');
  assert.deepEqual(errors,[],'Alpha 修边流程不能产生页面异常');
  console.log('✓ v4 Alpha 修边：中央舞台、人工擦除、派生 PNG 与溯源关系通过');
}finally{await browser.close();}
