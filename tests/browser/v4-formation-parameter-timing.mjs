import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/formation-timing');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
 await page.evaluate(()=>{
  if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:140,loop:12});classicV4Changes.run('成样参数夹具',s=>{
   s.entities=[{id:'a',type:'rect',x:20,y:15,w:50,h:30,scaleX:1,scaleY:1,alpha:1,fill:'#ff0000'},
    {id:'v',type:'vector',x:40,y:50,w:130,h:70,parts:[{id:'p.a',type:'rect',x:0,y:0,w:60,h:40,fill:null,stroke:'#334155',strokeWidth:2,pathRevealEnabled:true,strokeCompletion:100,pathStart:0,strokeWave:{enabled:true,amplitude:2,wavelength:16}},{id:'second',type:'line',x:70,y:0,x2:110,y2:30,stroke:'#334155',strokeWidth:2}]},
    {id:'text',type:'text',text:'ABCDE',x:120,y:10,fontSize:18,fontFamily:'sans-serif',fill:'#114477',textCompletion:100},
    {id:'g',type:'group',x:0,y:0,w:50,h:30,alpha:1}];EditorVNextTextState.update(s,'text',{},document);
   for(const id of ['a','v','text','g']){EditorVNextTimelineState.track(s,id);EditorVNextTimelineState.split(s,id,1/3);EditorVNextTimelineState.split(s,id,2/3);}
  });state.t=10;classicV4View.select('a');
 });
 const field=key=>page.locator('[data-formation-parameter="'+key+'"]'),clock=key=>page.locator('[data-formation-parameter-clock="'+key+'"]');
 async function arm(key){await clock(key).locator('xpath=..').hover();await clock(key).click();}
 async function set(key,value){await field(key).fill(String(value));await field(key).press('Tab');}
 const data=id=>page.evaluate(id=>{const s=ToSampoolV4Workspace.current();return{base:s.entities.find(e=>e.id===id),values:s.timeline.tracks[id].segments[2].values};},id);
 await arm('x');await set('x',80.7);let result=await data('a');assert.equal(result.base.x,20);assert.equal(result.values.x,81);assert.equal(await field('x').inputValue(),'81');
 await set('alpha',50);result=await data('a');assert.equal(result.base.alpha,.5);assert.equal(result.values.alpha,undefined,'X的覆层不能使透明度自动写入同段');
 await arm('scaleX');await set('scaleX',150);assert.equal((await data('a')).values.scaleX,1.5);assert.equal(await field('scaleX').inputValue(),'150');
 await arm('blend');await field('blend').selectOption('screen');assert.equal((await data('a')).values.blend,'screen');assert.equal(await clock('blend').getAttribute('data-timing-kind'),'step');assert.equal(await clock('x').getAttribute('data-timing-kind'),'linear');
 assert.equal(await clock('skewX').count(),0);await set('skewX',12.3);assert.equal((await data('a')).base.skewX,12.3);assert.equal((await data('a')).values.skewX,undefined);
 await arm('x');assert.equal((await data('a')).values.x,undefined);assert.equal((await data('a')).values.scaleX,1.5);await page.locator('#stage-meta-bar .stage-meta-title').click();await page.keyboard.press('Control+z');assert.equal((await data('a')).values.x,81);
 await page.evaluate(()=>classicV4View.select('g'));await arm('alpha');await set('alpha',35);assert.equal((await data('g')).values.alpha,.35);assert.equal((await data('g')).base.alpha,1);
 await page.evaluate(()=>classicV4View.selectPart('v','p.a'));assert.equal(await clock('x').count(),0,'图元几何仍只改基础值，不增加独立轨');assert.equal(await clock('pathEndpoints.enabled').count(),0);assert.equal(await clock('radius').count(),0);
 await arm('strokeCompletion');await set('strokeCompletion',25);result=await data('v');const prefix='partsById.p%2Ea.';assert.equal(result.values[prefix+'strokeCompletion'],25);assert.equal(result.base.parts[0].strokeCompletion,100);assert.equal(result.values.strokeCompletion,undefined);
 await arm('strokeWave.amplitude');await set('strokeWave.amplitude',7);assert.equal((await data('v')).values[prefix+'strokeWave.amplitude'],7);
 await page.evaluate(()=>{classicV4Changes.run('调序及改名',s=>{const v=s.entities.find(e=>e.id==='v');v.parts.reverse();v.parts.find(p=>p.id==='p.a').name='已改名图元';});classicV4View.selectPart('v','p.a');});assert.equal(await field('strokeCompletion').inputValue(),'25');assert.equal(await clock('strokeCompletion').getAttribute('data-formation-path'),prefix+'strokeCompletion');
 await page.screenshot({path:resolve(out,'part.png')});
 await page.evaluate(()=>classicV4View.select('text'));await arm('textCompletion');await set('textCompletion',0);result=await data('text');assert.equal(result.base.textCompletion,100);assert.equal(result.values.textCompletion,0);
 await arm('textCursor.enabled');await field('textCursor.enabled').check();assert.equal((await data('text')).values['textCursor.enabled'],true);assert.notEqual((await data('text')).base.textCursor?.enabled,true);
 const serialized=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));await page.evaluate(text=>{ToSampoolV4Workspace.replace(JSON.parse(text));state.t=10;classicV4View.select('text');},serialized);assert.equal(+await field('textCompletion').inputValue(),0);
 await page.evaluate(()=>{classicV4Changes.run('中段过渡',s=>{EditorVNextTimelineState.setLinear(s,'text',1,{linearKeys:['textCompletion']});EditorVNextTimelineState.setLinear(s,'a',1,{linearKeys:['x','scaleX','alpha']});});state.t=6;classicV4View.select('text');});assert.equal(+await field('textCompletion').inputValue(),50);assert.equal(await field('textCompletion').isDisabled(),true);assert.equal(await clock('textCursor.enabled').getAttribute('data-timing-kind'),'step');
 await page.evaluate(()=>classicV4View.select('a'));assert.equal(await field('x').isDisabled(),true);assert.equal(await field('skewX').isDisabled(),false);
 await page.screenshot({path:resolve(out,'object-linear.png')});
 const pixels=await page.evaluate(()=>{const s=JSON.parse(EditorVNextScene.serialize(ToSampoolV4Workspace.current()));s.entities=s.entities.filter(e=>e.id==='v');const r=ToSampoolRuntimeVNext.createRuntime(s),canvas=document.createElement('canvas');try{r.renderTo(canvas,2);const a=canvas.getContext('2d').getImageData(0,0,240,140).data.slice();r.renderTo(canvas,10);const b=canvas.getContext('2d').getImageData(0,0,240,140).data;return{different:a.some((v,i)=>v!==b[i]),frame:[2,10].map(t=>ToSampoolRuntimeVNext.modules.frame.create(s,t).valuesFor(s.entities[0]).parts),entity:s.entities[0],track:s.timeline.tracks.v,ink:a.reduce((n,v,i)=>n+(i%4===3&&v>0),0)};}finally{r.dispose();}});assert.equal(pixels.different,true,'图元参数必须改变正式Runtime的真实像素 '+JSON.stringify(pixels));
 assert.deepEqual(errors,[]);console.log('✓ formation parameter UI: independent object/group fields, units, explicit No, stable part IDs, path Step/Linear, text/cursor, undo, save/reopen and real pixels');
}finally{await browser.close();}
