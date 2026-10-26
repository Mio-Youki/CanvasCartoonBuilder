import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Sharing);
 const publication=await page.evaluate(async()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4Changes.run('准备图样',s=>EditorV4Resources.addPattern(s,{id:'marks',name:'独立图样发布',engineId:'brackets',params:{layout:'corners',armX:22},style:{width:3,color:'#ffaa00'}}));const ref={kind:'pattern',id:'marks'},result=await classicV4Sharing.service.publish(ToSampoolV4Workspace.current(),ref);classicV4Changes.run('记录图样共享',s=>classicV4Sharing.service.setLink(s,ref,result.link));return result.record.id;});
 await page.locator('#toolbar-image').click();await page.locator('[data-material-scope-switch]').click();await page.evaluate(()=>classicV4Sharing.refresh());
 assert.equal(await page.locator('#v4-shared-materials [data-publication-id="'+publication+'"]').count(),0,'pattern publications must not masquerade as bitmap cards');
 const transfer=await page.evaluate(async id=>{ToSampoolV4Workspace.createBlank({width:160,height:96});const result=await classicV4Sharing.service.take(ToSampoolV4Workspace.current(),id);classicV4Changes.run('取用图样定义',s=>{for(const key of ['assets','patternResources','patternDefinitions','materialShares','resourceOrigins'])if(result.scene[key])s[key]=result.scene[key];});const scene=ToSampoolV4Workspace.current(),pkg=await EditorVNextProjectPackage.build(scene),restored=await EditorVNextProjectPackage.restore(pkg.files);return{count:scene.entities.length,kind:result.selection.kind,size:Object.keys(restored.scene.patternResources).length,arm:restored.scene.patternResources[result.selection.id].params.armX};},publication);
 assert.deepEqual(transfer,{count:0,kind:'pattern',size:1,arm:22});await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources||{}).length),0);
 await page.evaluate(()=>{classicV4Changes.run('矩形',s=>s.entities=[{id:'shape',type:'rect',name:'附着图样',x:20,y:20,w:60,h:40,fill:'#fff'}]);classicV4Changes.run('添加刻度',s=>EditorV4PatternRegistry.enable(s.entities[0],'ticks'));classicV4View.select('shape');});
 await page.locator('#btn-store-element').click();await page.evaluate(()=>classicV4Materials.settled());assert.equal(await page.locator('[data-element-preset-id]').count(),1,'new membership must not prevent material capture');
 assert.deepEqual(errors,[]);console.log('✓ 图样共享隔离：真实共享库持久化／素材页不混入图样卡／跨工程取用不建画布／保存重开与撤销／附着图样元素真实入库');
}finally{await browser.close();}
