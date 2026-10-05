import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { snowglobeAgentReply } from '../fixtures/agent-snowglobe-reply.mjs';

const root=resolve(import.meta.dirname,'../..');
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
const browser=await chromium.launch(edge?{headless:true,executablePath:edge}:{headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try {
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EditorVNextAgentCreativeProtocol&&window.EditorVNextAgentCreativeBridge&&window.EditorClassicV4AgentCreativeController&&window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(reply=>{
    window.addEventListener('tosampool-agent-creative-request',event=>{
      const request=event.detail;
      const response=request.kind==='propose'?{result:reply}:(()=>{
        const context=request.payload.context;if(!context||context.format!=='tosampool-agent-context/v2'||!context.canvas||context.canvas.base!=='current-scene')throw new Error('创作 Agent 必须收到冻结的画布 Context Pack');
        const scene={format:'tosampool-scene/v4',version:4,width:context.brief.dimensions.width,height:context.brief.dimensions.height,loop:context.brief.loop,background:{color:'#10151d',alpha:1},entities:[{id:'agent-cabin',name:'Agent 小木屋',type:'rect',x:12,y:12,w:36,h:24,fill:'#ffc94a'}]};
        const project={format:'tosampool-project/v1',version:1,projectId:'agent-snowglobe',displayName:'冬夜雪花球草稿',scene},manifest={format:'tosampool-agent-draft/v1',version:1,draftId:'agent-snowglobe-01',title:'冬夜雪花球草稿',summary:'以小木屋和暖光作为可继续编辑的第一层。',changes:['新增 Agent 小木屋','保留现有画布与循环参数'],project:'project.tosampool.json',carrierReport:'carrier-report.json'},carrier={format:'tosampool-carrier-report/v1',version:1,objects:[{id:'agent-cabin',semantic:'发光小木屋',carrier:'普通对象与图元',editable:['位置','主色'],frozen:[],budget:{tier:'low',reason:'测试'}}]};
        return {result:{files:[{path:'draft.manifest.json',data:JSON.stringify(manifest),mime:'application/json'},{path:'project.tosampool.json',data:JSON.stringify(project),mime:'application/json'},{path:'carrier-report.json',data:JSON.stringify(carrier),mime:'application/json'}]}};
      })();
      window.dispatchEvent(new CustomEvent('tosampool-agent-creative-response',{detail:Object.assign({requestId:request.requestId},response)}));
    });
    window.ToSampoolV4AgentAdapter=EditorVNextAgentCreativeBridge.create({target:window,timeout:1000});
  },snowglobeAgentReply);
  await page.click('#btn-generate');
  await page.waitForSelector('.agent-creative-wizard');
  assert.match(await page.locator('.agent-creative-chat').textContent(),/告诉我你想新建、编排或派生什么/);
  await page.locator('.agent-creative-wizard [name="prompt"]').fill('冬天的雪花球，小木屋发着暖光');
  await page.locator('.agent-creative-composer').evaluate(form=>form.requestSubmit());
  await page.waitForSelector('.agent-chat-question');
  assert.equal(await page.locator('.agent-creative-candidate').count(),0,'首句后必须先追问，不得抢先给方向卡');
  await page.getByRole('button',{name:'季节语义：可分别调整每季元素'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.agent-creative-candidate').length===3);
  assert.match(await page.locator('.agent-creative-chat').textContent(),/雪花球画面/,'Adapter 回复必须能进入对话记录');
  await page.locator('.agent-creative-candidate').first().click();
  await page.waitForSelector('.agent-creative-selection');
  const before=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current()));
  await page.locator('.agent-creative-selection button').click();
  await page.waitForSelector('.agent-creative-draft');
  const after=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current()));
  assert.equal(after,before,'临时 Scene 出现前不得改写当前工程');
  assert.match(await page.locator('.agent-creative-draft').textContent(),/新增 Agent 小木屋/);
  assert.match(await page.locator('.agent-creative-draft').textContent(),/发光小木屋 · 普通对象与图元/,'草稿包必须显示载体报告');
  await page.locator('.agent-creative-draft-actions button').first().click();
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.some(item=>item.id==='agent-cabin'));
  assert.match(await page.locator('.agent-creative-chat').textContent(),/可撤销变更/);
  assert.deepEqual(errors,[]);
  console.log('✓ v4 Agent 创作流程：隔离 Agent 回答、分阶段方向卡与安全边界通过');
} finally { await browser.close(); }
