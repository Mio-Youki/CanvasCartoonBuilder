import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'examples/particle-layer/preview.html')).href);await page.waitForFunction(()=>window.layerProbe?.cells.length>0);
 const rows=[];
 for(const kind of ['image','vector','text']){
  await page.locator('#kind').selectOption(kind);
  rows.push(await page.evaluate(()=>{
   const probe=window.layerProbe,c=document.createElement('canvas'),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const expected=pixels(probe.snapshot);probe.render(c,0);const actual=pixels(c);let maxPremultError=0;
   // Canvas copies can round unpremultiplied RGB at antialiased text edges.
   // Compare displayed (premultiplied) color and alpha, not invisible RGB.
   for(let i=0;i<actual.length;i+=4){maxPremultError=Math.max(maxPremultError,Math.abs(actual[i+3]-expected[i+3]));for(let k=0;k<3;k++)maxPremultError=Math.max(maxPremultError,Math.abs(actual[i+k]*actual[i+3]/255-expected[i+k]*expected[i+3]/255));}
   const exact=maxPremultError<=1;
   const proto=CanvasRenderingContext2D.prototype,original=proto.getImageData;let reads=0;proto.getImageData=function(...args){reads++;return original.apply(this,args);};
   try{probe.render(c,.7);probe.render(c,.2);probe.render(c,.7);}finally{proto.getImageData=original;}
   const moved=c.toDataURL();probe.render(c,.7);const deterministic=moved===c.toDataURL(),changed=pixels(c).some((v,i)=>v!==expected[i]);probe.render(c,2);const empty=pixels(c).every(v=>v===0);
   return{kind:document.querySelector('#kind').value,cells:probe.cells.length,exact,maxPremultError,deterministic,changed,empty,reads};
  }));
 }
 for(const row of rows){assert.ok(row.exact,`${row.kind}: initial reassembly`);assert.ok(row.deterministic&&row.changed&&row.empty);assert.equal(row.reads,0);}
 // File input, play, seek and reset are real host interactions.
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=73;c.height=51;const x=c.getContext('2d');x.fillStyle='#12ab67';x.fillRect(0,0,73,51);return c.toDataURL().split(',')[1];});
 await page.locator('#file').setInputFiles({name:'odd-size.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>document.querySelector('#kind').value==='image');
 await page.locator('#play').click();await page.waitForFunction(()=>+document.querySelector('#seek').value>.05);await page.locator('#reset').click();assert.equal(await page.locator('#seek').inputValue(),'0');
 const performance=await page.evaluate(()=>{
  const rt=ToSampoolRuntimeVNext,lab=ToSampoolLayerFragmentProbe,W=1024,H=576,scene={format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{color:'#000000',alpha:1},entities:[{id:'source',type:'rect',x:0,y:0,w:W,h:H,fill:'#12ab67'},{id:'other',type:'rect',x:0,y:0,w:W,h:H,fill:'#ff0000'}]};
  const start=performance.now(),snapshot=lab.capture(scene,'source'),captureMs=performance.now()-start,pixel=Array.from(snapshot.getContext('2d').getImageData(20,20,1,1).data),rows=[];
  for(const size of [32,16,8]){const t=performance.now(),probe=lab.create(snapshot,size),splitMs=performance.now()-t,c=document.createElement('canvas'),times=[];for(let i=0;i<28;i++){const s=performance.now();probe.render(c,.3+i*.01);if(i>=8)times.push(performance.now()-s);}times.sort((a,b)=>a-b);probe.render(c,0);const exact=c.toDataURL()===snapshot.toDataURL();rows.push({size,cells:probe.cells.length,splitMs,median:times[10],p95:times[18],exact});}return{captureMs,pixel,rows};
 });
 assert.deepEqual(performance.pixel,[18,171,103,255],'isolated capture excludes other layers/background');for(const row of performance.rows)assert.ok(row.exact);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks:rows,performance},null,2));
}finally{await browser.close();}
