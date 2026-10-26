import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/mask-source-performance');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
 const rows=await page.evaluate(()=>{
  const rt=ToSampoolRuntimeVNext,rows=[],q=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*p)-1];
  for(const [size,width,height]of [['S',320,180],['M',960,540],['L',1920,1080]]){
   const image=document.createElement('canvas');image.width=width;image.height=height;const ctx=image.getContext('2d'),data=ctx.createImageData(width,height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data.data[i]=x/width*255;data.data[i+1]=y/height*255;data.data[i+2]=(x^y)%256;data.data[i+3]=255;}ctx.putImageData(data,0,0);
   const x=Math.round(width*.15),y=Math.round(height*.15),w=Math.round(width*.65),h=Math.round(height*.65),source={id:'s',type:'image',assetId:'image',x,y,w,h,anim:{bob:{amount:3,period:2,angle:0}},effects:{pipeline:['mask','decorate','sample'],mask:{type:'ellipse',x,y,w,h},decorate:{projection:{enabled:true,color:'#000000',alpha:.7,distance:8,angle:45},outline:{enabled:true,color:'#ffffff',alpha:1,width:4}},sample:{controllers:{'sampling-grid':{size:1}},halftone:{enabled:true,size:4,shape:'circle',threshold:.65,contrast:.75},'noise-dither':{enabled:true,amount:15,size:1,colorMode:'mono',seed:7}}}},base={format:'tosampool-scene/v4',width,height,loop:4,background:{alpha:0},assets:{image:{image}}},normal=rt.createRuntime({...base,entities:[source]}),masked=rt.createRuntime({...base,entities:[source,{id:'owner',type:'rect',x:0,y:0,w:width,h:height,fill:'#fff',effects:{mask:{type:'element',targetId:'s'}}}]});
   const items=[normal,masked].map(player=>{const canvas=document.createElement('canvas');canvas.getContext('2d',{willReadFrequently:false});return{player,canvas,draw:[],completed:[]};});
   try{for(let i=0;i<28;i++)for(const index of i%2?[1,0]:[0,1]){const item=items[index],start=performance.now();item.stats=item.player.renderTo(item.canvas,i/30);const drawn=performance.now();item.canvas.getContext('2d').getImageData(0,0,1,1);if(i>=8){item.draw.push(drawn-start);item.completed.push(performance.now()-start);}}
    rows.push({size,width,height,normal:{drawMedianMs:q(items[0].draw,.5),drawP95Ms:q(items[0].draw,.95),completedP95Ms:q(items[0].completed,.95),workPixels:items[0].stats.workPixels},masked:{drawMedianMs:q(items[1].draw,.5),drawP95Ms:q(items[1].draw,.95),completedP95Ms:q(items[1].completed,.95),workPixels:items[1].stats.workPixels,sourceBuilds:items[1].stats.maskSourceBuilds}});
   }finally{normal.dispose();masked.dispose();}
  }return rows;
 });
 for(const row of rows){assert.equal(row.normal.workPixels,row.masked.workPixels);assert.equal(row.masked.sourceBuilds,1);}
 const report={date:'2026-10-25',browser:await browser.version(),method:'Same pressure source, normal visible draw vs hidden mask source, 8 warmup + 20 samples, paired alternating order; sync 1px readback separate; CPU effects + Canvas2D, no experimental object GPU.',rows};writeFileSync(resolve(out,'paired.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
