import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.classicV4Resources&&window.EditorV4ModuleInstances);
  await page.evaluate(async()=>{
    if(state.playing)togglePlay();await classicV4Resources.stop();
    ToSampoolV4Workspace.createBlank({width:480,height:300});classicV4View.select(null);classicV4Changes.clear();
    const manifest={format:'tosampool-scene-module/v1',id:'resource-rain',version:1,title:'参数雨幕',timeDependent:true,assets:[],recommendedCanvas:{width:320,height:200},parameters:[{key:'density',label:'雨量',type:'number',default:.5,min:0,max:1,step:.1,timing:'linear-safe'},{key:'color',label:'雨色',type:'color',default:'#77bbff'}]};
    const source='window.R4_EXECUTIONS=(window.R4_EXECUTIONS||0)+1;ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:'+JSON.stringify(manifest)+',render({ctx,width,height,params,time}){ctx.fillStyle=params.color;for(let i=0;i<Math.round(params.density*20);i++){let x=(i*37)%width,y=(i*23+time*30)%height;ctx.fillRect(x-width/2,y-height/2,2,8);}}});';
    const temp=EditorVNextScene.blank();temp.modules={'resource-rain':{manifest,locator:'data:text/javascript,'+encodeURIComponent(source)}};
    window.R4_BUNDLE=await EditorV4Resources.capture(temp,[{kind:'module',id:'resource-rain'}]);
    window.classicV4Resources=EditorClassicV4ResourceController.create({workspace:ToSampoolV4Workspace,changes:classicV4Changes,view:classicV4View,patterns:classicV4Patterns,drawing:classicV4Drawing,inspector:classicV4Inspector,library:EditorV4ResourceLibrary.create({storage:EditorV4ResourceLibrary.memoryStorage()})});
  });
  assert.equal(await page.locator('[data-library-tab="collection"]').count(),0);
  const bundle=await page.evaluate(()=>JSON.stringify(R4_BUNDLE));
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(text=>classicV4Resources.importBundle(JSON.parse(text)),bundle);
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().modules?.['resource-rain']);
  assert.ok(await page.evaluate(()=>(window.R4_EXECUTIONS||0)<=1),'素材预览可以加载已在导入时授权的源码');
  await page.evaluate(()=>classicV4Resources.createModule('resource-rain'));
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().entities.length===1);
  const first=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].id);
  await page.waitForFunction(()=>document.querySelector('[data-v4-procedural-module="resource-rain"]'));
  assert.equal(await page.evaluate(()=>window.R4_EXECUTIONS),1);
  await page.evaluate(()=>{
    const field=Array.from(document.querySelectorAll('[data-v4-procedural-module] .global-field')).find(n=>n.querySelector('span')?.textContent==='雨量');
    const input=field.querySelector('input');input.value='.9';input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.evaluate(()=>classicV4Resources.createModule('resource-rain'));
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().entities.length===2);
  assert.deepEqual(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.map(e=>e.params.density)),[.9,.5]);
  assert.equal(await page.evaluate(()=>window.R4_EXECUTIONS),1,'同一会话新实例不重执行模块');
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),1);
  await page.evaluate(()=>classicV4Changes.redo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),2);
  const dynamic=await page.evaluate(()=>{
    const p=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current()),c=document.createElement('canvas');
    p.renderTo(c,0);const a=Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
    p.renderTo(c,.5);const b=Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);p.dispose();return a.some((v,i)=>v!==b[i]);
  });assert.equal(dynamic,true,'新实例是真实动态，不是静帧');
  const hash=await page.evaluate(()=>classicV4Resources.collect([{kind:'module',id:'resource-rain',version:1}]));
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:480,height:300});classicV4Changes.clear();classicV4View.select(null);});
  page.once('dialog',dialog=>dialog.accept());await page.evaluate(hash=>classicV4Resources.take(hash),hash);
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().modules?.['resource-rain']);
  assert.ok(await page.evaluate(()=>window.R4_EXECUTIONS<=2),'跨工程重新授权；素材预览可加载');
  await page.evaluate(()=>classicV4Resources.createModule('resource-rain'));
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().entities.length===1);
  assert.equal(await page.evaluate(()=>window.R4_EXECUTIONS),2,'新工程重新确认并注册独立作用域');
  await page.evaluate(async hash=>{await classicV4Resources.remove(hash);},hash);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),1,'删除收藏不影响实例');
  const roundtrip=await page.evaluate(async()=>{
    const built=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current(),{projectId:'r4',displayName:'雨幕'});
    const restored=await EditorVNextProjectPackage.restore(built.files);return restored.scene;
  });assert.equal(roundtrip.entities[0].params.density,.5);assert.ok(roundtrip.modules['resource-rain']);
  const html=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.current(),id='resource-rain';
    return EditorVNextDeliveryBuilder.embedHtml({scene,runtimeSource:__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__,name:'r4-rain',moduleSources:{[id]:EditorVNextModuleLoader.dataUrlText(scene.modules[id].locator)}}).data;
  });
  const exported=await browser.newPage();exported.on('pageerror',error=>errors.push(String(error)));
  await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));
  assert.equal(await exported.locator('[data-tosampool-error]').count(),0);
  const frameA=await exported.locator('canvas').evaluate(c=>c.toDataURL());await exported.waitForTimeout(200);
  assert.notEqual(await exported.locator('canvas').evaluate(c=>c.toDataURL()),frameA,'交付HTML保持真实运动');await exported.close();
  // Confirmation may yield to other edits: stale operations cannot create in a new document.
  const stale=await page.evaluate(async()=>{
    await classicV4Resources.stop();ToSampoolV4Workspace.createBlank();
    await EditorV4Resources.importInto(ToSampoolV4Workspace.current(),R4_BUNDLE);
    let resume;const confirmed=new Promise(resolve=>resume=resolve);
    window.classicV4Resources=EditorClassicV4ResourceController.create({workspace:ToSampoolV4Workspace,changes:classicV4Changes,view:classicV4View,patterns:classicV4Patterns,drawing:classicV4Drawing,inspector:classicV4Inspector,library:EditorV4ResourceLibrary.create({storage:EditorV4ResourceLibrary.memoryStorage()}),confirmModule:()=>confirmed});
    const job=classicV4Resources.importBundle(R4_BUNDLE).then(()=>false,error=>/工程已变化/.test(error.message));
    ToSampoolV4Workspace.createBlank();resume(true);return await job;
  });assert.equal(stale,true);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0);
  await page.evaluate(()=>classicV4Resources.open());
  await page.locator('#file').setInputFiles(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'));
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().modules?.['example.rain-curtain']);
  // The test-only deferred confirmer above remains installed: replace it with the real browser dialog.
  await page.evaluate(async()=>{await classicV4Resources.stop();window.classicV4Resources=EditorClassicV4ResourceController.create({workspace:ToSampoolV4Workspace,changes:classicV4Changes,view:classicV4View,patterns:classicV4Patterns,drawing:classicV4Drawing,inspector:classicV4Inspector,library:EditorV4ResourceLibrary.create({storage:EditorV4ResourceLibrary.memoryStorage()})});classicV4Resources.open();});
  await page.evaluate(()=>classicV4Resources.createModule('example.rain-curtain'));
  await page.waitForFunction(()=>!classicV4Resources.busy&&ToSampoolV4Workspace.current().entities.length===1);
  assert.equal(await page.locator('[data-v4-procedural-module="example.rain-curtain"] .global-field').count(),4);
  if(process.argv.includes('--capture')){
    await page.waitForTimeout(200);
    const evidence=resolve(root,'docs/design/evidence/resource-r4a-2026-10-19');mkdirSync(evidence,{recursive:true});await page.screenshot({path:resolve(evidence,'instances.png')});
  }
  assert.deepEqual(errors,[]);console.log('✓ R4a 浏览器：真实导入／取消与授信／多实例参数／动态像素／撤销／收藏跨工程／保存／过期确认拦截');
}finally{await browser.close();}
