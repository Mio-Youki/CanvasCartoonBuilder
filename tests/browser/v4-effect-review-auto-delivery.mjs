import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright-core';
import {startHost} from '../../host/effect-review-host.mjs';
const root=resolve(import.meta.dirname,'../..'),ctx=vm.createContext({}),copy=v=>JSON.parse(JSON.stringify(v));
for(const p of ['home-scene-vnext.js','editor/effect-review-state.js','editor/provider-review-candidate.js'])vm.runInContext(readFileSync(resolve(root,p),'utf8'),ctx);
const definition=JSON.parse(readFileSync(resolve(root,'examples/resources/folded-frame.tosampool-pattern.json'),'utf8')),c=ctx.ToSampoolProviderReviewCandidate.create(definition);
const candidate={subject:copy(ctx.ToSampoolEffectReviewState.identity(c)),parameters:copy(c.parameters),name:c.name,definition};mkdirSync(resolve(root,'.local'),{recursive:true});let calls=0;
const host=await startHost({port:0,folder:mkdtempSync(resolve(root,'.local/effect-auto-browser-')),candidates:new Map([[c.id,candidate]]),agent:async job=>{
  calls++;if(!job.record.review.note.includes('用户回答'))return{status:'needs-input',summary:'备注存在密度歧义',questions:[{id:'density',question:'希望臂长增加还是缩短？'}]};
  const next=copy(definition);next.parameters[1].default=40;return{status:'preview-ready',summary:'已增加默认臂长',definition:next};
}});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const bootstrap=page.waitForResponse(r=>r.url().endsWith('/bootstrap'));await page.goto(host.origin+'/review-candidate/'+c.id);await page.waitForFunction(()=>window.patternReview);await bootstrap;
  await page.locator('[data-review-label="gap"]').fill('边距');await page.locator('[data-review-confirm]').click();await page.waitForFunction(()=>document.querySelector('.review-save-status').textContent==='已加入共享图样',null,{timeout:15000});
  assert.equal(calls,0);const shared=await page.evaluate(async()=>{const lib=EditorV4ResourceLibrary.create();try{return await lib.publications();}finally{await lib.close();}});assert.equal(shared.length,1);assert.equal(shared[0].kind,'pattern');
  await page.reload();await page.waitForFunction(()=>window.patternReview);await page.waitForFunction(()=>document.querySelector('.review-save-status').textContent==='已加入共享图样',null,{timeout:10000});
  const editor=await context.newPage();editor.on('pageerror',e=>errors.push(e.message));await editor.goto(host.origin+'/img2asset-v4-classic.html?effectShared=1');
  try{await editor.locator('#v4-pattern-cards').getByText(c.name,{exact:false}).first().waitFor({timeout:8000});}catch(error){console.log('editor diagnostic',await editor.evaluate(async()=>({ready:!!window.classicV4ResourceEntries,shelf:window.classicV4Patterns?.shelf,scope:window.classicV4ResourceEntries?.patterns.scope,cardText:document.getElementById('v4-pattern-cards')?.innerText,imports:document.getElementById('m-import')?.textContent,rows:await window.classicV4Sharing.library.publications(),messages:[...document.querySelectorAll('.v4-resource-message')].map(n=>n.textContent)})),errors);throw error;}
  await page.getByRole('textbox',{name:'修订备注',exact:true}).fill('让边框更自然');await page.locator('[data-review-confirm]').click();await page.getByRole('textbox',{name:'希望臂长增加还是缩短？',exact:true}).fill('增加');await page.getByRole('button',{name:'回答并继续',exact:true}).click();await page.getByRole('link',{name:'打开下一版预览',exact:true}).waitFor({timeoutMs:10000});assert.equal(calls,2);
  const href=await page.getByRole('link',{name:'打开下一版预览',exact:true}).getAttribute('href');const next=await context.newPage();await next.goto(host.origin+href);await next.waitForFunction(()=>window.patternReview);assert.equal(await next.locator('[data-review-param="arm"]').inputValue(),'40');assert.equal((await next.evaluate(()=>patternReview.review())).subject.version,2);
  const nextBootstrap=next.waitForResponse(r=>r.url().endsWith('/bootstrap'));await next.reload();await nextBootstrap;await next.waitForFunction(()=>window.patternReview);await next.locator('[data-review-confirm]').click();await next.waitForFunction(()=>document.querySelector('.review-save-status').textContent==='已加入共享图样',null,{timeout:10000});
  assert.deepEqual(errors,[]);console.log('✓ 自动闭环夹具：真实确认→正式包→IndexedDB共享→编辑器共享卡；刷新恢复；备注→追问→回答→下一版预览→再确认交付（Agent为可控测试替身）');
}finally{await browser.close();await host.close();}
