/* Runtime integration experiment only; not a production pattern registration. */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/dual-ray-runtime-cost');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(pathToFileURL(resolve(root,'examples/pattern-proposals/dual-ray/preview.html')).href);await page.waitForFunction(()=>window.patternReview);await page.evaluate(()=>patternReview.stop());
  const results=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,proposal=ToSampoolDualRayProposal,params=proposal.defaults(),id='test-only-dual-ray-cost';
    runtime.modules.sceneModules.register({manifest:{format:'tosampool-scene-module/v1',id,version:1,parameters:[],assets:[],timeDependent:true},render({ctx,width,height,time}){proposal.paint(ctx,params,time,{x:-width/2,y:-height/2,w:width,h:height});}});
    const result=[];
    for(const [width,height]of [[960,540],[1920,1080]]){
      function canvas(){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
      const direct=canvas(),plain=canvas(),effects=canvas();
      const make=enabled=>({format:'tosampool-scene/v4',width,height,loop:12,background:{color:'#ffffff',alpha:0},assets:{},entities:[{id:'ray',type:'procedural',moduleId:id,moduleVersion:1,x:0,y:0,w:width,h:height,alpha:1,params:{},...(enabled?{effects:{pipeline:['mask','decorate','sample'],decorate:{'tint-overlay':{enabled:true,color:'#ff8844',alpha:.1,blend:'multiply'}},sample:{controllers:{'sampling-grid':{size:1}},threshold:{enabled:true,threshold:.5,dark:'#403a32',light:'#e6dec8'}}}}:{})}],timeline:{tracks:{}}});
      const player=runtime.createRuntime(make(false)),filtered=runtime.createRuntime(make(true));
      try{
        const drawDirect=t=>{const ctx=direct.getContext('2d');ctx.clearRect(0,0,width,height);proposal.paint(ctx,params,t,{x:0,y:0,w:width,h:height});};
        drawDirect(1.25);player.renderTo(plain,1.25);
        const a=direct.getContext('2d').getImageData(0,0,width,height).data,b=plain.getContext('2d').getImageData(0,0,width,height).data;let changed=0,maxDelta=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])changed++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]));}
        const measure=(name,draw)=>{for(let i=0;i<12;i++)draw(i/30);const times=[];let last;for(let i=0;i<60;i++){const started=performance.now();last=draw((i+12)/30);times.push(performance.now()-started);}times.sort((a,b)=>a-b);return{name,samples:times.length,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.ceil(times.length*.95)-1],workPixels:last?.workPixels??null,pixelPasses:last?.pixelPasses??null,offscreenPeakPixels:last?.surfaces?.peakPixels??null};};
        result.push({width,height,pairs:params.pairs,comparison:{changedChannels:changed,totalChannels:a.length,maxChannelDelta:maxDelta},measurements:[measure('direct-candidate',drawDirect),measure('runtime-no-effects',t=>player.renderTo(plain,t)),measure('runtime-tint-and-threshold',t=>filtered.renderTo(effects,t))],note:'同步CPU／Canvas提交时间；预热12次、采样60次。像素回读在计时外；不含GPU完成、整页UI和显示合成。后处理档故意增加效果，不能用其耗时归咎于同一绘制函数。'});
      }finally{player.dispose();filtered.dispose();}
    }
    return result;
  });
  assert.ok(results.every(r=>r.comparison.changedChannels===0),'test-only bridge must preserve exact default drawing');assert.ok(results.every(r=>r.measurements.every(m=>Number.isFinite(m.p95Ms))));
  writeFileSync(resolve(out,'results.json'),JSON.stringify({scope:'isolated-test-only-scene-module-bridge-not-production-pattern',results},null,2),'utf8');console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
