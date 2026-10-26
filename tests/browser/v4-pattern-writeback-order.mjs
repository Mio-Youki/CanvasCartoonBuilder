import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.classicV4ResourceEntries?.patterns);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:400,height:240});
    classicV4Changes.run('图样回写与覆盖夹具',s=>{
      s.entities=[{id:'owner',type:'vector',x:45,y:50,w:120,h:90,parts:[{id:'p',type:'rect',x:0,y:0,w:120,h:90,fill:'#222222',strokeWidth:0,
        extensions:{attached:['ticks','nested','elements'],ticks:{enabled:true,count:8,length:70,width:12,color:'#00ffff',orientation:'fixed'},
          nested:{enabled:true,count:1,scaleStep:.2,style:'fill',color:'#ff0000'},elements:{enabled:true,sourceId:'stamp',count:8,keepSource:false}}}]},
        {id:'stamp',type:'rect',x:250,y:60,w:32,h:32,fill:'#00ff00'},
        {id:'other',type:'vector',x:220,y:130,w:100,h:60,parts:[{id:'q',type:'rect',w:100,h:60,extensions:{attached:['ticks'],ticks:{enabled:true,count:5}}}]}];
      const p=s.entities[0].parts[0];EditorV4Resources.addPattern(s,{id:'ticks-preset',...EditorV4PathPatternPresets.fromPart(s,p,'ticks',{ownerId:'owner'})});
    });
    classicV4View.selectPart('owner','p');classicV4Changes.clear();
  });
  await page.locator('#toolbar-pattern').click();
  const card=page.locator('[data-pattern-resource-id="ticks-preset"]');
  assert.equal(await card.getAttribute('data-pattern-applied'),'true');
  await card.click();await page.locator('[data-extension-param="ticks.count"]').fill('17');
  await page.locator('[data-extension-param="ticks.count"]').press('Tab');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().patternResources['ticks-preset'].params.count),8,'Inspector edits instance, not clipboard');
  await card.locator('[data-pattern-action="writeback"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  assert.equal(await page.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources).length),1);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().patternResources['ticks-preset'].params.count),17);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[2].parts[0].extensions.ticks.count),5,'writeback leaves other instances untouched');
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().patternResources['ticks-preset'].params.count),8);await page.evaluate(()=>classicV4Changes.redo());
  await card.locator('[data-pattern-action="publish"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  const publication=await page.evaluate(()=>Object.values(ToSampoolV4Workspace.current().materialShares)[0].publicationId);
  await page.locator('[data-extension-param="ticks.count"]').fill('23');await page.locator('[data-extension-param="ticks.count"]').press('Tab');
  await card.locator('[data-pattern-action="writeback"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  await card.locator('[data-pattern-action="update"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  assert.deepEqual(await page.evaluate(async id=>{const r=await classicV4Sharing.library.publications();return[r.length,r[0].id===id,r[0].revision];},publication),[1,true,2]);
  await page.evaluate(()=>classicV4View.selectPart('other','q'));
  await card.locator('[data-pattern-action="apply"]').click();await page.evaluate(()=>classicV4ResourceEntries.settled());
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[2].parts[0].extensions.ticks.count),23,'apply overwrites existing instance params');
  await page.evaluate(()=>classicV4View.selectPart('owner','p'));
  const rows=()=>page.locator('[data-v4-pattern-owner="owner"][data-v4-pattern-part="p"]');
  const order=()=>rows().evaluateAll(nodes=>nodes.map(n=>n.dataset.v4PatternId));
  assert.deepEqual(await order(),['elements','nested','ticks']);
  const paint=()=>page.evaluate(async()=>{const c=document.createElement('canvas');c.width=400;c.height=240;await ToSampoolV4Workspace.renderTo(c,0);return Array.from(c.getContext('2d').getImageData(0,0,400,240).data);});
  const before=await paint(),ticks=rows().filter({has:page.locator('.struct-label',{hasText:'刻度排布'})});
  await ticks.click();assert.equal(await page.locator('[data-extension-param="ticks.count"]').inputValue(),'23');
  const source=await ticks.boundingBox(),target=await rows().first().boundingBox();
  await page.mouse.move(source.x+70,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+70,target.y+3,{steps:8});await page.mouse.up();
  assert.deepEqual(await order(),['ticks','elements','nested'],'drag above adjacent row changes painter order');
  const after=await paint();assert.ok(after.some((v,i)=>v!==before[i]),'actual pixels must change, not just tree order');
  await page.evaluate(()=>classicV4Changes.undo());assert.deepEqual(await order(),['elements','nested','ticks']);assert.deepEqual(await paint(),before,'undo restores pixels');
  await page.evaluate(()=>classicV4Changes.redo());assert.deepEqual(await paint(),after);
  const saved=await page.evaluate(async()=>{
    const scene=ToSampoolV4Workspace.current(),pkg=await EditorVNextProjectPackage.build(scene),r=await EditorVNextProjectPackage.restore(pkg.files);
    return r.scene.entities[0].parts[0].extensions.attached;
  });assert.deepEqual(saved,['nested','elements','ticks']);
  const delivery=await page.evaluate(()=>EditorVNextDeliveryBuilder.pruneScene(ToSampoolV4Workspace.current()).entities[0].parts[0].extensions.attached);assert.deepEqual(delivery,saved);
  const nested=page.locator('[data-v4-pattern-owner="owner"][data-v4-pattern-part="p"][data-v4-pattern-id="nested"]');
  await nested.locator('[data-v4-action="toggle"]').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].extensions.nested.enabled),false);
  await nested.locator('[data-v4-action="remove"]').click();assert.deepEqual(await order(),['ticks','elements']);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts.length),1);
  await page.evaluate(()=>classicV4Changes.undo());assert.deepEqual(await order(),['ticks','elements','nested']);
  const out=resolve(root,'tests/artifacts/rc5-writeback-order');mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,'page.png')});
  assert.deepEqual(errors,[]);console.log('✓ 图样回写／唯一预设／共享原位更新／应用覆盖／树定位与真实拖动／覆盖像素／撤销／工程重开／交付顺序／停用保值与移除');
}finally{await browser.close();}
