#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const samples=await page.evaluate(()=>{
    const sample=(blend,withEffect=false)=>{
      const canvas=document.createElement('canvas');
      const scene={format:'tosampool-scene/v4',width:32,height:32,background:{color:'#ffffff',alpha:1},entities:[
        {id:'under',type:'rect',x:0,y:0,w:32,h:32,fill:'#ff0000'},
        {id:'vector',type:'vector',x:0,y:0,w:32,h:32,blend,parts:[{id:'blue',type:'rect',x:0,y:0,w:32,h:32,fill:'#0000ff'}],effects:withEffect?{decorate:{outline:{enabled:true,color:'#000000',width:1,alpha:1}}}:undefined}
      ]};
      ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);
      return Array.from(canvas.getContext('2d').getImageData(16,16,1,1).data);
    };
    return{normal:sample('normal'),multiply:sample('multiply'),screen:sample('screen'),effectMultiply:sample('multiply',true)};
  });
  assert.ok(samples.normal[2]>240&&samples.normal[0]<15,'正常模式应显示上层蓝色图元');
  assert.ok(samples.multiply[0]<15&&samples.multiply[1]<15&&samples.multiply[2]<15,'正片叠底应将整个矢量对象与下方红色对象合成为黑色');
  assert.ok(samples.screen[0]>240&&samples.screen[2]>240,'滤色应将蓝色对象与红色对象合成为洋红色');
  assert.ok(samples.effectMultiply[0]<15&&samples.effectMultiply[1]<15&&samples.effectMultiply[2]<15,'启用对象效果后仍须保持相同的整体混合语义');
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:32,height:32});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'vector',type:'vector',name:'矢量',x:0,y:0,w:32,h:32,parts:[{id:'part',type:'rect',x:0,y:0,w:32,h:32,fill:'#0000ff'}]}));classicV4View.select('vector');});
  await page.locator('#inspector-context .global-field').filter({hasText:'模式'}).locator('select').first().selectOption('multiply');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.find(item=>item.id==='vector')?.blend==='multiply');
  assert.deepEqual(errors,[],'图元混合流程不得产生浏览器异常');
  console.log('✓ V4 矢量混合：Inspector 写入、直接绘制与效果胶囊路径通过');
}finally{await browser.close();}
