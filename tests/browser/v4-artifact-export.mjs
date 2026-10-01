#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),pagePath=resolve(root,'img2asset-v4-classic.html');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(existsSync);
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1280,height:800}});await context.addInitScript(()=>{window.__artifactSaves=[];window.__PATCHARIUM_HOST__={openText:async()=>null,saveFile:async artifact=>{window.__artifactSaves.push({name:artifact.name,mime:artifact.mime,size:artifact.data&&artifact.data.size||0});return{mode:'test',name:artifact.name};},saveBatch:async({artifacts})=>artifacts.map(artifact=>{window.__artifactSaves.push({name:artifact.name,mime:artifact.mime,size:artifact.data&&artifact.data.size||0});return{mode:'test',name:artifact.name};})};});const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.goto(`${pathToFileURL(pagePath).href}?artifact-export=1`,{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>window.EditorVNextExporter&&window.ToSampoolRuntimeVNext&&window.ToSampoolSession?.activeId==='v4',null,{timeout:15000});
const result=await page.evaluate(async()=>{
  const scene={format:'tosampool-scene/v4',width:16,height:10,loop:1,background:{color:'#102030',alpha:1},timeline:{tracks:{}},entities:[{id:'dot',type:'rect',x:2,y:2,w:5,h:5,fill:'#ffcc33',motion:{bob:{enabled:true,amount:2,period:1}}}],sceneEffects:{overlay:{},sample:{}}};
  const before=JSON.stringify(scene);
  const times=EditorVNextExporter.frameTimes(scene,{fps:4,ranges:[[0,1]]});
  const png=await EditorVNextExporter.png(scene,0),frames=await EditorVNextExporter.pngFrames(scene,{fps:4,ranges:[[0,.5]]}),sprite=await EditorVNextExporter.spriteSheet(scene,{fps:4,ranges:[[0,1]]}),gif=await EditorVNextExporter.gif(scene,{fps:4,ranges:[[0,1]]}),header=new TextDecoder().decode(new Uint8Array(await gif.arrayBuffer()).slice(0,6));
  const gifUrl=URL.createObjectURL(gif),decoded=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('browser could not decode exported GIF'));image.src=gifUrl;}).finally(()=>URL.revokeObjectURL(gifUrl));
  const rich={format:'tosampool-scene/v4',width:64,height:64,loop:1,background:{color:'#000000',alpha:1},timeline:{tracks:{}},entities:Array.from({length:256},(_,index)=>({id:'c'+index,type:'rect',x:(index%16)*4,y:Math.floor(index/16)*4,w:4,h:4,fill:'#'+((index*1103515245>>>0)&0xffffff).toString(16).padStart(6,'0')})),sceneEffects:{overlay:{},sample:{}}};
  const richGif=await EditorVNextExporter.gif(rich,{fps:2,ranges:[[0,1]]}),richUrl=URL.createObjectURL(richGif),richDecoded=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('browser could not decode palette-stress GIF'));image.src=richUrl;}).finally(()=>URL.revokeObjectURL(richUrl));
  return{times,png:{type:png.type,size:png.size},frames:frames.map(frame=>({t:frame.t,type:frame.blob.type,size:frame.blob.size})),sprite:{type:sprite.type,size:sprite.size},gif:{type:gif.type,size:gif.size,header,decoded,richDecoded},unchanged:before===JSON.stringify(scene)};
});
assert.deepEqual(result.times,[0,.25,.5,.75],'v4 frame sampling must be deterministic');
assert.equal(result.png.type,'image/png');assert.ok(result.png.size>0);
assert.equal(result.frames.length,2);assert.ok(result.frames.every(frame=>frame.type==='image/png'&&frame.size>0));
assert.equal(result.sprite.type,'image/png');assert.ok(result.sprite.size>0);
assert.equal(result.gif.type,'image/gif');assert.equal(result.gif.header,'GIF89a');assert.ok(result.gif.size>0);
assert.deepEqual(result.gif.decoded,{width:16,height:10},'browser must decode v4 GIF exports');
assert.deepEqual(result.gif.richDecoded,{width:64,height:64},'browser must decode palette-heavy GIF exports across LZW code-width growth');
assert.equal(result.unchanged,true,'fixed-time export must not write preview/runtime state into the persisted Scene');
await page.evaluate(()=>{ToSampoolV4Workspace.replace({format:'tosampool-scene/v4',width:16,height:10,loop:1,background:{color:'#102030',alpha:1},timeline:{tracks:{}},entities:[{id:'dot',type:'rect',x:2,y:2,w:5,h:5,fill:'#ffcc33',motion:{bob:{enabled:true,amount:2,period:1}}}],sceneEffects:{overlay:{},sample:{}}});state.t=.5;});
await page.click('#btn-export');await page.waitForFunction(()=>document.querySelector('.wizard h2')?.textContent==='导出帧');assert.equal(await page.locator('.wizard .hint').first().textContent(),'v4 导出始终使用固定时间 Runtime；不读取 Legacy Runtime，也不写入预览质量状态。');assert.match(await page.locator('.wizard .export-count').textContent(),/t=0\.50s/,'current-frame export must read the editor playback clock');await page.locator('.wizard button').filter({hasText:'取消'}).click();
await page.click('#btn-export');await page.locator('.wizard input[value="gif"]').check();await page.locator('.wizard .export-fps').fill('2');await page.locator('.wizard button.primary').click();await page.waitForFunction(()=>window.__artifactSaves.length===1);assert.match(await page.evaluate(()=>window.__artifactSaves[0].name),/\.gif$/i,'GIF export panel must save a GIF artifact');assert.equal(await page.evaluate(()=>window.__artifactSaves[0].mime),'image/gif');
assert.deepEqual(errors,[],'v4 artifact export must not produce browser errors');
await context.close();await browser.close();
console.log('✓ v4 artifacts: fixed-time PNG / sprite / frame sequence / GIF browser flow passed');
