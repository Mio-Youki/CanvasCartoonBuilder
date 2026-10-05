import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&window.EditorVNextAgentReference&&window.ToSampoolV4AgentCreative&&window.ToSampoolV4Assets);
  const result=await page.evaluate(async()=>{
    const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wHwMDEwMDAwMAAA0gAgGKV2VRAAAAAElFTkSuQmCC';
    ToSampoolV4Workspace.mutate(scene=>{scene.assets={reference:{name:'处理后参考图',locator:png,mime:'image/png',width:2,height:2,recipe:{width:2,height:2}}};scene.entities=[];});
    ToSampoolV4Assets.select('reference');const reference=await EditorVNextAgentReference.freeze(ToSampoolV4Workspace.current(),'reference',{host:EditorHost,baseUrl:location.href});return{format:reference.format,name:reference.name,size:[reference.width,reference.height],source:reference.source,data:reference.dataUrl.startsWith('data:image/png;base64,')};
  });
  assert.deepEqual(result,{format:'tosampool-agent-reference/v2',name:'处理后参考图',size:[2,2],source:'processed-asset',data:true});
  await page.evaluate(()=>{
    window.addEventListener('tosampool-agent-creative-request',event=>{const request=event.detail;window.__agentReferences=request.payload.references||[];window.dispatchEvent(new CustomEvent('tosampool-agent-creative-response',{detail:{requestId:request.requestId,result:{reply:'已收到参考图。',question:{id:'control',label:'控制程度',choices:[{value:'semantic',label:'语义'}]}}}}));});
    window.ToSampoolV4AgentAdapter=EditorVNextAgentCreativeBridge.create({target:window,timeout:1000});
  });
  await page.click('#btn-generate');await page.getByRole('button',{name:'添加素材所选'}).click();
  await page.waitForFunction(()=>document.querySelector('.agent-creative-reference')?.textContent.includes('处理后参考图'));
  await page.locator('.agent-creative-wizard [name="prompt"]').fill('让这张图的云慢慢移动');await page.locator('.agent-creative-composer').evaluate(form=>form.requestSubmit());
  await page.waitForFunction(()=>window.__agentReferences&&window.__agentReferences[0]?.assetId==='reference');
  assert.equal(await page.evaluate(()=>window.__agentReferences[0].role), 'style','桥接必须收到带用途的冻结参考图列表');
  assert.deepEqual(errors,[]);console.log('✓ v4 Agent 图片参考：素材预处理结果可冻结为浏览器内只读输入');
}finally{await browser.close();}
