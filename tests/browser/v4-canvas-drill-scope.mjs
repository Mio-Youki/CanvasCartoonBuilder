#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const pagePath=resolve(root,'img2asset-v4-classic.html');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');

const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(pagePath).href+'?e2e=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{
    ToSampoolV4Workspace.createBlank({width:200,height:120,loop:4});
    ToSampoolV4Workspace.mutate(scene=>scene.entities.push(
      {id:'drill-group',name:'组',type:'group',x:20,y:10,w:120,h:90,scaleX:1,scaleY:1,rot:0,alpha:1},
      {id:'drill-vector',name:'元素',type:'vector',parentId:'drill-group',x:12,y:12,w:80,h:50,scaleX:1,scaleY:1,rot:0,alpha:1,parts:[
        {id:'drill-rect',type:'rect',x:0,y:0,w:40,h:40,fill:'#ff4444'},
        {id:'drill-ellipse',type:'ellipse',x:45,y:4,w:25,h:25,fill:'#44ff44'}
      ]}
    ));
  });
  const canvas=await page.locator('#v4-classic-stage').boundingBox();
  const point={x:canvas.x+canvas.width*.25,y:canvas.y+canvas.height*.30};
  await page.mouse.click(point.x,point.y);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,part:classicV4View.selectedPartId})),{id:'drill-group',groups:[],part:null},'first Canvas click must stop at the outer group');
  await page.mouse.dblclick(point.x,point.y);await page.waitForTimeout(20);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,scope:classicV4View.scopeContainerId,box:getComputedStyle(document.querySelector('#v4-transform-layer .v4-transform-box')).display})),{id:'drill-group',groups:['drill-group'],scope:'drill-group',box:'none'},'double-clicking a selected group must enter its element scope and release Canvas hit testing');
  await page.mouse.click(point.x,point.y);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,part:classicV4View.selectedPartId})),{id:'drill-vector',groups:['drill-group'],part:null},'group scope must select its direct element child');
  await page.mouse.dblclick(point.x,point.y);await page.waitForTimeout(20);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,scope:classicV4View.scopeContainerId,part:classicV4View.selectedPartId,box:getComputedStyle(document.querySelector('#v4-transform-layer .v4-transform-box')).display})),{id:'drill-vector',groups:['drill-group'],scope:'drill-vector',part:null,box:'none'},'double-clicking an element must enter its part scope without selecting a part implicitly');
  await page.mouse.click(point.x,point.y);
  assert.equal(await page.evaluate(()=>classicV4View.selectedPartId),'drill-rect','part scope must select the clicked internal part');
  await page.mouse.click(canvas.x+canvas.width*.92,canvas.y+canvas.height*.82);await page.waitForTimeout(10);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,scope:classicV4View.scopeContainerId,part:classicV4View.selectedPartId})),{id:'drill-vector',groups:['drill-group'],scope:null,part:null},'clicking outside the opened part bounds must return to the element scope');
  await page.mouse.dblclick(point.x,point.y);await page.waitForTimeout(10);await page.mouse.click(point.x,point.y);
  assert.equal(await page.evaluate(()=>classicV4View.selectedPartId),'drill-rect','the element must be able to reopen its part scope after an outside-click exit');
  await page.keyboard.press('Escape');await page.waitForTimeout(10);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,scope:classicV4View.scopeContainerId,part:classicV4View.selectedPartId})),{id:'drill-vector',groups:['drill-group'],scope:null,part:null},'first Escape must return from the part scope to its element');
  await page.keyboard.press('Escape');await page.waitForTimeout(10);
  assert.deepEqual(await page.evaluate(()=>({id:classicV4View.selectedId,groups:classicV4View.drillGroups,scope:classicV4View.scopeContainerId,part:classicV4View.selectedPartId})),{id:'drill-group',groups:[],scope:null,part:null},'second Escape must return from the group scope to its group');
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:100,height:60,loop:4});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'z-a',type:'vector',x:0,y:0,w:10,h:10,parts:[{id:'z-pa',type:'rect',x:0,y:0,w:10,h:10,fill:'#ff0000'}]},{id:'z-b',type:'vector',x:15,y:0,w:10,h:10,parts:[{id:'z-pb',type:'rect',x:0,y:0,w:10,h:10,fill:'#00ff00'}]}));classicV4View.select('z-b');});
  await page.keyboard.press('Control+[');
  assert.deepEqual(await page.evaluate(()=>({order:ToSampoolV4Workspace.current().entities.map(item=>item.id),label:classicV4Changes.undoLabel})),{order:['z-b','z-a'],label:'下移图层'},'Ctrl+[ must move the selected entity one draw layer backward');
  await page.keyboard.press('Control+]');
  assert.deepEqual(await page.evaluate(()=>({order:ToSampoolV4Workspace.current().entities.map(item=>item.id),label:classicV4Changes.undoLabel})),{order:['z-a','z-b'],label:'上移图层'},'Ctrl+] must move the selected entity one draw layer forward');
  await page.evaluate(()=>{window.prompt=()=> '已重命名';classicV4View.select(null);});
  await page.locator('[data-v4-entity-id="z-a"] .struct-label').dblclick();await page.waitForTimeout(20);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(item=>item.id==='z-a').name),'已重命名','结构树名称必须在首击导致树重绘后仍能双击重命名');
  assert.deepEqual(errors,[],'Canvas drill scope must not cause browser errors');
  console.log('✓ v4 Canvas：组/元素/图元下钻、逐层退出与 Ctrl+[ / Ctrl+] 调序通过');
}finally{await browser.close();}
