import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),source=readFileSync(resolve(root,'tests/fixtures/agent-draft-smoke/project.tosampool.json'),'utf8');
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.addInitScript(text=>{window.showOpenFilePicker=async()=>[{getFile:async()=>new File([text],'project.tosampool.json',{type:'application/json'})}];},source);
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.EditorVNextProjectPackage&&window.EditorSceneFileController);
  const result=await page.evaluate(async()=>{
    const opened=await EditorHost.openProject();
    if(!opened||opened.kind!=='project')throw new Error('原始项目根文件没有被 Host 识别为项目包');
    // This is exactly the branch BrowserHost returns for a raw
    // tosampool-project/v1 JSON selected in the file picker.
    const restored=await EditorVNextProjectPackage.restore(opened.files);
    ToSampoolV4Workspace.replace(restored.scene,{locator:opened.name,moduleScope:ToSampoolV4Workspace.nextModuleScope()});
    const raw={format:ToSampoolV4Workspace.current().format,entities:ToSampoolV4Workspace.current().entities.length,loop:ToSampoolV4Workspace.current().loop,locator:ToSampoolV4Workspace.locator};
    const archive=EditorVNextProjectArchive.pack(opened.files);
    window.showOpenFilePicker=async()=>[{getFile:async()=>new File([archive],'draft.tosampool.zip',{type:'application/zip'})}];
    const zipped=await EditorHost.openProject();
    if(!zipped||zipped.kind!=='project')throw new Error('根目录正确的 ZIP 没有被 Host 识别为项目包');
    const restoredZip=await EditorVNextProjectPackage.restore(zipped.files);
    return {raw,zip:{format:restoredZip.scene.format,entities:restoredZip.scene.entities.length,loop:restoredZip.scene.loop,projectFile:zipped.files.some(file=>file.path==='project.tosampool.json')}};
  });
  assert.deepEqual(result,{raw:{format:'tosampool-scene/v4',entities:5,loop:4,locator:'project.tosampool.json'},zip:{format:'tosampool-scene/v4',entities:5,loop:4,projectFile:true}});
  assert.deepEqual(errors,[]);
  console.log('✓ v4 原始项目根文件：Draft Package 的 project.tosampool.json 可恢复为编辑器 Scene');
}finally{await browser.close();}
