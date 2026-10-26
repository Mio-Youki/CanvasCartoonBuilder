import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Sharing&&window.classicV4Resources);
  const original=await page.evaluate(async()=>{
    if(state.playing)togglePlay();const scene=EditorVNextScene.blank({width:160,height:96}),c=document.createElement('canvas');c.width=16;c.height=16;const x=c.getContext('2d');x.fillStyle='#e34455';x.fillRect(0,0,16,16);
    scene.assets={old:{name:'旧素材',locator:c.toDataURL(),width:16,height:16}};ToSampoolV4Workspace.replace(scene);
    const library=EditorV4ResourceLibrary.create(),bundle=await EditorV4Resources.capture(scene,[{kind:'asset',id:'old'}]);await library.put(bundle);await library.close();
    classicV4Resources.open();await classicV4Resources.refresh();return EditorVNextScene.serialize(ToSampoolV4Workspace.current());
  });
  await page.locator('[data-resource-action="migrate-materials"]').click();await page.waitForFunction(()=>!classicV4Resources.busy);assert.match(await page.locator('#v4-resource-library .v4-resource-message').innerText(),/迁入共享 1 项/);
  assert.equal(await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current())),original);
  await page.locator('[data-library-tab="assets"]').click();await page.locator('[data-material-scope="shared"]').click();const card=page.locator('#v4-shared-materials [data-publication-id]');await card.waitFor();
  assert.match(await card.innerText(),/旧素材/);await card.locator('[data-share-action="take"]').click();await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.length===1);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].type),'image');
  await page.reload();await page.waitForFunction(()=>window.classicV4Sharing);await page.locator('[data-library-tab="assets"]').click();await page.locator('[data-material-scope="shared"]').click();await card.waitFor();assert.equal(await card.count(),1);
  const upgrade=await page.evaluate(async()=>{
    const name='rc3c2-v2-'+crypto.randomUUID(),scene=EditorVNextScene.blank();scene.assets={a:{locator:'data:text/plain,a',width:4,height:4},b:{locator:'data:text/plain,b',width:4,height:4}};
    const bundle=await EditorV4Resources.capture(scene,[{kind:'asset',id:'a'},{kind:'asset',id:'b'}]);
    await new Promise((resolve,reject)=>{const r=indexedDB.open(name,2);r.onupgradeneeded=()=>{for(const key of ['packages','publications','shared-content'])r.result.createObjectStore(key);};r.onsuccess=()=>{const d=r.result,tx=d.transaction('packages','readwrite');tx.objectStore('packages').put(bundle,bundle.hash);tx.oncomplete=()=>{d.close();resolve();};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
    const a=EditorV4ResourceLibrary.create({name}),b=EditorV4ResourceLibrary.create({name});let failed=false;
    try{await a.migrateMaterials(bundle.hash,{guard:()=>{throw Error('已切工程');}});}catch(error){failed=/已切工程/.test(error.message);}
    const afterFail=(await a.publications()).length;
    const concurrent=await Promise.all([a.migrateMaterials(bundle.hash),b.migrateMaterials(bundle.hash)]),records=await a.publications();
    await a.unpublish(records[0].id,{expectedRevision:1});await a.close();await b.close();
    const reopened=EditorV4ResourceLibrary.create({name}),repeat=await reopened.migrateMaterials(bundle.hash),old=(await reopened.list()).length,count=(await reopened.publications()).length;await reopened.close();
    await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
    return{failed,afterFail,created:concurrent.reduce((n,r)=>n+r.created.length,0),existing:concurrent.reduce((n,r)=>n+r.existing.length,0),removed:repeat.removed.length,old,count};
  });assert.deepEqual(upgrade,{failed:true,afterFail:0,created:2,existing:2,removed:1,old:1,count:1});
  assert.deepEqual(errors,[]);console.log('✓ RC3-c2a真实入口：旧收藏迁入→共享→画布／刷新持久化／v2库保留升级／事务取消无半成品／并发不重复／移出后不复活');
}finally{await browser.close();}
