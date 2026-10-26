import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.classicV4MaterialPreviews);
  const ids=await page.evaluate(async()=>{
    if(state.playing)togglePlay();const scene=EditorVNextScene.blank({width:160,height:96}),image=(color,half=false)=>{const c=document.createElement('canvas');c.width=8;c.height=8;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,half?4:8,8);return{locator:c.toDataURL(),mime:'image/png',width:8,height:8};};
    const red=image('#ff0000'),blue=image('#0000ff');scene.assets={sequence:{...red,name:'两帧序列',fps:12,frames:[red,blue]},derived:{...red,name:'透明派生',alphaMask:{...image('#ffffff',true),mode:'replace-alpha'}}};
    scene.entities=[{id:'moving',name:'循环元素',type:'rect',x:10,y:10,w:40,h:20,fill:'#ee8833',anim:{bob:{amount:3,period:1,angle:90}}}];const id=EditorV4ElementPresets.add(scene,'moving');ToSampoolV4Workspace.replace(scene);await syncClassicV4AssetShelf();classicV4Patterns.open('assets');
    const shares=[];for(const selection of [{kind:'asset',id:'sequence'},{kind:'asset',id:'derived'},{kind:'element',id}])shares.push((await classicV4Sharing.service.publish(ToSampoolV4Workspace.current(),selection)).record.id);
    return{id,shares};
  });
  const seq=page.locator('[data-v4-asset-id="sequence"]'),element=page.locator('[data-element-preset-id]');await page.mouse.move(1000,40);await page.evaluate(()=>classicV4MaterialPreviews.settled());
  const read=selector=>page.locator(selector+' canvas').evaluate(c=>c.toDataURL()),seqSelector='[data-v4-asset-id="sequence"]';
  const initial=await read(seqSelector),elementInitial=await read('[data-element-preset-id]'),before=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current()));
  await page.waitForTimeout(650);assert.equal(await read(seqSelector),initial,'空闲序列不能持续播放');assert.equal(await read('[data-element-preset-id]'),elementInitial);
  await seq.hover();await page.waitForFunction(()=>document.querySelector('[data-v4-asset-id="sequence"]').dataset.previewPlaying==='true');await page.waitForTimeout(600);assert.notEqual(await read(seqSelector),initial,'序列应以2fps预览');
  await element.hover();await page.waitForFunction(()=>document.querySelector('[data-element-preset-id]').dataset.previewPlaying==='true');assert.equal(await read(seqSelector),initial,'切卡必须复位前一卡');await page.waitForTimeout(250);assert.notEqual(await read('[data-element-preset-id]'),elementInitial,'元素基础动态应能预览');
  const stats=await page.evaluate(()=>classicV4MaterialPreviews.snapshot());assert.equal(stats.active,1);assert.equal(stats.liveSessions,1);
  await page.mouse.move(1000,40);assert.equal(await read('[data-element-preset-id]'),elementInitial);const frozen=await page.evaluate(()=>classicV4MaterialPreviews.snapshot().frames);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>classicV4MaterialPreviews.snapshot().frames),frozen,'离开后不再绘制');
  assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current())),before,'预览不得写工程');
  await element.focus();await page.keyboard.press('p');await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===1);await page.keyboard.press('p');assert.equal(await page.evaluate(()=>classicV4MaterialPreviews.snapshot().active),0);assert.equal(await read('[data-element-preset-id]'),elementInitial,'重复预览不得叠加边缘Alpha');
  await seq.hover();await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===1);await page.evaluate(()=>document.getElementById('asset-pane').classList.remove('open'));await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===0);assert.equal(await read(seqSelector),initial);
  await page.mouse.move(1000,40);await page.evaluate(()=>classicV4Patterns.open('assets'));await page.evaluate(()=>classicV4MaterialPreviews.settled());await seq.hover();await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===1);
  await page.evaluate(()=>{const n=document.createElement('div');n.id='preview-scroll-spacer';n.style.height='1600px';document.getElementById('side-import').prepend(n);});await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===0);await page.mouse.move(1000,40);await page.evaluate(()=>document.getElementById('preview-scroll-spacer').remove());
  await page.evaluate(()=>classicV4MaterialPreviews.settled());const projectAlpha=await read('[data-v4-asset-id="derived"]');await page.locator('[data-material-scope="shared"]').click();
  const sharedSeq=page.locator('[data-publication-id="'+ids.shares[0]+'"]');await sharedSeq.waitFor();await page.evaluate(()=>classicV4MaterialPreviews.settled());assert.equal(await read('[data-publication-id="'+ids.shares[0]+'"]'),initial,'项目／共享序列首帧一致');
  const sharedAlpha=page.locator('[data-publication-id="'+ids.shares[1]+'"]');await sharedAlpha.scrollIntoViewIfNeeded();await page.evaluate(()=>classicV4MaterialPreviews.settled());assert.equal(await read('[data-publication-id="'+ids.shares[1]+'"]'),projectAlpha,'共享预览不得漏掉Alpha');
  await sharedSeq.hover();await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===1);await page.waitForTimeout(600);assert.notEqual(await read('[data-publication-id="'+ids.shares[0]+'"]'),initial);await page.locator('[data-material-scope="project"]').click();await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===0);
  await seq.focus();await page.keyboard.press('p');await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().active===1);
  // Exercise the browser visibility handler without claiming an OS/Tauri test.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>classicV4MaterialPreviews.snapshot().active),0);await page.evaluate(()=>delete document.hidden);
  await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:160,height:96}));await page.waitForFunction(()=>classicV4MaterialPreviews.snapshot().bindings===0);assert.equal(await page.evaluate(()=>classicV4MaterialPreviews.snapshot().liveSessions),0);
  await page.evaluate(async()=>{classicV4Changes.run('缺失素材',scene=>{scene.assets.broken={name:'待修复图片',locator:'data:image/png;base64,bad',width:8,height:8};});await syncClassicV4AssetShelf();classicV4Patterns.open('assets');});await page.evaluate(()=>classicV4MaterialPreviews.settled());
  const broken=page.locator('[data-v4-asset-id="broken"]');assert.equal(await broken.locator('.nm').textContent(),'待修复图片');assert.match(await broken.locator('.v4-material-note').textContent(),/预览不可用/);assert.equal(await broken.locator('.add').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('✓ RC3-c1预览：项目／共享首帧与Alpha、2fps序列／元素动态、单活跃、离开复位、不改工程、P键、收起／离屏／范围／visibility信号／项目切换释放');
}finally{await browser.close();}
