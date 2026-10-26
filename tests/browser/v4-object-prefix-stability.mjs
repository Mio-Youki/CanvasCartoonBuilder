// Diagnose CPU first/repeated frames without reading product working surfaces.
import assert from 'node:assert/strict';
import {existsSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const tag=process.argv.find(v=>v.startsWith('--report-tag='))?.split('=')[1];
if(tag&&!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid report tag');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try {
  const page=await browser.newPage();
  // Test-only hook: leave the modules container replaceable, not its modules.
  // Runtime freezes this container in production; no product instrumentation.
  await page.addInitScript(()=>{const freeze=Object.freeze;Object.freeze=function(value){return value&&value.renderer&&value.decorate&&value.surfaces?value:freeze(value);};});
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const api=ToSampoolRuntimeVNext, ws=ToSampoolV4Workspace;
    const source=document.createElement('canvas');source.width=640;source.height=360;
    const ctx=source.getContext('2d'),gradient=ctx.createLinearGradient(0,0,640,360);
    gradient.addColorStop(0,'#163959');gradient.addColorStop(.5,'#dc813c');gradient.addColorStop(1,'#fff5cd80');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(320,180,310,170,0,0,Math.PI*2);ctx.fill();
    const s=EditorVNextScene.blank({width:1000,height:650,loop:4});s.background={color:'#71859a',alpha:.6};s.assets={source:{locator:source.toDataURL()}};
    s.entities=[{id:'large',type:'image',assetId:'source',x:60,y:60,w:640,h:360,alpha:.7,parts:[{id:'outside',type:'ellipse',x:-24,y:45,w:60,h:90,fill:'#fa8358'}],effects:{pipeline:['mask','decorate','sample'],mask:{type:'ellipse',x:40,y:40,w:680,h:400},decorate:{projection:{enabled:true,color:'#173359',distance:9,alpha:.6,angle:30},outline:{enabled:true,color:'#ffc883',width:4,alpha:.7}},sample:{controllers:{'sampling-grid':{size:1}},threshold:{enabled:true,threshold:.5,dark:'#182536',light:'#f8d29a',motion:{enabled:true,amount:.12,period:2,steps:12}}}}}];
    ws.replace(s);await ws.runtimeAssets();const assets=await ws.runtimeAssets();
    const pixels=c=>{const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const x=copy.getContext('2d',{willReadFrequently:true});x.drawImage(c,0,0);return x.getImageData(0,0,c.width,c.height).data;};
    const diff=(a,b)=>{let preMax=0,alphaMax=0;for(let i=0;i<a.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(a[i+c]*a[i+3]/255)-Math.round(b[i+c]*b[i+3]/255)));}return {preMax,alphaMax};};
    const originals={},frames=[];let snapshots;
    for(const [module,method,index,inPlace] of [['content','draw',0,true],['masks','apply',0,true],['decorate','apply',0,false],['sampling','apply',0,false]]){
      const original=api.modules[module];originals[module]=original;
      api.modules[module]=Object.freeze({...original,[method](...args){const input=args[index],canvas=input.canvas||input;const before=pixels(canvas);const output=original[method](...args);snapshots[module]={before,after:pixels(inPlace?canvas:output)};return output;}});
      if(api.modules[module]===original)throw Error('Diagnostic module hook unavailable');
    }
    try{
      for(const variant of ['combined','projection','outline','integer-projection']){
        const doc=JSON.parse(JSON.stringify(ws.current()));
        if(variant==='projection')delete doc.entities[0].effects.decorate.outline;
        if(variant==='outline')delete doc.entities[0].effects.decorate.projection;
        if(variant==='integer-projection')doc.entities[0].effects.decorate.projection.angle=0;
        const p=EditorVNextRuntimeAdapter.create(doc,assets),canvas=document.createElement('canvas'),draws=[];
        try{for(let n=0;n<4;n++){snapshots={};p.renderTo(canvas,.2,{sceneBackend:'cpu'});draws.push({...snapshots,final:{after:pixels(canvas)}});}}
        finally{p.dispose();}
        frames.push({variant,comparisons:draws.slice(1).map((draw,i)=>({draw:i+2,stages:Object.fromEntries(Object.entries(draw).map(([stage,v])=>[stage,{...(v.before?{input:diff(draws[0][stage].before,v.before)}:{}),output:diff(draws[0][stage].after,v.after)}]))}))});
      }
    }finally{for(const [key,value]of Object.entries(originals))api.modules[key]=value;ws.releasePlayer();}
    return frames;
  });
  const report={browser:browser.version(),result};
  console.log(JSON.stringify(report,null,2));
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-object-prefix-stability-2026-10-25${tag?'-'+tag:''}-result.json`),JSON.stringify(report,null,2)+'\n');
  for(const row of result)for(const draw of row.comparisons)assert.deepEqual(Object.keys(draw.stages),['content','masks','decorate','sampling','final']);
  if(!process.argv.includes('--diagnose'))for(const row of result)for(const draw of row.comparisons)for(const stage of Object.values(draw.stages))assert.deepEqual(stage.output,{preMax:0,alphaMax:0},row.variant);
}finally{await browser.close();}
