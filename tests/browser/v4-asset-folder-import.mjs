import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.ToSampoolAssetFolderPlan);
  const output=await page.evaluate(async()=>{
    const file=(path,text,type)=>{const value=new File([text],path.split('/').at(-1),{type});Object.defineProperty(value,'webkitRelativePath',{value:path});return value;};
    const lantern='<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#f44"/></svg>',leaf=['#6a4','#7b5','#8c6'].map(color=>`<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><rect width="6" height="6" fill="${color}"/></svg>`);
    const files=[
      file('source/assets/lantern/asset.json',JSON.stringify({format:'tosampool-asset/v1',id:'lantern',name:'灯笼',kind:'image',source:'lantern.svg',recipe:{width:8,height:8}}),'application/json'),file('source/assets/lantern/lantern.svg',lantern,'image/svg+xml'),
      file('source/assets/leaf/asset.json',JSON.stringify({format:'tosampool-asset/v1',id:'leaf',name:'叶循环',kind:'sequence',frames:['frames/0.svg','frames/1.svg','frames/2.svg'],fps:2,recipe:{width:6,height:6}}),'application/json'),
      ...leaf.map((text,index)=>file(`source/assets/leaf/frames/${index}.svg`,text,'image/svg+xml')),
      file('source/loose.svg','<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>','image/svg+xml')
    ],input=document.getElementById('folder-file'),transfer=new DataTransfer();files.forEach(value=>transfer.items.add(value));Object.defineProperty(input,'files',{configurable:true,value:transfer.files});await importFolderThroughInput();return{sources:state.sources.map(source=>({name:source.name,frames:source.frames,recipe:source.v4Recipe})),assets:Object.keys(ToSampoolV4Workspace.current().assets),status:document.getElementById('m-import').textContent};
  });
  assert.equal(output.sources.length,3);assert.equal(output.sources.find(source=>source.name==='叶循环').frames,3);assert.equal(output.assets.length,3);assert.match(output.status,/已从文件夹复制 3 项素材/);assert.deepEqual(errors,[]);
  console.log('✓ V4 Asset Folder：项目素材复制、sequence recipe 与普通散图批量入库通过');
}finally{await browser.close();}
