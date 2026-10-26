import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const closeColors=await page.evaluate(()=>{
    const api=ToSampoolRuntimeVNext.modules,surfaces=api.surfaces.create(),source=document.createElement('canvas');source.width=8;source.height=8;const ctx=source.getContext('2d'),image=ctx.createImageData(8,8);
    for(let i=0;i<64;i++)image.data.set([128+i%8,128+(i>>3),128,255],i*4);ctx.putImageData(image,0,0);
    const counts=[2,4,8,16,32,64].map(colors=>{const out=api.sampling.colorMap(source,{palette:'auto',colors},surfaces,0),data=out.getContext('2d').getImageData(0,0,8,8).data,values=new Set();for(let i=0;i<data.length;i+=4)values.add(Array.from(data.slice(i,i+3)).join(','));surfaces.release(out);return values.size;});surfaces.clear();return counts;
  });assert.deepEqual(closeColors,[2,4,8,16,32,64]);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:100,loop:4});
    classicV4Changes.run('取色夹具',scene=>{scene.entities=[{id:'target',type:'rect',x:5,y:20,w:60,h:60,fill:'#dd3322',fillPaint:{type:'linear',angle:0,stops:[{offset:0,color:'#330000',alpha:1},{offset:1,color:'#ff6622',alpha:1}]}}];});classicV4View.select(null);
  });
  await page.click('#global-inspector-tabs [data-global-inspector="sampling"]');
  const card=page.locator('[data-v4-effect-id="color-map"]'),enable=()=>card.locator('.global-field').filter({hasText:'启用'}).locator('input[type="checkbox"]'),refresh=()=>card.locator('[data-color-map-extract]'),count=()=>card.locator('.global-field').filter({hasText:'最大颜色数'}).locator('select');
  await enable().click();await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['color-map']?.extracted||document.querySelector('[role="alert"]'),{},{timeout:6000});
  assert.equal(await page.locator('[role="alert"]').count(),0,JSON.stringify({errors,text:await card.innerText()}));
  const first=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted));
  const before=await page.evaluate(()=>{const player=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current()),canvas=document.createElement('canvas');player.renderTo(canvas,0);const color=Array.from(canvas.getContext('2d').getImageData(30,40,1,1).data);player.dispose();return color;});
  await page.evaluate(()=>classicV4Changes.run('移动和背景修改',scene=>{scene.entities[0].x=75;scene.background.color='#00ff00';(scene.timeline.scenes||[]).forEach(s=>{if(s.background)s.background.color='#00ff00';});}));
  const moved=await page.evaluate(()=>{const player=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current()),canvas=document.createElement('canvas');player.renderTo(canvas,1.2);const color=Array.from(canvas.getContext('2d').getImageData(100,40,1,1).data);player.dispose();return color;});
  assert.deepEqual(moved,before,'移动和背景变化不能悄悄重提取已固定色板');assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted)),first);
  await refresh().click();await page.waitForFunction(old=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted)!==old,first);
  const refreshed=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted));
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted)),first);await page.evaluate(()=>classicV4Changes.redo());
  assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted)),refreshed);
  await count().selectOption('2');await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted?.colors===2);
  await count().selectOption('64');await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].extracted?.colors===64);
  const persisted=await page.evaluate(()=>{const current=ToSampoolV4Workspace.current(),json=EditorVNextScene.serialize(current),roundtrip=JSON.parse(json),render=scene=>{const p=ToSampoolRuntimeVNext.createRuntime(scene),c=document.createElement('canvas');p.renderTo(c,.6);const value=c.toDataURL();p.dispose();return value;};return {data:JSON.stringify(roundtrip.sceneEffects.sample['color-map'].extracted),same:render(current)===render(roundtrip)};});assert.ok(persisted.same);
  await page.evaluate(()=>{classicV4View.select('target');classicV4Inspector.focusEffect('object','target','color-map');});
  await enable().check();await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0].effects?.sample?.['color-map']?.extracted);
  const objectPalette=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].extracted.entries);
  assert.ok(objectPalette.every(p=>p[0]>p[1]),'对象取色不得混入场景绿色背景或场景滤镜');
  await page.evaluate(()=>{classicV4Changes.run('时段',scene=>{scene.timeline.tracks['effect:object:target:color-map']={segments:[{f:[0,.5],values:{}},{f:[.5,1],values:{}}]};});classicV4Timeline.seek(.2);classicV4Inspector.focusEffect('object','target','color-map');});
  const timing=page.locator('#btn-timing-mode');if(await timing.evaluate(node=>node.classList.contains('active')))await timing.click();await timing.click();
  await count().selectOption('4');await page.waitForFunction(()=>ToSampoolV4Workspace.current().timeline.tracks['effect:object:target:color-map'].segments[0].values.extracted?.colors===4);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].colors),16,'时序只改变当前效果段，不能覆盖基础色板');
  // Async extraction must not attach old data to a newly opened project.
  const isolation=await page.evaluate(async()=>{
    let release,revision=1;const documentAtStart=ToSampoolV4Workspace.current(),fake={revision:1,current:()=>documentAtStart,moduleScope:ToSampoolV4Workspace.moduleScope,runtimeAssets:()=>new Promise(resolve=>release=resolve)};
    const job=EditorClassicV4ColorMapControl.extract({workspace:fake,scope:'scene',ownerId:null,values:{colors:16},time:0}).then(()=>false,()=>true);fake.revision=2;release({});return job;
  });assert.equal(isolation,true);
  if(process.argv.includes('--capture')){const dir=resolve(root,'docs/design/evidence/effect-adjustments-2026-10-20');mkdirSync(dir,{recursive:true});await page.screenshot({path:resolve(dir,'fixed-auto-palette.png')});}
  assert.deepEqual(errors,[]);console.log('✓ 固定自动色板：真实窄色域六档／启用即固定／移动稳定／刷新与撤销重做／保存像素一致／对象隔离／Step／异步切工程保护');
}finally{await browser.close();}
