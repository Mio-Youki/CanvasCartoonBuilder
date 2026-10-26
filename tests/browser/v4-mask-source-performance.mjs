import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/mask-source-performance');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
 const baselineOnly=process.argv.includes('--baseline-only');const report=await page.evaluate(baselineOnly=>{
  const rt=ToSampoolRuntimeVNext,rows=[],p95=a=>a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1],profiles=['full','no-sample','no-decorate','base'];
  for(const [label,width,height]of [['S',320,180],['M',960,540],['L',1920,1080]]){
   const image=document.createElement('canvas');image.width=width;image.height=height;const ctx=image.getContext('2d'),data=ctx.createImageData(width,height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data.data[i]=x/width*255;data.data[i+1]=y/height*255;data.data[i+2]=(x^y)%256;data.data[i+3]=255;}ctx.putImageData(data,0,0);
   for(const kind of baselineOnly?['unreferenced']:['static','dynamic','group','repeated','luma'])for(const quality of ['static','repeated','unreferenced'].includes(kind)?['full']:profiles){
    const sw=Math.round(width*.65),sh=Math.round(height*.65),sx=Math.round(width*.15),sy=Math.round(height*.15),source={id:'source',type:'image',assetId:'photo',x:sx,y:sy,w:sw,h:sh,anim:kind==='static'?undefined:{bob:{amount:3,period:2,angle:0}},effects:{pipeline:['mask','decorate','sample'],mask:{type:'ellipse',x:sx,y:sy,w:sw,h:sh},decorate:{projection:{enabled:true,color:'#000000',alpha:.7,distance:8,angle:45},outline:{enabled:true,color:'#ffffff',alpha:1,width:4}},sample:{controllers:{'sampling-grid':{size:1}},halftone:{enabled:true,size:4,shape:'circle',threshold:.65,contrast:.75},'noise-dither':{enabled:true,amount:15,size:1,colorMode:'mono',seed:7}}}},entities=kind==='group'?[{id:'group',type:'group',x:0,y:0,w:width,h:height},{...source,parentId:'group'},{id:'leaf',parentId:'group',type:'ellipse',x:width*.1,y:height*.1,w:width*.2,h:height*.2,fill:'#cc8855',effects:{decorate:{outline:{enabled:true,width:3,color:'#fff',alpha:1}}}}]:[source];
    const targetId=kind==='group'?'group':'source';for(let i=0;i<(kind==='unreferenced'?0:kind==='repeated'?3:1);i++)entities.push({id:'consumer-'+i,type:'rect',x:0,y:0,w:width,h:height,fill:'#ffffff',effects:{mask:{type:'element',targetId,mode:kind==='luma'?'luma':'alpha'}}});
    const scene={format:'tosampool-scene/v4',width,height,loop:4,background:{alpha:0},assets:{photo:{image}},entities},player=rt.createRuntime(scene),canvas=document.createElement('canvas'),draw=[],complete=[],sourceTimes=[];canvas.getContext('2d',{willReadFrequently:false});let stats;
    try{for(let i=0;i<28;i++){const start=performance.now();stats=player.renderTo(canvas,i/30,{maskSourceQuality:quality});const submitted=performance.now();canvas.getContext('2d').getImageData(0,0,1,1);const done=performance.now();if(i>=8){draw.push(submitted-start);complete.push(done-start);sourceTimes.push(stats.maskSourceMs);}}
     const actual=canvas.getContext('2d').getImageData(0,0,width,height).data,baseline=document.createElement('canvas');baseline.getContext('2d',{willReadFrequently:true});player.renderTo(baseline,27/30,{maskSourceQuality:'full'});const full=baseline.getContext('2d').getImageData(0,0,width,height).data;let alphaDifference=0;for(let i=3;i<actual.length;i+=4)alphaDifference+=Math.abs(actual[i]-full[i]);
     rows.push({size:label,width,height,kind,quality,drawP95Ms:+p95(draw).toFixed(3),completedP95Ms:+p95(complete).toFixed(3),sourceP95Ms:+p95(sourceTimes).toFixed(3),lastSourceBuilds:stats.maskSourceBuilds,lastHits:stats.maskSourceHits,lastSourcePixels:stats.maskSourcePixels,retainedPixels:stats.maskSourceRetainedPixels,workPixels:stats.workPixels,pixelPasses:stats.pixelPasses,meanAlphaDifference:+(alphaDifference/(width*height)).toFixed(3)});
    }finally{player.dispose();}
   }
  }
  return{date:'2026-10-25',backend:'CPU object effects + Canvas2D; no experimental object GPU',method:'8 warmup + 20 sampled frames; draw submission and 1px synchronous readback completion reported separately. Browser may change raster backend during reads; no UI/fps timing.',rows};
 },baselineOnly);
 for(const row of report.rows){assert.ok(Number.isFinite(row.completedP95Ms));if(row.kind==='static')assert.equal(row.lastSourceBuilds,0);if(row.kind==='repeated'){assert.equal(row.lastSourceBuilds,1);assert.ok(row.lastHits>=2);}if(row.quality==='full')assert.ok(row.meanAlphaDifference<=1,'Canvas readback raster tolerance');}
 writeFileSync(resolve(out,baselineOnly?'baseline.json':'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
