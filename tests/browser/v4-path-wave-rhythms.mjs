import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:180,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{scene.entities=[{id:'owner',type:'vector',name:'节奏验证',x:20,y:30,w:270,h:100,parts:[{id:'A',type:'rect',x:0,y:0,w:120,h:80,fill:'#ffd23f',stroke:null},{id:'B',type:'ellipse',x:160,y:0,w:80,h:80,fill:'#60c8c0',stroke:null}]}];});classicV4View.selectPart('owner','A');
  });
  const field=key=>page.locator('#inspector-context [data-stroke-param="'+key+'"]');
  const hash=()=>page.evaluate(()=>{const c=document.createElement('canvas'),p=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current());p.renderTo(c,state.t||0);const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(const v of data)h=Math.imul(h^v,16777619);p.dispose();return h>>>0;});
  await field('strokeWave.enabled').check();await field('strokeWave.type').selectOption('digits');
  await field('strokeWave.digits').fill('5,5，9 1');await field('strokeWave.digits').press('Tab');
  assert.equal(await field('strokeWave.digits').inputValue(),'5591');
  await field('strokeWave.digits').fill('1509');await field('strokeWave.digits').press('Tab');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].strokeWave.digits),'5591','错误文本不应写入工程');
  assert.equal(await field('strokeWave.digits').evaluate(input=>input.validity.valid),false);
  await field('strokeWave.digits').fill('1595');await field('strokeWave.digits').press('Tab');
  for(const value of ['hold','linear','smooth']){await field('strokeWave.interpolation').selectOption(value);assert.equal(await field('strokeWave.interpolation').inputValue(),value);}
  await field('strokeWave.type').selectOption('noise');assert.equal(await field('strokeWave.digits').count(),0);assert.equal(await field('strokeWave.seed').count(),1);
  const first=await hash();await field('strokeWave.seed').fill('19');await field('strokeWave.seed').press('Tab');const second=await hash();assert.notEqual(first,second,'随机种子必须改变实际画面');
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await hash(),first,'撤销必须恢复原噪声轮廓');
  assert.equal(await page.evaluate(()=>!!ToSampoolV4Workspace.current().entities[0].parts[1].strokeWave?.enabled),false,'编辑某图元不得影响另一图元');
  await page.evaluate(()=>{classicV4Timeline.seek(.4);classicV4Changes.run('节奏分段夹具',scene=>{EditorVNextTimelineState.split(scene,'owner',.2);EditorVNextTimelineState.split(scene,'owner',.8);});});
  await page.locator('#btn-timing-mode').click();await field('strokeWave.type').selectOption('digits');await field('strokeWave.digits').fill('1519');await field('strokeWave.digits').press('Tab');
  await page.evaluate(()=>classicV4Timeline.seek(3.6));await page.locator('#btn-timing-mode').click();await field('strokeWave.type').selectOption('square');const stepB=await hash();
  await page.evaluate(()=>classicV4Timeline.seek(.4));assert.equal(await field('strokeWave.type').inputValue(),'digits');const stepA=await hash();assert.notEqual(stepA,stepB);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].strokeWave.type),'noise','时序编辑不能改全局基础值');
  const html=await page.evaluate(async()=>{const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),scene=(await EditorVNextProjectPackage.restore(packed.files)).scene;const values=ToSampoolRuntimeVNext.modules.timeline.valuesFor(scene,'owner',scene.entities[0],.1);if(values.parts[0].strokeWave.digits!=='1519')throw Error('项目恢复丢失数字节奏Step');return EditorVNextDeliveryBuilder.embedHtml({scene,name:'wave-rhythms',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;});
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
  const capture=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,sheet=document.createElement('canvas');sheet.width=960;sheet.height=600;
    const ctx=sheet.getContext('2d'),types=['sine','triangle','saw','square','digits','noise'];ctx.fillStyle='#151a22';ctx.fillRect(0,0,960,600);
    types.forEach((type,i)=>{
      const scene={format:'tosampool-scene/v4',width:440,height:150,background:{alpha:0},entities:[{id:'shape',type:'rect',x:20,y:20,w:160,h:96,radius:8,fill:'#ffd23f',strokeWave:{enabled:true,type,amplitude:6,wavelength:56,digits:'55595551',seed:11}},{id:'line',type:'line',x:218,y:60,w:190,h:1,fill:null,stroke:'#60c8c0',strokeWidth:3,strokeWave:{enabled:true,type,amplitude:16,wavelength:56,digits:'55595551',seed:11}}]};
      const p=runtime.createRuntime(scene),tile=document.createElement('canvas');p.renderTo(tile,0);p.dispose();const x=i%2*480,y=Math.floor(i/2)*200;ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.fillText(type==='digits'?'digits: 55595551':type,x+20,y+28);ctx.drawImage(tile,x+10,y+40);
    });return sheet.toDataURL();
  });
  if(process.argv.includes('--capture'))writeFileSync(resolve(root,'docs/architecture/v4-path-wave-rhythms.png'),Buffer.from(capture.split(',')[1],'base64'));
  await page.evaluate(()=>{ToSampoolV4Workspace.createBlank({width:240,height:120,loop:4});classicV4View.select(null);});
  await page.locator('[data-toolbar-mode="pencil"]').click();await page.locator('#v4-tool-stroke-settings summary').click();
  const tool=key=>page.locator('#v4-tool-stroke-settings [data-stroke-param="'+key+'"]');
  await tool('strokeWave.enabled').check();await tool('strokeWave.type').selectOption('digits');await tool('strokeWave.digits').fill('5591');await tool('strokeWave.digits').press('Tab');await tool('strokeWave.interpolation').selectOption('hold');await page.locator('#v4-tool-stroke-settings summary').click();
  const box=await page.locator('#v4-drawing-preview').boundingBox();await page.mouse.move(box.x+box.width*.15,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5,{steps:4});await page.mouse.up();
  const toolResult=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0]?.parts[0]?.strokeWave);assert.equal(toolResult.digits,'5591');assert.equal(toolResult.type,'digits');assert.equal(toolResult.interpolation,'hold');
  assert.deepEqual(errors,[]);console.log('路径节奏浏览器：渐进参数／无效输入拦截／实际seed变化与撤销／图元隔离／Step／项目／HTML／工具传递通过');
}finally{await browser.close();}
