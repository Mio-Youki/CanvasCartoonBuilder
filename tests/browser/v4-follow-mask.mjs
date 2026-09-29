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
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.createRuntime);
  const result=await page.evaluate(()=>{
    const base={format:'tosampool-scene/v4',width:64,height:32,loop:2,background:{color:'#000000',alpha:1},entities:[{id:'box',type:'rect',x:10,y:10,w:20,h:10,fill:'#ff0000',anim:{bob:{amount:4,period:2,angle:0}},effects:{mask:{type:'rect',x:10,y:10,w:10,h:10,follow:true,followMatrix:[1,0,0,1,10,10]}}}]};
    const masked=document.createElement('canvas'),plain=document.createElement('canvas');
    ToSampoolRuntimeVNext.createRuntime(base).renderTo(masked,.5);
    const withoutMask=structuredClone(base);delete withoutMask.entities[0].effects;
    ToSampoolRuntimeVNext.createRuntime(withoutMask).renderTo(plain,.5);
    const box=canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,64,32).data,points=[];for(let y=0;y<32;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4]>200)points.push([x,y]);return{minX:Math.min(...points.map(point=>point[0])),maxX:Math.max(...points.map(point=>point[0]))};};
    return{masked:box(masked),plain:box(plain)};
  });
  assert.equal(result.masked.minX,result.plain.minX,'跟随蒙版不能额外平移对象胶囊');
  assert.equal(result.masked.maxX,result.plain.minX+9,'跟随蒙版应保留对象左半部，且使用相同动态位移');
  console.log('✓ v4 跟随蒙版：对象与蒙版共享变换增量，不重复位移');
}finally{await browser.close();}
