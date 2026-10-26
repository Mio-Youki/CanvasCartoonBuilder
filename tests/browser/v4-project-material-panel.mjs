import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Materials);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4Changes.clear();
    classicV4Changes.run('输入',scene=>{scene.entities=[{id:'house',name:'暖窗小屋',type:'vector',x:24,y:18,w:48,h:30,alpha:.8,anim:{bob:{amount:2,period:2}},parts:[{id:'wall',type:'rect',x:0,y:0,w:48,h:30,fill:'#ee8833'}]}];scene.timeline.tracks.house={segments:[{f:[0,1],values:{w:100}}]};});classicV4View.select('house');
  });
  await page.locator('#btn-store-element').click();
  const card=page.locator('[data-element-preset-id]');await card.waitFor();
  await page.evaluate(()=>classicV4Materials.settled());
  assert.equal(await card.count(),1);assert.equal(await card.locator('.v4-material-kind').textContent(),'元素');assert.equal(await page.evaluate(()=>classicV4View.selectedId),'house');
  const snapshot=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current(),p=Object.values(s.elementPresets)[0],c=document.querySelector('[data-element-preset-id] canvas');return{w:p.root.w,bob:p.root.anim.bob.amount,nonempty:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n),note:document.querySelector('.v4-material-note').textContent};});
  assert.equal(snapshot.w,48);assert.equal(snapshot.bob,2);assert.equal(snapshot.nonempty,true,snapshot.note);
  await card.locator('[data-material-action="place"]').click();await card.locator('[data-material-action="place"]').click();
  const independent=await page.evaluate(async()=>{
    const before=ToSampoolV4Workspace.current();const ids=before.entities.slice(1).map(e=>e.id);classicV4Changes.run('改独立实例',scene=>{scene.entities.find(e=>e.id===ids[0]).parts[0].fill='#00ff00';});
    const scene=ToSampoolV4Workspace.current(),key=Object.keys(scene.elementPresets)[0],other=scene.entities.find(e=>e.id===ids[1]);const ok=other.parts[0].fill==='#ee8833'&&scene.elementPresets[key].root.parts[0].fill==='#ee8833'&&!scene.timeline.tracks[ids[0]];
    classicV4Changes.undo();classicV4Changes.undo();const undo=ToSampoolV4Workspace.current().entities.length===2;classicV4Changes.redo();
    const restored=(await EditorVNextProjectPackage.restore((await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current())).files)).scene;
    return{ok,undo,saved:!!restored.elementPresets[key],count:restored.entities.length};
  });assert.deepEqual(independent,{ok:true,undo:true,saved:true,count:3});
  await page.evaluate(()=>{classicV4View.selectPart('house','wall');});assert.equal(await page.locator('#btn-store-element').isDisabled(),true);
  await page.evaluate(()=>{classicV4Changes.run('组',s=>s.entities.push({id:'group',type:'group',x:0,y:0,w:10,h:10}));classicV4View.select('group');});assert.equal(await page.locator('#btn-store-element').isDisabled(),false);
  const row=await page.locator('.asset-import-actions').evaluate(node=>{const head=document.getElementById('asset-head').getBoundingClientRect(),r=node.getBoundingClientRect(),toggle=node.querySelector('[data-material-scope-switch]').getBoundingClientRect(),buttons=[...node.querySelectorAll('.asset-import-buttons button')];return{below:r.top>=head.bottom,buttons:buttons.map(b=>({name:b.getAttribute('aria-label'),visible:b.getBoundingClientRect().width>=24,icon:!!b.querySelector('svg'),title:!!b.title})),sameRow:buttons.every(b=>Math.abs(b.getBoundingClientRect().top-toggle.top)<2),right:buttons[0].getBoundingClientRect().left>toggle.right,overflow:node.scrollWidth>node.clientWidth};});
  assert.ok(row.below&&!row.overflow&&row.sameRow&&row.right,JSON.stringify(row));assert.deepEqual(row.buttons.map(b=>b.name),['导出画面','导入文件夹','导入精灵图','导入素材']);assert.ok(row.buttons.every(b=>b.visible&&b.icon&&b.title));
  const scopeToggle=page.locator('[data-material-scope-switch]');
  const playingBefore=await page.evaluate(()=>state.playing);
  await scopeToggle.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>classicV4Sharing.scope==='shared');assert.equal(await scopeToggle.getAttribute('aria-pressed'),'true');assert.match(await scopeToggle.innerText(),/共享/);
  assert.equal(await page.evaluate(()=>state.playing),playingBefore,'开关聚焦时空格不得启动画布播放');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>classicV4Sharing.scope==='project');assert.equal(await scopeToggle.getAttribute('aria-pressed'),'false');
  for(const id of ['btn-import-folder','btn-import-sprite','btn-import']){
    await scopeToggle.click();assert.equal(await scopeToggle.getAttribute('aria-pressed'),'true');
    const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#'+id+' svg').click()]);
    if(id==='btn-import-folder')await page.locator('#folder-file').dispatchEvent('cancel');else await chooser.setFiles([]);
    await page.waitForFunction(()=>classicV4Sharing.scope==='project');assert.equal(await scopeToggle.getAttribute('aria-pressed'),'false','导入入口先切回项目');
  }
  await scopeToggle.click();await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:160,height:96}));
  assert.equal(await scopeToggle.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#lib').isVisible(),true);assert.equal(await page.locator('#v4-shared-materials').isVisible(),false);
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:160,height:96});});await page.waitForFunction(()=>!document.querySelector('[data-element-preset-id]'));assert.equal(await page.locator('#btn-store-element').isDisabled(),true);
  // Bitmap recipe / sequence projection still uses the original import pipeline.
  await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);const asset={locator:c.toDataURL(),width:8,height:8,mime:'image/png'};
    ToSampoolV4Assets.importPrepared([{...asset,name:'位图测试'},{...asset,name:'序列测试',fps:2,frames:[asset,asset]}]);await syncClassicV4AssetShelf();classicV4Patterns.open('assets');
  });
  assert.deepEqual((await page.locator('[data-v4-asset-id] .v4-material-kind').allTextContents()).sort(),['位图','序列'].sort());
  const descriptor=JSON.parse(readFileSync(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
  const program=await page.evaluate(async descriptor=>{
    const scene=EditorVNextScene.blank({width:160,height:96}),id=descriptor.manifest.id;scene.modules={[id]:descriptor};scene.entities=[{id:'rain',type:'procedural',moduleId:id,moduleVersion:1,x:0,y:0,w:160,h:96,params:{amount:88,period:6,color:'#ff6600',seed:13}}];
    // A portable untrusted definition can exist in the library without a live
    // untrusted Canvas object. Test that valid state rather than bypassing the
    // normal project loader's trust gate for a visible procedural entity.
    EditorV4ElementPresets.add(scene,'rain');scene.entities=[];ToSampoolV4Workspace.replace(scene);renderLib();await classicV4Materials.settled();return{note:document.querySelector('.v4-material-note').textContent,stored:Object.values(ToSampoolV4Workspace.current().elementPresets)[0].root.params.amount};
  },descriptor);assert.equal(program.stored,88);assert.match(program.note,/信任|加载/);
  await page.locator('[data-element-preset-id]').click();await page.locator('[data-material-action="place"]').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0);assert.match(await page.locator('#m-import').textContent(),/信任|加载/);
  await page.evaluate(async()=>{
    const scene=ToSampoolV4Workspace.current(),id=Object.keys(scene.modules)[0];
    await EditorVNextModuleLoader.trustAndLoad(scene,[id],{scope:ToSampoolV4Workspace.moduleScope});
    renderLib();await classicV4Materials.settled();
  });
  assert.equal(await page.locator('.v4-material-note').textContent(),'');
  assert.equal(await page.locator('[data-element-preset-id] canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v)),true);
  await page.locator('[data-material-action="place"]').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),1);
  for(const width of [1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.locator('.asset-import-actions').evaluate(n=>n.scrollWidth>n.clientWidth),false);}
  assert.deepEqual(errors,[]);console.log('✓ RC3-a项目素材真实入口：入库／独立放置／选择／首帧／工程往返／撤销重做／类型／程序未授信／工程切换／导入独立行');
}finally{await browser.close();}
