import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:140,loop:4});ToSampoolV4Workspace.mutate(s=>{s.background={alpha:0};s.entities=[{id:'owner',type:'vector',x:30,y:60,w:120,h:20,parts:[{id:'path',type:'line',x:0,y:0,x2:120,y2:0,stroke:'#ff0000',strokeWidth:2,strokeCompletion:50}]},{id:'source',type:'rect',x:200,y:100,w:12,h:12,fill:'#00ff00'}];});classicV4View.selectPart('owner','path');});
  const field=key=>page.locator('[data-stroke-param="'+key+'"]');await field('pathRevealEnabled').check();await field('pathEndpoints.enabled').check();await field('pathEndpoints.size').fill('20');await field('pathEndpoints.size').press('Tab');
  const visual=await page.evaluate(()=>{
    const s=ToSampoolV4Workspace.current(),r=ToSampoolRuntimeVNext,c=document.createElement('canvas'),p=r.createRuntime(s);p.renderTo(c,0);const rgba=Array.from(c.getContext('2d').getImageData(90,68,1,1).data);p.dispose();
    const owner=s.entities[0],frame=r.modules.frame.create(s,0),box=r.modules.content.localBounds(owner,frame.valuesFor(owner),frame);return{rgba,box,hit:EditorVNextCanvasHit.pickPart(s,owner,90,68,0)?.id};
  });assert.ok(visual.rgba[0]>200&&visual.rgba[3]>200,JSON.stringify(visual));assert.ok(visual.box.y<=-10);assert.equal(visual.hit,'path');
  await field('pathEndpoints.type').selectOption('bar');assert.equal(await field('pathEndpoints.width').count(),1);assert.equal(await field('pathEndpoints.size').count(),0);
  await field('pathEndpoints.type').selectOption('object');await field('pathEndpoints.sourceId').selectOption('source');await field('pathEndpoints.start').check();
  const object=await page.evaluate(()=>{const p=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current()),c=document.createElement('canvas'),stats=p.renderTo(c,0);p.dispose();return stats;});assert.equal(object.pathSpriteBuilds,1);assert.equal(object.pathInstancesDrawn,2);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('pathEndpoints.start').isChecked(),false);
  const html=await page.evaluate(async()=>{const pkg=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),s=(await EditorVNextProjectPackage.restore(pkg.files)).scene;if(s.entities[0].parts[0].pathEndpoints.sourceId!=='source')throw Error('端点引用未保存');return EditorVNextDeliveryBuilder.embedHtml({scene:s,name:'endpoints',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;});
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
  const types=await page.evaluate(()=>{
    const r=ToSampoolRuntimeVNext,result=[];
    for(const raw of[{type:'rect',x:0,y:0,w:100,h:50},{type:'ellipse',x:0,y:0,w:100,h:50},{type:'poly',x:0,y:0,w:80,h:80,polygonMode:'regular',sides:5},{type:'line',x:0,y:0,x2:100,y2:0},{type:'stroke',points:[[0,0],[30,25],[100,0]],smoothing:70}]){
      const part={...raw,id:'path',strokeCompletion:43,pathEndpoints:{enabled:true,size:14}},g=r.modules.pathGeometry.full(part),end=r.modules.pathEndpoints.placements(part,g)[0].point,
        scene={format:'tosampool-scene/v4',width:240,height:140,loop:4,background:{alpha:0},entities:[{id:'owner',type:'vector',x:30,y:30,w:120,h:80,parts:[part]}]},p=r.createRuntime(scene),c=document.createElement('canvas');p.renderTo(c,0);
      const alpha=c.getContext('2d').getImageData(Math.round(end[0]+30),Math.round(end[1]+30),1,1).data[3];p.dispose();result.push({type:part.type,alpha});
    }return result;
  });assert.ok(types.every(t=>t.alpha===255),JSON.stringify(types));
  await field('pathEndpoints.type').selectOption('circle');
  await page.evaluate(()=>{classicV4Timeline.seek(.4);classicV4Changes.run('端点完成度切段',s=>{EditorVNextTimelineState.split(s,'owner',.2);EditorVNextTimelineState.split(s,'owner',.8);});});
  await page.locator('#btn-timing-mode').click();await field('strokeCompletion').fill('0');await field('strokeCompletion').press('Tab');
  await page.evaluate(()=>classicV4Timeline.seek(3.6));await page.locator('#btn-timing-mode').click();await field('strokeCompletion').fill('100');await field('strokeCompletion').press('Tab');
  const lane=await page.locator('#tl-context').boundingBox();await page.mouse.move(lane.x+lane.width*.5,lane.y+lane.height*.5);await page.locator('#tl-linear-toggle').click();await page.evaluate(()=>classicV4Timeline.seek(2));
  assert.equal(+await field('strokeCompletion').inputValue(),50);
  const linear=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current(),r=ToSampoolRuntimeVNext,points=[];for(const t of[1.4,2,2.6]){const f=r.modules.frame.create(s,t),part=f.valuesFor(s.entities[0]).parts[0];points.push(r.modules.pathEndpoints.placements(part,r.modules.pathGeometry.full(part))[0].point[0]);}return points;});assert.ok(linear[0]<linear[1]&&linear[1]<linear[2],JSON.stringify(linear));
  assert.deepEqual(errors,[]);console.log('✓ 路径端点浏览器：渐进开关／五类真实路径／圆点法向线引用／完成度Linear随动／扩框命中／共享精灵／撤销／项目与HTML通过');
}finally{await browser.close();}
