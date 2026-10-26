import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Materials);
 await page.evaluate(()=>{if(state.playing)togglePlay();const s=EditorVNextScene.blank({width:160,height:96});s.entities=[{id:'a',name:'来源',type:'rect',x:20,y:20,w:30,h:20,fill:'#ff5533'}];ToSampoolV4Workspace.replace(s);classicV4View.select('a');classicV4Changes.clear();});
 await page.locator('#btn-store-element').click();assert.equal(await page.locator('#btn-store-element').getAttribute('data-material-command'),'update');
 const key=await page.locator('[data-element-preset-id]').getAttribute('data-element-preset-id');
 await page.evaluate(key=>{classicV4Materials.place(key);classicV4Changes.run('修改来源',s=>{s.entities.find(e=>e.id==='a').w=45;s.entities.find(e=>e.id==='a').name='来源改名';s.elementPresets[key].name='素材改名';});classicV4View.select('a');},key);
 await page.locator('#btn-store-element').click();assert.deepEqual(await page.evaluate(key=>({count:Object.keys(ToSampoolV4Workspace.current().elementPresets).length,w:ToSampoolV4Workspace.current().elementPresets[key].root.w,name:ToSampoolV4Workspace.current().elementPresets[key].name,other:ToSampoolV4Workspace.current().entities[1].w}),key),{count:1,w:45,name:'素材改名',other:30});
 page.once('dialog',d=>d.accept());await page.locator('[data-element-preset-id] [data-material-action="remove"]').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),2);assert.equal(await page.locator('#btn-store-element').getAttribute('data-material-command'),'store');
 await page.evaluate(()=>classicV4Changes.undo());await page.locator('[data-element-preset-id]').waitFor();
 await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=8;c.getContext('2d').fillRect(0,0,8,8);const [r]=ToSampoolV4Assets.importPrepared({name:'图片',locator:c.toDataURL(),width:8,height:8});ToSampoolV4Assets.addToScene(r.assetId);await syncClassicV4AssetShelf();classicV4Patterns.open('assets');});
 const image=page.locator('[data-v4-asset-id]').first(),imageId=await image.getAttribute('data-v4-asset-id'),canvasBefore=await page.locator('#v4-classic-stage').evaluate(c=>c.toDataURL());
 await image.locator('.nm').click();await image.locator('.nm').click();assert.equal(await page.locator('.wizard-mask').count(),0,'名称点击只选择，不进入预处理');
 await image.locator('canvas').click();await page.locator('.wizard-mask .asset-process-grid').waitFor();await page.locator('.wizard-mask button').filter({hasText:'取消'}).click();assert.equal(await page.locator('.wizard-mask').count(),0);
 page.once('dialog',d=>d.accept());await image.locator('.delete').click();await page.waitForFunction(()=>!document.querySelector('[data-v4-asset-id]'));assert.equal(await page.locator('#v4-classic-stage').evaluate(c=>c.toDataURL()),canvasBefore);
 const saved=await page.evaluate(async id=>{const scene=(await EditorVNextProjectPackage.restore((await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current())).files)).scene;return{hidden:scene.assets[id].libraryHidden,used:scene.entities.some(e=>e.assetId===id),source:!!scene.assets[id].locator};},imageId);assert.deepEqual(saved,{hidden:true,used:true,source:true});
 await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4Patterns.open('assets');});assert.equal(await page.locator('#v4-module-management').count(),0);
 page.once('dialog',d=>d.dismiss());await page.locator('#file').setInputFiles(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'));await page.waitForFunction(()=>document.getElementById('m-import').textContent.includes('已取消导入'));assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().modules||{}).length),0);
 page.once('dialog',d=>d.accept());await page.locator('#file').setInputFiles(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'));await page.locator('[data-element-preset-id]').waitFor();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0);
 let unexpected=0;page.on('dialog',d=>{unexpected++;void d.dismiss();});await page.locator('[data-material-action="place"]').click();await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===1);await page.locator('[data-material-action="place"]').click();await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===2);assert.equal(unexpected,0);
 assert.deepEqual(errors,[]);console.log('✓ 素材生命周期浏览器：首次入库关联／更新图标／改名稳定／更新不改其他实例／删除与撤销／图片不丢来源／仅导入确认，重复新建不再弹窗');
}finally{await browser.close();}
