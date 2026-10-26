#!/usr/bin/env node
// Focused editor flow for the fixed referenced-source mask-only rule.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=1&mask-only-flow=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolSession?.activeId==='v4'&&window.ToSampoolV4Workspace?.hasDocument);
  const apiState=await page.evaluate(()=>({workspace:typeof ToSampoolV4Workspace,view:typeof classicV4View,scene:typeof EditorVNextScene}));
  assert.deepEqual(apiState,{workspace:'object',view:'object',scene:'object'});
  await page.evaluate(()=>{
    ToSampoolV4Workspace.mutate(scene=>{scene.entities=[
      {id:'owner',name:'主人',type:'rect',x:25,y:20,w:80,h:70,fill:'#f34a70',alpha:1},
      {id:'source',name:'蒙版来源',type:'ellipse',x:40,y:25,w:55,h:55,fill:'#ffffff',alpha:1},
    ];});
    classicV4View.select('owner');
  });
  const section=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'蒙版'})});
  const type=section.locator('.global-field').filter({hasText:'蒙版'}).locator('select').first();
  await type.selectOption('element');
  const source=section.locator('.global-field').filter({hasText:'引用对象'}).locator('select');
  await source.selectOption('source');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.find(item=>item.id==='owner')?.effects?.mask?.targetId==='source');
  assert.equal(await section.locator('.global-field').filter({hasText:'显示来源'}).count(),1);
  const current=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),source=scene.entities.find(item=>item.id==='source');return{mask:scene.entities.find(item=>item.id==='owner').effects.mask,hidden:!!source.hidden,maskOnly:ToSampoolRuntimeVNext.modules.masks.maskOnlySources(scene).has('source')};});
  assert.deepEqual(current,{mask:{type:'element',targetId:'source',mode:'alpha',showSource:false,invert:false},hidden:false,maskOnly:true});
  const serialized=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));
  assert.ok(!serialized.includes('sourceVisibility'));
  await page.evaluate(text=>ToSampoolV4Workspace.replace(JSON.parse(text)),serialized);
  assert.equal(await page.evaluate(()=>ToSampoolRuntimeVNext.modules.masks.maskOnlySources(ToSampoolV4Workspace.current()).has('source')),true);
  await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current();EditorVNextMaskState.clear(scene,{scope:'object',ownerId:'owner'});});
  assert.equal(await page.evaluate(()=>ToSampoolRuntimeVNext.modules.masks.maskOnlySources(ToSampoolV4Workspace.current()).has('source')),false);
  console.log('✓ Referenced source defaults mask-only without changing hidden; extraction and explicit source-display fields persist; unbinding restores derived visibility.');
}finally{await browser.close();}
