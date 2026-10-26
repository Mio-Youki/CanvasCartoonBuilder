import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  const url=pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href;await page.goto(url);await page.waitForFunction(()=>window.classicV4Sharing);
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96});classicV4Changes.run('输入',s=>{s.entities=[{id:'house',name:'共享小屋',type:'rect',x:20,y:10,w:48,h:30,fill:'#ee8833'}];});classicV4View.select('house');});
  await page.locator('#btn-store-element').click();const toggle=page.locator('[data-share-action="toggle"]');await page.waitForFunction(()=>document.querySelector('[data-share-action="toggle"]')?.disabled===false);await toggle.click();
  await page.waitForFunction(()=>Object.keys(ToSampoolV4Workspace.current().materialShares||{}).length===1);await page.waitForFunction(()=>document.querySelector('[data-share-action="update"]')?.getAttribute('aria-pressed')==='true');
  const first=await page.evaluate(async()=>{const scene=ToSampoolV4Workspace.current(),id=Object.keys(scene.elementPresets)[0],link=Object.values(scene.materialShares)[0],record=await classicV4Sharing.library.publication(link.publicationId);window.__sharedA=JSON.parse(JSON.stringify(scene));return{id,record};});
  await page.evaluate(()=>{classicV4Changes.run('只改实例',s=>{s.entities[0].w=80;});});await page.evaluate(()=>classicV4Sharing.settled());assert.equal(await page.locator('[data-share-action="update"]').count(),1,'共享后仅保留更新入口，不提供取消共享');
  await page.evaluate(id=>{classicV4Changes.run('改素材定义',s=>{s.elementPresets[id].root.fill='#22aa66';});},first.id);await page.locator('[data-share-action="update"]').waitFor();await page.locator('[data-share-action="update"]').click();
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().materialShares['element:'+encodeURIComponent(id)+'@1']?.publishedHash!==window.__sharedA.materialShares['element:'+encodeURIComponent(id)+'@1'].publishedHash,first.id);
  const updated=await page.evaluate(async id=>{const scene=ToSampoolV4Workspace.current(),link=Object.values(scene.materialShares)[0];const duplicate=await classicV4Sharing.service.publish({...scene,materialShares:{}},{kind:'element',id});window.__duplicate=duplicate.record;return{record:await classicV4Sharing.library.publication(link.publicationId),duplicate:duplicate.record};},first.id);
  assert.equal(updated.record.id,first.record.id);assert.equal(updated.record.revision,2);assert.notEqual(updated.duplicate.id,first.record.id);assert.equal(updated.duplicate.name,'共享小屋 (2)');
  await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:160,height:96}));await page.locator('[data-material-scope="shared"]').click();
  const shared=page.locator('[data-publication-id="'+first.record.id+'"]');await shared.waitFor();await shared.locator('[data-share-action="take"]').click();
  await page.waitForFunction(()=>classicV4Sharing.scope==='project'&&ToSampoolV4Workspace.current().entities.length===1);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].fill),'#22aa66');
  await page.locator('[data-material-scope="shared"]').click();await shared.locator('[data-share-action="take"]').click();await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===2);
  assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().elementPresets).length),1);
  const pixels=await page.evaluate(async()=>{await classicV4View.render();window.__takePixels=classicV4View.canvas.toDataURL();window.__takeScene=JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()));return window.__takePixels;});
  await page.locator('[data-material-scope="shared"]').click();page.once('dialog',d=>d.dismiss());await shared.locator('[data-share-action="remove"]').click();await page.waitForFunction(()=>document.querySelector('#side-import').getAttribute('aria-busy')!=='true');assert.equal(await shared.count(),1,'取消不能删除');
  page.once('dialog',d=>d.accept());await shared.locator('[data-share-action="remove"]').click();await page.waitForFunction(id=>!document.querySelector('[data-publication-id="'+id+'"]'),first.record.id);
  const after=await page.evaluate(async()=>{await classicV4View.render();const records=await classicV4Sharing.library.publications();return{pixels:classicV4View.canvas.toDataURL(),count:ToSampoolV4Workspace.current().entities.length,remaining:records.length,content:!!(await classicV4Sharing.library.sharedBundle(records[0].id)).bundle};});assert.equal(after.pixels,pixels);assert.equal(after.count,2);assert.equal(after.remaining,1);assert.equal(after.content,true);
  await page.reload();await page.waitForFunction(()=>window.classicV4Sharing);await page.evaluate(()=>{if(state.playing)togglePlay();classicV4Patterns.open('assets');});await page.locator('[data-material-scope="shared"]').click();await page.locator('[data-publication-id]').waitFor();assert.equal(await page.locator('[data-publication-id]').count(),1);
  // Exercise the real v1→v2 IndexedDB upgrade without touching the user's DB.
  const upgrade=await page.evaluate(async()=>{
    const name='rc3b-upgrade-'+crypto.randomUUID(),scene=EditorVNextScene.blank();scene.assets={a:{locator:'data:text/plain,a',width:4,height:4}};const bundle=await EditorV4Resources.capture(scene,[{kind:'asset',id:'a'}]);
    await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('packages');r.onsuccess=()=>{const d=r.result,tx=d.transaction('packages','readwrite');tx.objectStore('packages').put(bundle,bundle.hash);tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
    const library=EditorV4ResourceLibrary.create({name}),old=(await library.list()).length,record=await library.publish(bundle,{name:'升级测试'}),found=await library.sharedBundle(record.id);await library.close();
    const reopened=EditorV4ResourceLibrary.create({name}),records=await reopened.publications();await reopened.close();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});return{old,same:found.bundle.hash===bundle.hash,persisted:records.length};
  });assert.deepEqual(upgrade,{old:1,same:true,persisted:1});
  await page.evaluate(async()=>{
    ToSampoolV4Workspace.createBlank({width:160,height:96});const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);
    ToSampoolV4Assets.importPrepared({name:'处理位图',locator:c.toDataURL(),width:4,height:4,recipe:{width:4,height:4}});await syncClassicV4AssetShelf();classicV4Sharing.setScope('project');
  });
  await page.waitForFunction(()=>document.querySelector('[data-v4-asset-id] [data-share-action="toggle"]')?.disabled===false);await page.locator('[data-v4-asset-id] [data-share-action="toggle"]').click();await page.waitForFunction(()=>Object.keys(ToSampoolV4Workspace.current().materialShares||{}).length===1);
  await page.evaluate(()=>{classicV4Changes.run('位图预处理',s=>{Object.values(s.assets)[0].recipe.width=2;});});await page.locator('[data-share-action="update"]').waitFor();await page.locator('[data-share-action="update"]').click();await page.waitForFunction(()=>document.getElementById('side-import').getAttribute('aria-busy')!=='true'&&!document.querySelector('[data-share-action="update"]')?.disabled);
  const bitmapId=await page.evaluate(async()=>{const link=Object.values(ToSampoolV4Workspace.current().materialShares)[0];return link.publicationId;});await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:160,height:96}));await page.locator('[data-material-scope="shared"]').click();await page.locator('[data-publication-id="'+bitmapId+'"] [data-share-action="take"]').click();
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0]?.type==='image');assert.equal(await page.evaluate(()=>Object.values(ToSampoolV4Workspace.current().assets)[0].recipe.width),2);
  const descriptor=JSON.parse(readFileSync(resolve(root,'examples/resources/rain-curtain.tosampool-resource.json'),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
  const programId=await page.evaluate(async descriptor=>{
    const scene=EditorVNextScene.blank(),moduleId=descriptor.manifest.id;scene.modules={[moduleId]:descriptor};scene.entities=[{id:'program',name:'雨幕元素',type:'procedural',moduleId,moduleVersion:1,x:0,y:0,w:80,h:60,params:{amount:88,period:6,seed:13,color:'#ff6600'}}];
    const id=EditorV4ElementPresets.add(scene,'program');return(await classicV4Sharing.service.publish(scene,{kind:'element',id})).record.id;
  },descriptor);
  await page.locator('[data-material-scope="shared"]').click();page.once('dialog',d=>d.accept());await page.locator('[data-publication-id="'+programId+'"] [data-share-action="take"]').click();await page.waitForFunction(()=>classicV4Sharing.scope==='project');
  const trust=await page.evaluate(()=>({count:ToSampoolV4Workspace.current().entities.length,definition:Object.values(ToSampoolV4Workspace.current().elementPresets||{})[0]?.root.params.amount,status:document.getElementById('m-import').textContent}));assert.equal(trust.count,2);assert.equal(trust.definition,88);assert.match(trust.status,/加入画布/);
  assert.deepEqual(errors,[]);console.log('✓ RC3-b浏览器：共享开关／实例不回写／显式更新／同名不覆盖／跨工程独立重复取用／取消与移除不改画面／刷新持久化／v1库升级保留');
}finally{await browser.close();}
