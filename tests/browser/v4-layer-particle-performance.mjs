// Diagnostic formal Player cost, not an editor/Tauri frame-rate promise.
import {chromium} from 'playwright-core';
import {existsSync,readFileSync} from 'node:fs';
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{const page=await browser.newPage();await page.goto('about:blank');await page.evaluate(readFileSync(new URL('../../home-scene-vnext.js',import.meta.url),'utf8'));console.log(JSON.stringify(await page.evaluate(()=>{
 const rows=[];
 for(const size of [32,16,8]){
  const player=ToSampoolRuntimeVNext.createRuntime({format:'tosampool-scene/v4',width:1024,height:576,loop:4,background:{alpha:0},entities:[{id:'s',type:'rect',w:1024,h:576,fill:'#aaccff'},{id:'e',type:'particle-emitter',w:1024,h:576,particle:{mode:'layer',sourceId:'s',cellSize:size,life:2,speed:35,direction:-90,spread:150,fade:true,seed:1}}]}),c=document.createElement('canvas'),t=performance.now(),first=player.renderTo(c,0),coldMs=performance.now()-t,times=[];
  for(let i=0;i<28;i++){const s=performance.now();player.renderTo(c,.3+i*.01);if(i>=8)times.push(performance.now()-s);}times.sort((a,b)=>a-b);rows.push({size,cells:first.particleLayerCells,coldMs,median:times[10],p95:times[18]});player.dispose();
 }return rows;
}),null,2));}finally{await browser.close();}
