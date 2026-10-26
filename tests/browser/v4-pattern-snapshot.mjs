import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Resources);
 const result=await page.evaluate(async()=>{
  if(state.playing)togglePlay();const scene=EditorVNextScene.blank({width:480,height:300}),part={id:'p',type:'custom',x:0,y:0,w:180,h:120,stroke:'#eb8242',strokeAlpha:1,strokeWidth:7,recipe:{id:'brackets',version:1,params:{shape:'square',layout:'corners',armX:38,armY:38,radius:0}}};
  scene.entities=[{id:'v',name:'缓存括号',type:'vector',x:110,y:70,w:180,h:120,parts:[part]}];
  const portable=JSON.parse(JSON.stringify(EditorVNextScene.preparePortable(scene))),canvas=document.createElement('canvas');
  let player=ToSampoolRuntimeVNext.createRuntime(portable);player.renderTo(canvas,0);player.dispose();const original=canvas.getContext('2d').getImageData(0,0,480,300).data.slice();
  const cached=portable.entities[0].parts[0];cached.recipe.id='future.bracket';cached.recipe.version=2;cached.geometrySnapshot.binding=ToSampoolRuntimeVNext.modules.patternSnapshots.binding(cached.recipe,cached.strokeWidth);
  player=ToSampoolRuntimeVNext.createRuntime(portable);player.renderTo(canvas,0);player.dispose();const fallback=canvas.getContext('2d').getImageData(0,0,480,300).data;
  let difference=0;for(let i=0;i<original.length;i++)difference=Math.max(difference,Math.abs(original[i]-fallback[i]));
  ToSampoolV4Workspace.replace(portable);classicV4View.select('v');classicV4Inspector.focusExtension('v','p','future.bracket');await classicV4View.render();classicV4Changes.clear();
  return{difference,pixels:Array.from(fallback).filter((n,i)=>i%4!==3&&n!==255).length};
 });
 assert.ok(result.difference<=1,'缓存须保留原生几何画面');assert.ok(result.pixels>0);
 assert.match(await page.locator('[data-pattern-snapshot]').innerText(),/内部参数暂不可编辑/);
 assert.equal(await page.locator('[data-extension-param]').count(),0);
 if(process.argv.includes('--capture')){const out=resolve(root,'docs/design/evidence/resource-r3a-2026-10-18');mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,'missing-provider.png')});}
 const artifact=await page.evaluate(async()=>{
  const scene=ToSampoolV4Workspace.current(),bundle=await EditorVNextProjectPackage.build(scene),opened=(await EditorVNextProjectPackage.restore(bundle.files)).scene;
  // Outer edits remain standard v4 edits and undo, not edits to the cached path.
  classicV4Changes.run('移动缓存对象',s=>s.entities[0].x+=50);await classicV4View.render();const moved=classicV4View.canvas.toDataURL();
  classicV4Changes.undo();await classicV4View.render();const restored=classicV4View.canvas.toDataURL();
  const id=EditorV4Resources.addPattern(opened,{id:'cached-bracket',name:'缓存括号',engineId:'future.bracket',engineVersion:2,params:opened.entities[0].parts[0].recipe.params,style:{color:'#eb8242',width:7,alpha:1},geometrySnapshot:opened.entities[0].parts[0].geometrySnapshot});
  const resources=await EditorV4Resources.capture(opened,[{kind:'pattern',id}]);ToSampoolV4Workspace.replace(opened);classicV4View.select(null);classicV4Resources.open();
  const html=EditorVNextDeliveryBuilder.embedHtml({scene:opened,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'snapshot-fallback'}).data;
  return{html,moved:moved!==restored,resources,project:opened};
 });assert.equal(artifact.moved,true);
 // An unsupported provider can still stamp its frozen preset, without a JS install.
 await page.locator('[data-resource-kind="pattern"][data-resource-id="cached-bracket"] [data-resource-action="create"]').click();
 const stage=page.locator('#'+await page.evaluate(()=>classicV4View.canvas.id)),rect=await stage.boundingBox();
 const a={x:rect.x+20/480*rect.width,y:rect.y+20/300*rect.height},b={x:rect.x+90/480*rect.width,y:rect.y+90/300*rect.height};
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:3});await page.mouse.up();
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),2);
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),1);
 const exportPage=await browser.newPage();exportPage.on('pageerror',e=>errors.push(String(e)));await exportPage.setContent(artifact.html);
 await exportPage.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'),{},{timeout:5000});
 assert.equal(await exportPage.locator('[data-tosampool-error]').count(),0,'缓存HTML失败：'+await exportPage.locator('[data-tosampool-scene]').getAttribute('data-tosampool-error'));
 const painted=await exportPage.locator('canvas').first().evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4!==3&&n!==255));assert.equal(painted,true);await exportPage.close();
 assert.deepEqual(errors,[]);console.log('✓ 图样快照浏览器：像素对照／缺失参数锁定／外层变换撤销／工程重开／缓存预设拖拽／无生成器HTML播放');
}finally{await browser.close();}
