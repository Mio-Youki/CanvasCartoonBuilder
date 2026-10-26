import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:900}}),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const api=ToSampoolRuntimeVNext.modules,surfaces=api.surfaces.create(),source=document.createElement('canvas');source.width=128;source.height=96;
    const ctx=source.getContext('2d'),image=ctx.createImageData(128,96);
    for(let y=0;y<96;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;image.data.set([x*2,y*2.68,(x*13+y*7)%256,255],i);}ctx.putImageData(image,0,0);
    const render=config=>{const start=performance.now(),out=api.sampling.apply(source,{'color-map':{enabled:true,...config}},surfaces,{time:0}),data=Array.from(out.getContext('2d').getImageData(0,0,out.width,out.height).data),duration=performance.now()-start;surfaces.release(out);return {data,duration};};
    const counts=[2,4,8,16,32,64].map(colors=>{const {data,duration}=render({colors}),values=new Set();for(let i=0;i<data.length;i+=4)values.add(data.slice(i,i+3).join(','));return {requested:colors,actual:values.size,duration};});
    const ceiling=render({colors:256}),max=render({colors:64}),cached=render({colors:64});
    const gradient={type:'linear',stops:[{offset:0,color:'#ff0000',alpha:1},{offset:1,color:'#0000ff',alpha:.5}]};
    const strip=document.createElement('canvas');strip.width=3;strip.height=1;const sc=strip.getContext('2d');sc.putImageData(new ImageData(new Uint8ClampedArray([0,0,0,255,128,128,128,128,255,255,255,255]),3,1),0,0);
    const mapped=api.sampling.apply(strip,{'color-map':{enabled:true,mode:'gradient',gradient}},surfaces,{time:0}),ramp=Array.from(mapped.getContext('2d').getImageData(0,0,3,1).data);surfaces.release(mapped);
    const crt=api.crtScreen,plain=document.createElement('canvas');plain.width=128;plain.height=96;plain.getContext('2d').fillRect(0,0,128,96);
    const alpha=(backend,mask)=>{crt.setBackend(backend);const out=crt.apply(plain,{enabled:true,curvature:.4,mask},surfaces,{time:0}),data=out.getContext('2d').getImageData(0,0,128,96).data;let holes=0;for(let i=3;i<data.length;i+=4)if(data[i]!==255)holes++;surfaces.release(out);return holes;};
    const cpu=alpha('cpu'),masked=alpha('cpu',{type:'rect'});let gpu=null,gpuError=null;try{gpu=alpha('gpu');}catch(error){gpuError=error.message;}crt.setBackend('auto');
    // Inspect real Player output, not only the sampled helper, including effect Step data.
    const scene={format:'tosampool-scene/v4',width:30,height:20,loop:2,background:{color:'#000000',alpha:0},entities:[{id:'owner',type:'rect',w:30,h:20,fill:'#808080',effects:{sample:{'color-map':{enabled:true,mode:'discrete',palette:'gb'}}}}],timeline:{tracks:{'effect:object:owner:color-map':{segments:[{f:[0,.5],values:{}},{f:[.5,1],values:{mode:'gradient',gradient}}]}}}};
    const runtime=ToSampoolRuntimeVNext.createRuntime(scene),canvas=document.createElement('canvas');runtime.renderTo(canvas,.2);const a=canvas.getContext('2d').getImageData(10,10,1,1).data;runtime.renderTo(canvas,1.2);const b=canvas.getContext('2d').getImageData(10,10,1,1).data;runtime.dispose();
    const bandPlayer=ToSampoolRuntimeVNext.createRuntime({format:'tosampool-scene/v4',width:100,height:100,background:{color:'#000000',alpha:0},entities:[{id:'bands',type:'vector',x:0,y:0,w:100,h:100,parts:[{id:'p',type:'rect',x:30,y:30,w:40,h:40,fill:'#ff0000',extensions:{nested:{enabled:true,style:'bands',direction:'out',count:3,scaleStep:.2,color:'#0000ff'}}}]}]}),bandCanvas=document.createElement('canvas');bandPlayer.renderTo(bandCanvas,0);const bandColors=[28,24,20].map(x=>Array.from(bandCanvas.getContext('2d').getImageData(x,50,1,1).data));bandPlayer.dispose();
    plain.getContext('2d').clearRect(50,35,28,26);crt.setBackend('cpu');const transparent=crt.apply(plain,{curvature:.4},surfaces,{time:0}),centerAlpha=transparent.getContext('2d').getImageData(64,48,1,1).data[3];surfaces.release(transparent);crt.setBackend('auto');
    surfaces.clear();return {counts,ceilingSame:ceiling.data.every((v,i)=>v===max.data[i]),cachedMs:cached.duration,ramp,cpu,masked,gpu,gpuError,bandColors,centerAlpha,stepChanges:Array.from(a).some((v,i)=>v!==b[i])};
  });
  assert.deepEqual(result.counts.map(item=>item.actual),[2,4,8,16,32,64]);assert.ok(result.ceilingSame,'256不得再绕过减色');
  assert.deepEqual(result.ramp.slice(0,4),[255,0,0,255]);assert.ok(result.ramp[4]>110&&result.ramp[6]>110&&result.ramp[7]>=94&&result.ramp[7]<=98,'渐变须连续插值且原Alpha与色标Alpha相乘');assert.ok(result.ramp[10]>250&&result.ramp[11]>=127&&result.ramp[11]<=129);
  assert.equal(result.cpu,0,'未蒙版CRT须铺满全部不透明输入');assert.ok(result.masked>0,'设置蒙版时不得缩放整幅来源');
  assert.equal(result.gpuError,null,'此浏览器夹具必须实际覆盖GPU路径');assert.equal(result.gpu,0);assert.ok(result.stepChanges);
  assert.deepEqual(result.bandColors,[[170,0,85,255],[85,0,170,255],[0,0,255,255]]);assert.equal(result.centerAlpha,0,'CRT裁切不能强行填实来源本身的透明洞');
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:160,loop:4});
    classicV4Changes.run('夹具',scene=>{scene.entities=[{id:'owner',type:'rect',x:15,y:15,w:210,h:130,fill:'#808080',fillPaint:{type:'linear',stops:[{offset:0,color:'#000000',alpha:1},{offset:1,color:'#ffffff',alpha:1}]},effects:{sample:{'color-map':{enabled:true,palette:'auto',colors:16}}}}];});classicV4View.select('owner');classicV4Inspector.focusEffect('object','owner','color-map');
  });
  const card=page.locator('[data-v4-effect-id="color-map"]'),mode=()=>card.locator('[data-effect-param="mode"]');
  assert.equal(await mode().getByRole('button',{name:'离散色板',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(await card.locator('.global-field').filter({hasText:'最大颜色数'}).locator('select option').allTextContents(),['2','4','8','16','32','64']);
  await card.locator('.global-field').filter({hasText:'最大颜色数'}).locator('select').selectOption('32');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].colors===32);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].colors),32);
  assert.equal(await mode().count(),1,JSON.stringify({errors,inspector:await page.locator('#inspector-context').innerText()}));
  if(process.argv.includes('--debug'))console.log('mode after select',await mode().evaluate(node=>node.outerHTML),errors);
  await mode().getByRole('button',{name:'渐变映射',exact:true}).click();
  assert.equal(await card.locator('.global-field').filter({hasText:'最大颜色数'}).count(),0);
  await card.getByTitle('渐变色标',{exact:true}).click();
  assert.equal(await page.locator('.color-pop .color-mode-tabs').isVisible(),false);assert.equal(await page.locator('.color-gradient-geometry').isVisible(),false);assert.equal(await page.locator('.color-gradient-overall').isVisible(),false);
  await page.locator('.color-hex').fill('#ff0000');await page.locator('.color-hex').press('Tab');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].gradient.stops[0].color),'#ff0000');
  await page.locator('.color-gradient-preview').click({position:{x:100,y:10}});
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].gradient.stops.length),3);
  if(process.argv.includes('--capture')){const dir=resolve(root,'docs/design/evidence/effect-adjustments-2026-10-20');mkdirSync(dir,{recursive:true});await page.screenshot({path:resolve(dir,'gradient-map.png')});}
  await page.locator('.color-pop-close').first().click();await page.evaluate(()=>classicV4Changes.undo());
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['color-map'].gradient.stops.length),2);
  // Armed timing must write this same field to the selected segment, not base config.
  await page.evaluate(()=>{classicV4Changes.run('时段',scene=>{scene.timeline.tracks['effect:object:owner:color-map']={segments:[{f:[0,.5],values:{}},{f:[.5,1],values:{}}]};});classicV4Timeline.seek(.2);classicV4Inspector.focusEffect('object','owner','color-map');});
  const timing=page.locator('#btn-timing-mode');if(await timing.evaluate(node=>node.classList.contains('active')))await timing.click();await timing.click();
  await mode().getByRole('button',{name:'离散色板',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(EditorVNextScene.serialize(ToSampoolV4Workspace.current())));
  assert.equal(saved.entities[0].effects.sample['color-map'].mode,'gradient');assert.equal(saved.timeline.tracks['effect:object:owner:color-map'].segments[0].values.mode,'discrete');
  await page.evaluate(()=>classicV4View.select(null));await page.click('#global-inspector-tabs [data-global-inspector="sampling"]');
  await card.locator('.global-field').filter({hasText:'启用'}).locator('input[type="checkbox"]').check();await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['color-map']?.extracted);await mode().getByRole('button',{name:'渐变映射',exact:true}).click();
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.sample['color-map'].mode),'gradient');
  assert.deepEqual(errors,[]);console.log('✓ 10-20浏览器：六档实际色数、连续色标与Alpha、Step/保存/撤销、对象/场景模式、CRT双后端铺满与蒙版例外',JSON.stringify({counts:result.counts,cachedMs:result.cachedMs}));
}finally{await browser.close();}
