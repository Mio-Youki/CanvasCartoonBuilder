import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {startHost} from '../../host/effect-review-host.mjs';
const root=resolve(import.meta.dirname,'../..');mkdirSync(resolve(root,'.local'),{recursive:true});
const host=await startHost({port:0,folder:mkdtempSync(resolve(root,'.local/dual-ray-delivery-'))});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),review=await context.newPage(),errors=[];review.on('pageerror',e=>errors.push(e.message));
  const bootstrap=review.waitForResponse(r=>r.url().endsWith('/bootstrap'));await review.goto(host.origin+'/examples/pattern-proposals/dual-ray/preview.html');await review.waitForFunction(()=>window.patternReview);await bootstrap;
  await review.locator('[data-review-confirm]').click();await review.waitForFunction(()=>document.querySelector('.review-save-status').textContent==='已加入共享图样',null,{timeout:15000});
  const job=host.jobs.list().at(-1);assert.equal(job.status,'shared');assert.equal(job.result.definition.format,'tosampool-pattern-generator/v1');
  const editor=await context.newPage();editor.on('pageerror',e=>errors.push(e.message));await editor.goto(host.origin+'/img2asset-v4-classic.html?effectShared=1');await editor.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
  await editor.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180,loop:12});classicV4Changes.run('准备载体',s=>{s.entities=[{id:'owner',type:'vector',x:40,y:30,w:160,h:100,parts:[{id:'p',type:'ellipse',x:0,y:0,w:160,h:100,fill:'#ffffff',stroke:null}]}];});classicV4View.selectPart('owner','p');classicV4ResourceEntries.patterns.setScope('shared');classicV4Patterns.open('patterns');});
  const card=editor.locator('[data-pattern-id="proposal.dual-ray"]');await card.waitFor({timeout:10000});await card.locator('[data-pattern-action="apply"]').click();
  await editor.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0]?.parts[0]?.extensions?.['proposal.dual-ray']?.enabled);
  assert.equal(await editor.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].type),'ellipse');
  assert.equal(await editor.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].recipe),undefined);
  assert.equal(await editor.locator('[data-generator-color]').count(),2);
  assert.equal(await editor.evaluate(()=>Object.keys(ToSampoolV4Workspace.current().patternResources).length),1);
  const pixelChange=await editor.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;await ToSampoolV4Workspace.renderTo(c,0);const a=c.toDataURL();await ToSampoolV4Workspace.renderTo(c,2);return a!==c.toDataURL();});assert.ok(pixelChange);
  assert.deepEqual(errors,[]);console.log('✓ 附着双色放射交付：审阅确认→path资源包→共享入库→编辑器共享卡→椭圆类型不变→项目单卡→原颜色控件→动态画面；无真实模型调用');
}finally{await browser.close();await host.close();}
