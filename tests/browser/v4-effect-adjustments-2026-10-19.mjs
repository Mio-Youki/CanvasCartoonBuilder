import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
 const pixels=await page.evaluate(()=>{
   const api=ToSampoolRuntimeVNext.modules,s=api.surfaces.create(),c=document.createElement('canvas');c.width=64;c.height=48;const cx=c.getContext('2d');cx.fillStyle='#8c8c8c';cx.fillRect(0,0,64,48);
   const run=(group,time)=>{const out=api.sampling.apply(c,group,s,{time,preview:{pixelDivMultiplier:1}}),data=Array.from(out.getContext('2d').getImageData(0,0,64,48).data);if(out!==c)s.release(out);return data;};
   const cfg={enabled:true,threshold:.5,dark:'#000000',light:'#ffffff',motion:{enabled:true,type:'threshold-pulse',period:1,steps:4,amount:.2}};
   const a=run({threshold:cfg},.01),b=run({threshold:cfg},.12),d=run({threshold:cfg},.3),end=run({threshold:cfg},1.01);
   const dots={enabled:true,size:8,colorMode:'single',singleColor:'#ff0000'},plain=run({halftone:dots},0),background=run({halftone:{...dots,originalBackground:true}},0);
   const old={enabled:true,palette:'pico8',motion:{enabled:true,type:'palette-flash',period:1}},m1=run({'color-map':old},0),m2=run({'color-map':old},.6);s.clear();
   return{hold:a.every((v,i)=>v===b[i]),change:a.some((v,i)=>v!==d[i]),loop:a.every((v,i)=>v===end[i]),holes:plain.filter((v,i)=>i%4===3&&v===0).length,opaque:background.every((v,i)=>i%4!==3||v===255),static:m1.every((v,i)=>v===m2[i])};
 });assert.deepEqual(pixels,{hold:true,change:true,loop:true,holes:pixels.holes,opaque:true,static:true});assert.ok(pixels.holes>0);
 await page.evaluate(()=>{
   if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:160,loop:4});
   classicV4Changes.run('设置夹具',scene=>{
     scene.entities=[{id:'owner',type:'vector',x:40,y:35,w:120,h:90,parts:[{id:'a.b',type:'rect',x:0,y:0,w:120,h:90,fill:null,stroke:'#ff4400',strokeWidth:4,pathRevealEnabled:true,strokeCompletion:25}]}];
     const key='partsById.a%2Eb.pathStart';scene.timeline.tracks.owner={segments:[{f:[0,.25],values:{[key]:0}},{f:[.25,.75],values:{}},{f:[.75,1],values:{[key]:.75}}]};
   });state.t=.3;classicV4View.select('owner');classicV4Inspector.render();
 });
 await page.locator('#btn-timing-mode').click();const track=page.locator('#tl-context'),box=await track.boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 const hovered=await page.locator('#tl-linear-toggle').evaluate(e=>e._v4);await page.locator('#tl-linear-toggle').click();
 const trackResult=await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.tracks.owner),linear=trackResult.segments.find(s=>s.type==='linear');assert.ok(linear?.linearKeys?.includes('partsById.a%2Eb.pathStart'),JSON.stringify({hovered,trackResult}));
 const motion=await page.evaluate(()=>{
   const scene=ToSampoolV4Workspace.current(),player=ToSampoolRuntimeVNext.createRuntime(scene),canvas=document.createElement('canvas');player.renderTo(canvas,1.1);const a=canvas.toDataURL();player.renderTo(canvas,2.8);const b=canvas.toDataURL();player.dispose();return a!==b;
 });assert.equal(motion,true,'起点Linear必须改变真实路径画面');
 await page.evaluate(()=>{classicV4Timeline.seek(.2);classicV4Inspector.render();});
 const timing=page.locator('#btn-timing-mode');if(await timing.evaluate(e=>e.classList.contains('active')))await timing.click();await timing.click();
 const beforeWrite=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().timeline));
 const start=page.locator('[data-stroke-param="pathStart"]');await start.fill('.2');await start.press('Tab');
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.tracks.owner.segments.find(s=>.05>=s.f[0]&&.05<s.f[1]).values['partsById.a%2Eb.pathStart']),.2);
 await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().timeline)),beforeWrite);
 await page.evaluate(()=>{classicV4Changes.run('网点预览',scene=>{scene.entities=[{id:'dots',type:'rect',x:25,y:20,w:190,h:120,fill:'#88bbdd',effects:{sample:{halftone:{enabled:true,size:8,colorMode:'single',singleColor:'#263b54',originalBackground:true}}}}];scene.timeline={tracks:{}};});classicV4View.select('dots');classicV4Inspector.focusEffect('object','dots','halftone');});
 assert.equal(await page.getByText('原图背景',{exact:true}).count()>0,true);
 if(process.argv.includes('--capture')){const dir=resolve(root,'docs/design/evidence/effect-adjustments-2026-10-19');mkdirSync(dir,{recursive:true});await page.screenshot({path:resolve(dir,'halftone-background.png')});}
 assert.deepEqual(errors,[]);console.log('✓ 效果调整浏览器：阈值保持／跳帧／闭环、网点背景、颜色映射静止、真实Linear入口／起点写入／撤销／画面变化');
}finally{await browser.close();}
