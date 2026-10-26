import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4ResourceEntries);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180});
    const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.fillStyle='#ef8844';g.fillRect(0,0,16,16);const locator=c.toDataURL();
    classicV4Changes.run('改名与图样携带夹具',s=>{
      s.assets={photo:{name:'位图原名',locator,width:16,height:16},seq:{name:'序列原名',locator,width:16,height:16,frames:[{locator},{locator}]}};
      s.entities=[{id:'owner',name:'元素原名',type:'image',assetId:'photo',x:30,y:25,w:100,h:70,parts:[{id:'p',type:'rect',w:100,h:70,fill:null,stroke:'#ffffff',strokeWidth:1,
        extensions:{attached:['ticks','elements'],ticks:{enabled:true,count:13},elements:{enabled:true,count:6,sourceId:'stamp',keepSource:false}}}]},
        {id:'stamp',name:'引用对象',type:'ellipse',x:180,y:40,w:6,h:6,fill:'#ffff00'}];
    });classicV4View.select('owner');classicV4Patterns.open('assets');classicV4Sharing.setScope('project');
  });
  const rename=async(locator,name)=>{page.once('dialog',d=>d.accept(name));await locator.dblclick();};
  const bitmap=page.locator('#lib [data-v4-asset-id="photo"] .nm'),sequence=page.locator('#lib [data-v4-asset-id="seq"] .nm');
  await bitmap.waitFor();await rename(bitmap,'位图新名');await page.waitForFunction(()=>ToSampoolV4Workspace.current().assets.photo.name==='位图新名');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].assetId),'photo');
  await rename(sequence,'序列新名');await page.waitForFunction(()=>ToSampoolV4Workspace.current().assets.seq.name==='序列新名');
  await page.locator('#btn-store-element').click();const id=await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().elementPresets)[0]);
  assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources).length),2,'store automatically captures pattern cards');
  const element=page.locator('#lib [data-element-preset-id="'+id+'"]');await rename(element.locator('.lib-name'),'元素素材新名');
  assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities[0].resourceBindings.element,id),id);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].name),'元素原名','renaming a material is not renaming a placed instance');
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await element.locator('.lib-name').textContent(),'元素原名');await page.evaluate(()=>classicV4Changes.redo());
  await element.locator('[data-share-action="toggle"]').click();await page.evaluate(()=>classicV4Sharing.settled());
  await page.waitForFunction(()=>Object.keys(ToSampoolV4Workspace.current().materialShares||{}).length===1);
  const publication=await page.evaluate(id=>ToSampoolV4Workspace.current().materialShares['element:'+encodeURIComponent(id)+'@1'].publicationId,id);
  await page.evaluate(()=>classicV4Sharing.setScope('shared'));const sharedMaterial=page.locator('#v4-shared-materials [data-publication-id="'+publication+'"]');
  await sharedMaterial.waitFor();await rename(sharedMaterial.locator('.lib-name'),'共享素材别名');await page.waitForFunction(async id=>(await classicV4Sharing.library.publication(id))?.name==='共享素材别名',publication);
  assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().elementPresets[id].name,id),'元素素材新名');
  await page.evaluate(()=>classicV4Sharing.setScope('project'));await element.locator('[data-share-action="update"]').click();await page.evaluate(()=>classicV4Sharing.settled());
  await page.waitForFunction(async id=>(await classicV4Sharing.library.publication(id)).name==='元素素材新名',publication);
  assert.equal(await page.evaluate(async id=>(await classicV4Sharing.library.publication(id)).name,publication),'元素素材新名','explicit update sends project display name');
  await page.locator('#toolbar-pattern').click();const patternId=await page.evaluate(()=>EditorV4Resources.patternId(ToSampoolV4Workspace.current(),{engineId:'ticks'}));
  const pattern=page.locator('#v4-pattern-cards [data-pattern-resource-id="'+patternId+'"]');await rename(pattern.locator('.lib-name'),'短刻度');
  await page.evaluate(()=>classicV4Inspector.focusExtension('owner','p','ticks'));
  assert.equal(await page.locator('[data-v4-pattern-owner="owner"][data-v4-pattern-id="ticks"] .struct-label').textContent(),'短刻度');
  assert.ok((await page.locator('[data-attached-pattern="ticks"] .global-section-title').textContent()).startsWith('短刻度'));
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].extensions.ticks.count),13);
  await pattern.locator('[data-pattern-action="publish"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  const patternPub=await page.evaluate(id=>ToSampoolV4Workspace.current().materialShares['pattern:'+encodeURIComponent(id)+'@1'].publicationId,patternId);
  await page.locator('[data-pattern-scope-switch]').click();const sharedPattern=page.locator('[data-pattern-key="shared:'+patternPub+'"]');await sharedPattern.waitFor();await rename(sharedPattern.locator('.lib-name'),'共享刻度别名');
  await page.waitForFunction(async id=>(await classicV4Sharing.library.publication(id))?.name==='共享刻度别名',patternPub);
  await page.evaluate(()=>classicV4ResourceEntries.settled());assert.equal(await sharedPattern.locator('.lib-name').textContent(),'共享刻度别名','shared cards display publication metadata rather than the old payload name');
  assert.equal(await page.locator('[data-pattern-key="builtin:ticks"] .lib-name').getAttribute('data-resource-rename'),null,'shipped labels are readonly');
  await page.evaluate(async()=>{const s=ToSampoolV4Workspace.current(),bundle=await EditorV4Resources.capture(s,[{kind:'element',id:Object.keys(s.elementPresets)[0]}]);window.__p4Bundle=bundle;ToSampoolV4Workspace.createBlank({width:320,height:180});await classicV4Resources.importBundle(bundle);classicV4Patterns.open('assets');classicV4Sharing.setScope('project');renderLib();});
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0);assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources).length),2);
  assert.equal(await page.evaluate(()=>Object.values(ToSampoolV4Workspace.current().patternResources).find(p=>p.engineId==='ticks').name),'短刻度','display aliases travel with the element without becoming identity keys');
  const imported=page.locator('#lib [data-element-preset-id]');await imported.locator('[data-material-action="place"]').click();
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.filter(e=>e.referenceSourceOnly).length),1);
  const visible=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(e=>!e.referenceSourceOnly).id);
  const pixels=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;await ToSampoolV4Workspace.renderTo(c,0);return [...c.getContext('2d').getImageData(0,0,320,180).data].filter((v,i)=>i%4===3&&v>0).length;});assert.ok(pixels>0);
  await page.evaluate(owner=>{classicV4View.selectPart(owner,'p');classicV4Inspector.focusExtension(owner,'p','elements');},visible);
  await page.locator('[data-remove-pattern="elements"]').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.filter(e=>e.referenceSourceOnly).length),0);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.filter(e=>e.referenceSourceOnly).length),1);
  const saved=await page.evaluate(async()=>{const pkg=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current());return(await EditorVNextProjectPackage.restore(pkg.files)).scene;});assert.equal(saved.assets.photo.name,'位图新名');assert.equal(Object.values(saved.elementPresets)[0].name,'元素素材新名');
  const out=resolve(root,'tests/artifacts/rc5-p4-resource-names');mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,'page.png')});
  assert.deepEqual(errors,[]);console.log('✓ 真实双击：位图／序列／元素／图样／共享素材与图样；ID不变、撤销及显式更新；自带只读；跨项目携带与私有来源删除撤销、工程保存');
}finally{await browser.close();}
