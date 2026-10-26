import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Patterns);
 await page.evaluate(()=>{if(state.playing)togglePlay();const s=EditorVNextScene.blank({width:320,height:180});s.entities=[{id:'v',type:'vector',name:'矩形',x:40,y:30,w:100,h:60,parts:[{id:'p',type:'rect',x:0,y:0,w:100,h:60,fill:'#ffd23f',stroke:'#fff',strokeWidth:2}]}];ToSampoolV4Workspace.replace(s);classicV4View.select('v');classicV4Inspector.focusExtension('v','p','ticks');classicV4Changes.clear();});
 assert.equal(await page.locator('[data-attached-pattern]').count(),0);assert.equal(await page.locator('[data-add-pattern]').isVisible(),true);
 await page.locator('[data-add-pattern]').click();const card=id=>page.locator('[data-pattern-id="'+id+'"] .asset-card-action.add');
 await card('ticks').click();assert.equal(await page.locator('[data-attached-pattern]').count(),1);
 const count=page.locator('[data-extension-param="ticks.count"]');await count.fill('37');await count.press('Tab');await page.locator('[data-extension-param="ticks.enabled"]').uncheck();
 assert.equal(await page.locator('[data-attached-pattern="ticks"]').count(),1);assert.equal(await count.count(),0);
 const stored=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current()));
 await page.evaluate(json=>{ToSampoolV4Workspace.replace(JSON.parse(json));classicV4View.select('v');classicV4Inspector.focusExtension('v','p','ticks');},stored);
 assert.equal(await page.locator('[data-extension-param="ticks.enabled"]').isChecked(),false);
 await page.locator('[data-extension-param="ticks.enabled"]').check();assert.equal(await count.inputValue(),'37');
 await page.locator('[data-add-pattern]').click();await page.locator('[data-pattern-scope-switch]').click();await card('nested').click();assert.equal(await page.locator('[data-attached-pattern]').count(),2);
 await page.locator('[data-remove-pattern="nested"]').click();assert.equal(await page.locator('[data-attached-pattern]').count(),1);assert.equal(await count.inputValue(),'37');
 await page.locator('[data-remove-pattern="ticks"]').click();assert.equal(await page.locator('[data-attached-pattern]').count(),0);
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].extensions),undefined);
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await count.inputValue(),'37');
 await page.evaluate(()=>{classicV4Changes.run('测试自定义本体',s=>{const p=s.entities[0].parts[0];EditorV4PatternRegistry.createPart(p,'brackets');});classicV4Inspector.focusExtension('v','p','brackets');});
 assert.equal(await page.locator('[data-extension-param="brackets.shape"]').isVisible(),true);assert.equal(await page.locator('[data-remove-pattern]').count(),0,'intrinsic parameters cannot be removed as attachment');
 assert.deepEqual(errors,[]);console.log('✓ 添加式拓展：空页添加入口／只显示已添加／停用保值重开／重复应用／移除及撤销／custom本体保留');
}finally{await browser.close();}
