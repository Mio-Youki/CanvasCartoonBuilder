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
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?halftone-mapping=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ToSampoolRuntimeVNext&&!!window.EditorEffectRegistryVNext);
  const probe=await page.evaluate(()=>{
    const sampling=ToSampoolRuntimeVNext.modules.sampling,surfaces=ToSampoolRuntimeVNext.modules.surfaces.create();
    const source=document.createElement('canvas');source.width=64;source.height=48;
    const ctx=source.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,32,48);ctx.fillStyle='#c08020';ctx.fillRect(32,0,32,48);
    function render(patch={}){
      const config=Object.assign({enabled:true,size:8,shape:'circle',threshold:.65,contrast:.75},patch);
      const output=sampling.apply(source,{halftone:config},surfaces,{time:0,preview:{pixelDivMultiplier:1}});
      const data=output.getContext('2d').getImageData(0,0,64,48).data;
      const pixel=(x,y)=>Array.from(data.slice((y*64+x)*4,(y*64+x)*4+4));
      const signature=Array.from(data).reduce((sum,value,index)=>(sum+value*(index%97+1))>>>0,0);
      if(output!==source)surfaces.release(output);
      return {pixel,signature};
    }
    const regular=render(),stagger=render({rowOffset:.5}),single=render({colorMode:'single',singleColor:'#2050e0'}),gradient=render({colorMode:'gradient',duotoneDark:'#000000',duotoneLight:'#ffffff'}),larger=render({threshold:.9}),smaller=render({threshold:.3}),lowContrast=render({contrast:.25}),highContrast=render({contrast:2});
    const bounded=document.createElement('canvas');bounded.width=64;bounded.height=48;
    bounded.getContext('2d').fillRect(16,16,32,16);
    const boundedOutput=sampling.apply(bounded,{halftone:{enabled:true,size:8,threshold:.65,contrast:.75}},surfaces,{time:0,preview:{pixelDivMultiplier:1}});
    const boundedData=boundedOutput.getContext('2d').getImageData(0,0,64,48).data;
    const outsideCentre=boundedData[(8*64+24)*4+3];
    if(boundedOutput!==bounded)surfaces.release(boundedOutput);
    return {
      defaults:EditorEffectRegistryVNext.effectById.halftone.params.filter(item=>['colorMode','rowOffset','threshold','contrast'].includes(item.key)).map(item=>[item.key,item.default]),
      regularAt8:regular.pixel(8,16),staggerAt8:stagger.pixel(8,16),staggerAt12:stagger.pixel(12,16),
      regularSignature:regular.signature,staggerSignature:stagger.signature,
      originalColor:regular.pixel(40,16),singleColor:single.pixel(40,16),gradientColor:gradient.pixel(40,16),
      largerSignature:larger.signature,smallerSignature:smaller.signature,lowContrastSignature:lowContrast.signature,highContrastSignature:highContrast.signature,
      outsideCentre
    };
  });
  assert.deepEqual(probe.defaults,[['rowOffset',0],['threshold',.65],['contrast',.75],['colorMode','original']]);
  assert.notEqual(probe.regularSignature,probe.staggerSignature,'错列偏移必须改变网点排列');
  assert.notDeepEqual(probe.regularAt8,probe.staggerAt8,'相邻行网点中心应错开');
  assert.ok(probe.singleColor[2]>probe.singleColor[0]&&probe.singleColor[3]>0,'单色网点应使用指定蓝色');
  assert.ok(Math.abs(probe.gradientColor[0]-probe.gradientColor[1])<2&&Math.abs(probe.gradientColor[1]-probe.gradientColor[2])<2,'双色渐变应按亮度插值为灰度');
  assert.notDeepEqual(probe.originalColor,probe.gradientColor,'原色和双色渐变不能相同');
  assert.notEqual(probe.largerSignature,probe.smallerSignature,'阈值必须控制覆盖大小');
  assert.notEqual(probe.lowContrastSignature,probe.highContrastSignature,'对比必须改变明暗之间的网点大小差');
  assert.equal(probe.outsideCentre,0,'透明对象包围框外不得另生一行完整网点中心');
  await page.evaluate(()=>{
    ToSampoolV4Workspace.createBlank({width:64,height:48,loop:2});
    ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'halftone-probe',name:'网点测试',type:'rect',x:8,y:8,w:40,h:24,fill:'#808080',effects:{sample:{halftone:{enabled:true,size:8,colorMode:'original'}}}}));
    classicV4View.select('halftone-probe');
  });
  await page.click('#element-inspector-tabs [data-element-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="halftone"]');
  const mode=card.locator('label:has-text("色彩") select');
  await mode.selectOption('single');
  assert.equal(await card.getByText('网点颜色',{exact:true}).count(),1,'选择单色后应立即展开网点颜色');
  await card.locator('label:has-text("色彩") select').selectOption('gradient');
  assert.equal(await card.getByText('暗色',{exact:true}).count(),1,'选择双色渐变后应立即展开暗色');
  assert.equal(await card.getByText('亮色',{exact:true}).count(),1,'选择双色渐变后应立即展开亮色');
  assert.deepEqual(errors,[]);
  console.log('✓ 网点映射：三种色彩、错列偏移、阈值／对比与透明边界通过');
}finally{await browser.close();}
