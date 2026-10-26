import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
const evidence=resolve(root,'docs/design/evidence/pattern-library-2026-10-18');
if(process.argv.includes('--capture'))mkdirSync(evidence,{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4Patterns);
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:480,height:300,loop:4});classicV4View.select(null);});
  await page.locator('#toolbar-pattern').click();const library=page.locator('#v4-pattern-library'),card=id=>library.locator('[data-pattern-id="'+id+'"]');
  assert.equal(await library.getAttribute('data-mode'),'create');assert.equal(await library.locator('[data-pattern-action="create"]').count(),5);assert.equal(await page.locator('#side-import').isVisible(),false);
  if(process.argv.includes('--capture'))await page.screenshot({path:resolve(evidence,'create.png')});
  await page.waitForFunction(()=>[...document.querySelectorAll('#v4-pattern-cards canvas')].every(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0)));
  async function builtinScope(){if(await page.locator('#v4-pattern-cards').getAttribute('data-scope')!=='shared')await page.locator('[data-pattern-scope-switch]').click();}
  const preview=await library.locator('canvas').evaluateAll(cs=>cs.map(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0)));assert.ok(preview.every(Boolean));
  await card('ticks').locator('.asset-card-action.add').click();assert.equal(await page.locator('[role="dialog"]').count(),0);await library.locator('[data-pattern-carrier="rect"]').click();
  const actualCanvas=await page.evaluate(()=>classicV4View.canvas.id),stage=page.locator('#'+actualCanvas);
  async function point(x,y){const b=await stage.boundingBox();return{x:b.x+x/480*b.width,y:b.y+y/300*b.height};}
  const a=await point(70,60),b=await point(280,180);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
  const created=await page.evaluate(()=>ToSampoolV4Workspace.current().entities);assert.equal(created.length,1);assert.equal(created[0].parts[0].type,'rect');assert.equal(created[0].parts[0].extensions.ticks.enabled,true);
  assert.equal(await library.getAttribute('data-mode'),'apply');assert.equal(await page.locator('[data-extension-param="ticks.enabled"]').isChecked(),true);
  if(process.argv.includes('--capture'))await page.screenshot({path:resolve(evidence,'apply.png')});
  const before=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current()));await card('ticks').locator('.asset-card-action.add').click();assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current())),before);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0,'一次撤销应删除载体和拓展');
  await page.evaluate(()=>classicV4View.select(null));await builtinScope();await card('ticks').locator('.asset-card-action.add').click();await library.locator('[data-pattern-carrier="free"]').click();
  for(const [x,y]of[[70,60],[280,70],[170,180]]){const p=await point(x,y);await page.mouse.click(p.x,p.y);}await page.keyboard.press('Enter');
  const polygon=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0]);assert.equal(polygon.parts[0].type,'poly');assert.equal(polygon.parts[0].polygonMode,'free');assert.ok(polygon.parts[0].extensions.ticks.enabled);assert.equal(await card('nested').count(),0,'自由多边形不能伪装支持规则嵌套');
  await page.locator('[data-extension-param="ticks.count"]').fill('37');await page.locator('[data-extension-param="ticks.count"]').press('Tab');await page.locator('[data-extension-param="ticks.enabled"]').uncheck();
  await card('ticks').locator('.asset-card-action.add').click();assert.equal(await page.locator('[data-extension-param="ticks.count"]').inputValue(),'24','应用应覆盖为项目预设参数，不再将应用混同定位');
  await page.evaluate(()=>{classicV4Changes.run('增加第二图元',s=>s.entities[0].parts.push({id:'other',type:'line',x:0,y:0,x2:40,y2:40,stroke:'#fff',strokeWidth:1}));classicV4View.select(ToSampoolV4Workspace.current().entities[0].id);});
  await builtinScope();assert.equal(await library.getAttribute('data-mode'),'create');assert.equal(await library.locator('[data-pattern-action="create"]').count(),5);
  await card('nested').locator('.asset-card-action.add').click();assert.equal(await library.locator('[data-pattern-carrier="free"]').count(),0);
  await library.locator('[data-pattern-carrier="regular"]').click();const c=await point(300,70),d=await point(400,170);await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(d.x,d.y,{steps:3});await page.mouse.up();
  const multi=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0]);assert.equal(multi.parts.length,3);assert.equal(multi.parts[2].sides,5);assert.ok(multi.parts[2].extensions.nested.enabled);
  await page.evaluate(()=>classicV4View.select(null));await builtinScope();await card('elements').locator('.asset-card-action.add').click();await library.locator('[data-pattern-carrier="ellipse"]').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>classicV4Drawing.mode),'select');assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),1);
  await card('ticks').locator('.asset-card-action.add').click();await library.locator('[data-pattern-carrier="rect"]').click();await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:480,height:300,loop:4}));assert.equal(await page.evaluate(()=>classicV4Drawing.mode),'select');
  await page.evaluate(()=>{ToSampoolV4Workspace.mutate(s=>s.entities.push({id:'native',type:'ellipse',x:20,y:20,w:70,h:50,fill:'#ffd23f'}));classicV4View.select('native');});
  await builtinScope();await card('nested').locator('.asset-card-action.add').click();assert.equal(await page.locator('[data-extension-param="nested.enabled"]').isChecked(),true);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].type),'ellipse','原生图形应用不应转换类型');
  await page.evaluate(()=>classicV4View.select(null));await builtinScope();await card('ticks').locator('.asset-card-action.add').click();await library.locator('[data-pattern-carrier="rect"]').click();await page.evaluate(()=>classicV4View.select('native'));assert.equal(await page.evaluate(()=>classicV4Drawing.mode),'select','更换选择应取消未提交绘制');
  await page.locator('[data-library-tab="assets"]').click();assert.equal(await page.locator('#side-import').isVisible(),true);assert.equal(await library.isVisible(),false);
  assert.deepEqual(errors,[]);console.log('✓ 图样目录：顶栏与素材互斥／真实预览／选择筛选／幂等应用／原参数保留／矩形自由及规则多边形绘制／单次撤销／取消／项目隔离通过');
}finally{await browser.close();}
