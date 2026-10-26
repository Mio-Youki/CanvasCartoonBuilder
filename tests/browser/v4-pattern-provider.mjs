import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const source=JSON.parse(readFileSync(resolve(root,'examples/resources/folded-frame.tosampool-pattern.json'),'utf8'));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Resources);
 await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:480,height:300});classicV4View.select(null);classicV4Changes.clear();});
 await page.locator('[data-library-tab="patterns"]').click();
 const shelf=page.locator('#v4-pattern-cards'),file=shelf.locator('[data-pattern-import]');
 const upload=async data=>{await file.setInputFiles({name:'frame.tosampool-pattern.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.evaluate(()=>classicV4ResourceEntries.settled());};
 await upload(source);assert.equal(await shelf.locator('[data-pattern-maintenance] [data-pattern-provider]').count(),1);
 const preset=await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources)[0]);
 await shelf.locator('[data-pattern-resource-id="'+preset+'"] .asset-card-action.add').click();
 const canvas=page.locator('#'+await page.evaluate(()=>classicV4View.canvas.id)),rect=await canvas.boundingBox();
 const a={x:rect.x+100/480*rect.width,y:rect.y+75/300*rect.height},b={x:rect.x+300/480*rect.width,y:rect.y+225/300*rect.height};
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('#inspector-context [data-pattern-provider]').count(),1);assert.equal(await page.locator('[data-extension-param^="provider."]').count(),5);
 const image=await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();});
 const arm=page.locator('[data-extension-param="provider.arm"]');await arm.fill('45');await arm.press('Tab');
 const changed=await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();});assert.notEqual(image,changed);
 const v2=structuredClone(source);v2.version=2;v2.paths[0].points[0][0].constant=8;
 await upload(v2);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.version),1,'安装新版本不应自动改变实例');
 const provider=version=>shelf.locator('[data-pattern-provider="user.folded-frame@'+version+'"]');
 await shelf.locator('[data-pattern-maintenance] summary').click();await provider(2).locator('[data-pattern-action="upgrade"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.version),2);
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.params.arm),45);
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.version),1);
 await page.evaluate(()=>classicV4Changes.redo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe.version),2);
 const live=await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();});
 await shelf.locator('[data-pattern-maintenance] summary').click();await provider(2).locator('[data-pattern-action="uninstall"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
 assert.equal(await page.locator('[data-pattern-snapshot]').count(),1);assert.equal(await page.locator('[data-extension-param^="provider."]').count(),0);
 const cached=await page.evaluate(async()=>{await classicV4View.render();return classicV4View.canvas.toDataURL();});assert.equal(cached,live,'停用应保留实际画面');
 const frozenHtml=await page.evaluate(()=>EditorVNextDeliveryBuilder.embedHtml({scene:ToSampoolV4Workspace.current(),runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'uninstalled-template'}).data);
 await upload(v2);assert.equal(await page.locator('#inspector-context [data-pattern-provider]').count(),1);assert.equal(await arm.inputValue(),'45');
 if(process.argv.includes('--capture')){const out=resolve(root,'docs/design/evidence/resource-r3b-2026-10-18');mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,'provider.png')});}
 const before=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));
 await upload({...v2,name:'同版本的另一实现'});assert.equal(await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current())),before);assert.match(await shelf.innerText(),/冲突/);
 await upload({...v2,code:'window.PROVIDER_EXECUTED=true;'});assert.equal(await page.evaluate(()=>!!window.PROVIDER_EXECUTED),false);assert.equal(await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current())),before);
 const artifacts=await page.evaluate(async source=>{
  const current=ToSampoolV4Workspace.current(),project=await EditorVNextProjectPackage.build(current),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;
  const presetId=Object.keys(opened.patternResources)[0],resource=await EditorV4Resources.capture(opened,[{kind:'pattern',id:presetId}]),copied=EditorVNextScene.blank({width:480,height:300});await EditorV4Resources.importInto(copied,resource);
  const target=EditorVNextScene.blank({width:480,height:300}),other=JSON.parse(JSON.stringify(source));other.version=2;other.paths[0].points[0][0].constant=23;other.name='其他工程定义';EditorV4PatternLifecycle.install(target,other);target.entities=JSON.parse(JSON.stringify(opened.entities));EditorV4PatternLifecycle.upgrade(target,'user.folded-frame@2');
  const canvas=document.createElement('canvas'),first=ToSampoolRuntimeVNext.createRuntime(opened),second=ToSampoolRuntimeVNext.createRuntime(target);
  first.renderTo(canvas,0);const a=canvas.toDataURL();second.renderTo(canvas,0);const b=canvas.toDataURL();first.renderTo(canvas,0);const again=canvas.toDataURL();first.dispose();second.dispose();
  return{isolated:a!==b&&a===again,definitions:Object.keys(copied.patternDefinitions).length,html:EditorVNextDeliveryBuilder.embedHtml({scene:opened,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'template-project'}).data};
 },source);assert.equal(artifacts.isolated,true);assert.equal(artifacts.definitions,1);
 const clipboard=await page.evaluate(source=>{
  const original=JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()));classicV4View.select(original.entities[0].id);classicV4Shortcuts.copy();
  const target=EditorVNextScene.blank(),other=JSON.parse(JSON.stringify(source));other.version=2;other.name='冲突工程定义';EditorV4PatternLifecycle.install(target,other);ToSampoolV4Workspace.replace(target);classicV4View.select(null);
  const before=EditorVNextScene.serialize(ToSampoolV4Workspace.current());let rejected=false;try{classicV4Shortcuts.paste();}catch(error){rejected=/冲突/.test(error.message);}const untouched=before===EditorVNextScene.serialize(ToSampoolV4Workspace.current());
  ToSampoolV4Workspace.createBlank();classicV4View.select(null);classicV4Changes.clear();classicV4Shortcuts.paste();const copied=!!ToSampoolV4Workspace.current().patternDefinitions['user.folded-frame@2'];classicV4Changes.undo();const undone=ToSampoolV4Workspace.current().entities.length===0&&!ToSampoolV4Workspace.current().patternDefinitions;
  return{rejected,untouched,copied,undone};
 },source);assert.deepEqual(clipboard,{rejected:true,untouched:true,copied:true,undone:true});
 const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));
 for(const html of [artifacts.html,frozenHtml]){
  await exported.setContent(html);
  try{await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'),{},{timeout:5000});}catch(error){throw Error('图样HTML未就绪：'+JSON.stringify(errors)+' / '+await exported.locator('body').innerHTML().then(text=>text.slice(-600)));}
  assert.equal(await exported.locator('[data-tosampool-error]').count(),0,'图样HTML失败：'+await exported.locator('[data-tosampool-scene]').getAttribute('data-tosampool-error'));
 }
 await exported.setContent(artifacts.html+frozenHtml);await exported.waitForFunction(()=>document.querySelectorAll('[data-tosampool-ready="1"]').length===2,{},{timeout:5000});
 assert.equal(await exported.locator('[data-tosampool-error]').count(),0);await exported.close();
 assert.deepEqual(errors,[]);console.log('✓ 图样定义浏览器：文件热导入／声明式面板与真实画面／版本不自动升级／显式更新撤销／停用保真／精确重装／失败回滚／工程资源HTML／双Player隔离');
}finally{await browser.close();}
