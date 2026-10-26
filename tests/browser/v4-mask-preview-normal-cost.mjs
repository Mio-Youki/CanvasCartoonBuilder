// Diagnostic A/B: isolate the preview branch from the same current Runtime.
// This is not a historical baseline or a release performance acceptance test.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
const source=readFileSync(new URL('../../home-scene-vnext.js',import.meta.url),'utf8'),start=source.indexOf('    function renderMaskTo('),end=source.indexOf('    function renderTo(',start),branch='      if(options?.maskPreview)return renderMaskTo(target,t,options);';
assert.ok(start>=0&&end>start&&source.includes(branch));const without=(source.slice(0,start)+source.slice(end)).replace(branch,'');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage();await page.goto('about:blank');
 const results=await page.evaluate(({source,without})=>{
  const host=code=>{const frame=document.createElement('iframe');document.body.append(frame);frame.contentWindow.eval(code);return{rt:frame.contentWindow.ToSampoolRuntimeVNext,doc:frame.contentDocument};},current=host(source),control=host(without);
  const scene={
   format:'tosampool-scene/v4',width:480,height:270,loop:4,background:{color:'#182033',alpha:1},
   entities:[{
    id:'a',type:'rect',x:38,y:49,w:202,h:146,fill:'#e36f4c',radius:11,anim:{bob:{amount:3,period:2}},
    effects:{
     mask:{type:'ellipse',x:38,y:49,w:202,h:146},
     decorate:{outline:{enabled:true,color:'#111827',alpha:1,width:3},'tint-overlay':{enabled:true,color:'#ffe8a3',alpha:.15,blend:'screen'}},
     sample:{
      controllers:{'sampling-grid':{size:4}},
      threshold:{enabled:true,threshold:.48,dark:'#182033',light:'#e8dbc3',motion:{enabled:true,amount:.08,period:2,steps:12}},
      'offset-sampling':{enabled:true,mode:'boil',seed:7,boil:{maxOffset:1},motion:{enabled:true,period:1.5,steps:12}}
     }
    }
   }],
   sceneEffects:{
    overlay:{'color-grade':{enabled:true,hue:5,brightness:3,contrast:6,saturation:8}},
    sample:{controllers:{'sampling-grid':{size:4}},threshold:{enabled:true,threshold:.5,dark:'#162034',light:'#d8cfae',motion:{enabled:true,amount:.035,period:2.5,steps:12}}}
   }
  };
  const rows=[],percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.ceil(a.length*p)-1];
  for(const multiplier of [1,2]){
   const pair=[current,control].map(h=>({player:h.rt.createRuntime(scene),canvas:h.doc.createElement('canvas'),times:[],work:0}));
   for(let i=0;i<8;i++)for(const p of pair)p.player.renderTo(p.canvas,i/12,{pixelDivMultiplier:multiplier});
   for(let i=0;i<24;i++)for(const index of i%2?[1,0]:[0,1]){const p=pair[index],start=performance.now(),stats=p.player.renderTo(p.canvas,(i+8)/12,{pixelDivMultiplier:multiplier});p.times.push(performance.now()-start);p.work=stats.workPixels;}
   const equal=pair[0].canvas.toDataURL()===pair[1].canvas.toDataURL();
   rows.push({multiplier,equal,current:{median:percentile(pair[0].times,.5),p95:percentile(pair[0].times,.95),work:pair[0].work},withoutPreviewBranch:{median:percentile(pair[1].times,.5),p95:percentile(pair[1].times,.95),work:pair[1].work}});for(const p of pair)p.player.dispose();
  }return rows;
 },{source,without});
 for(const r of results){assert.equal(r.equal,true);assert.equal(r.current.work,r.withoutPreviewBranch.work);}console.log(JSON.stringify({kind:'same-current-runtime-preview-branch-ab',warmup:8,samples:24,results},null,2));
}finally{await browser.close();}
