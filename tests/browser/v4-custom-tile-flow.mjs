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
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const samples=await page.evaluate(()=>{
    const tile={type:'custom',tileWidth:2,tileHeight:2,tileScale:1,tilePixels:['#ff0000ff','#00ff00ff','#0000ffff','#00000000'],phaseX:0,phaseY:0};
    const surface=ToSampoolRuntimeVNext.modules.pattern.texture(4,4,tile,'#ffffff'),ctx=surface.getContext('2d'),large=ToSampoolRuntimeVNext.modules.pattern.texture(44,4,{...tile,tileScale:20},'#ffffff'),scaled=large.getContext('2d');
    return{base:[0,1,2,4].map(at=>Array.from(ctx.getImageData(at%4,Math.floor(at/4),1,1).data)),large:[0,19,20].map(x=>Array.from(scaled.getImageData(x,0,1,1).data))};
  });
  assert.deepEqual(samples.base[0],[255,0,0,255]);assert.deepEqual(samples.base[1],[0,255,0,255]);assert.deepEqual(samples.base[2],[255,0,0,255]);assert.deepEqual(samples.base[3],[0,0,255,255]);
  assert.deepEqual(samples.large[0],[255,0,0,255]);assert.deepEqual(samples.large[1],[255,0,0,255]);assert.deepEqual(samples.large[2],[0,255,0,255],'放大重复 tile 不得产生插值或边界错位');
  await page.evaluate(()=>{
    const holder=document.createElement('div');holder.id='custom-tile-test';Object.assign(holder.style,{position:'fixed',left:'8px',top:'8px',width:'300px',maxHeight:'95vh',overflow:'auto',zIndex:'99999',background:'#20242c'});document.body.append(holder);
    window.__customTilePattern=EditorVNextPartsState.defaultTexture('custom','#ffffff');
    window.__customTileRender=()=>{holder.replaceChildren();holder.append(EditorClassicV4PatternField.render({root:document,partsState:EditorVNextPartsState,pattern:window.__customTilePattern,color:'#ffffff',write:(_label,next)=>{window.__customTilePattern=next;},onReflow:window.__customTileRender}));};
    window.__customTileRender();
  });
  await page.locator('#custom-tile-test .v4-custom-tile-tools select').selectOption('bayer4');
  const afterPreset=await page.evaluate(()=>window.__customTilePattern);
  assert.equal(afterPreset.tileWidth,4);assert.equal(new Set(afterPreset.tilePixels).size,16);
  await page.locator('#custom-tile-test .v4-custom-tile-editor').click({position:{x:8,y:8}});
  const afterPaint=await page.evaluate(()=>window.__customTilePattern.tilePixels[0]);
  assert.equal(afterPaint,'#ffffffff','绘制格子必须写入可保存的 RGBA 数据');
  await page.evaluate(async()=>{
    const source=document.createElement('canvas');source.width=2;source.height=1;const ctx=source.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,1,1);ctx.fillStyle='#0000ff';ctx.fillRect(1,0,1,1);
    const blob=await new Promise(resolve=>source.toBlob(resolve,'image/png')),transfer=new DataTransfer();transfer.items.add(new File([blob],'tile.png',{type:'image/png'}));
    const input=document.querySelector('#custom-tile-test .v4-custom-tile-tools input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>window.__customTilePattern.tileWidth===2&&window.__customTilePattern.tileHeight===1);
  assert.deepEqual(await page.evaluate(()=>window.__customTilePattern.tilePixels),['#ff0000ff','#0000ffff'],'导入小图必须得到可编辑的内嵌像素，而非外部图片依赖');
  await page.locator('#custom-tile-test .v4-custom-tile-tools button').filter({hasText:'镜像'}).click();
  assert.deepEqual(await page.evaluate(()=>window.__customTilePattern.tilePixels),['#0000ffff','#ff0000ff'],'镜像必须只改格子数据');
  await page.locator('#custom-tile-test .v4-custom-tile-tools button').filter({hasText:'90°'}).click();
  assert.deepEqual(await page.evaluate(()=>[window.__customTilePattern.tileWidth,window.__customTilePattern.tileHeight]),[1,2],'90° 旋转必须交换 tile 宽高');
  await page.evaluate(()=>{
    const pixels=['#ff0000ff','#00ff00ff','#0000ffff','#ffffffff'];
    ToSampoolV4Workspace.createBlank({width:24,height:24});
    ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'tile-object',type:'rect',name:'自定义纹理对象',x:0,y:0,w:24,h:24,fill:'#ffffff',effects:{pipeline:['mask','decorate','sample'],decorate:{'texture-overlay':{enabled:true,texture:'custom',tileWidth:2,tileHeight:2,tileScale:1,tileScaleMode:'pixel',tilePixels:pixels,alpha:1,blend:'normal'}}}}));
    classicV4View.select('tile-object');
  });
  await page.click('#element-inspector-tabs [data-element-inspector="fx"]');
  assert.equal(await page.locator('#inspector-context [data-v4-effect-id="texture-overlay"] .v4-custom-tile-editor').count(),1,'真正的 Inspector 必须显示自定义 tile 格子编辑器');
  const rendered=await page.evaluate(()=>{const read=scene=>{const canvas=document.createElement('canvas');ToSampoolRuntimeVNext.createRuntime(scene).renderTo(canvas,0);return Array.from(canvas.getContext('2d').getImageData(0,0,2,1).data);};return{original:read(ToSampoolV4Workspace.current()),reopened:read(JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()))) };});
  assert.ok(rendered.original[0]>rendered.original[1]&&rendered.original[4]<rendered.original[5],'工程中的自定义纹理必须按 RGB 格子密铺，而不是回退为单线');
  assert.deepEqual(rendered.reopened,rendered.original,'自定义 tile 在工程 JSON 往返后必须保持同一画面');
  assert.deepEqual(errors,[],'自定义 tile UI 不得抛出浏览器异常');
  console.log('✓ V4 自定义 tile：密铺像素、Bayer 预设与画笔写入通过');
}finally{await browser.close();}
