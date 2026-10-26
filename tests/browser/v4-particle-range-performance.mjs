// Cold births and incremental playback; diagnostic CPU numbers, no FPS claim.
import {readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
const source=readFileSync(new URL('../../home-scene-vnext.js',import.meta.url),'utf8'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage();await page.goto('about:blank');await page.evaluate(code=>window.eval(code),source);
 const result=await page.evaluate(()=>{
  const rows=[];
  for(const [width,height]of [[320,180],[960,540],[1920,1080]])for(const quality of ['geometry','full','no-sample']){
   const rangeSource={id:'mask',type:'rect',x:width*.2,y:height*.2,w:width*.4,h:height*.4,fill:'#aaaaaa',anim:{bob:{amount:4,period:2}},effects:{decorate:{outline:{enabled:true,width:2,color:'#ffffff',alpha:1}},sample:{threshold:{enabled:true,threshold:.5,dark:'#222222',light:'#ffffff'},'noise-dither':{enabled:true,amount:.1,seed:1}}}};
   const emitter={id:'e',type:'particle-emitter',x:0,y:0,w:width,h:height,particle:{sourceId:'sprite',count:40,life:2,speed:8,direction:90,fade:false,seed:2,...(quality!=='geometry'?{emissionRange:{type:'element',targetId:'mask',sourceQuality:quality,mode:'alpha'}}:{})}};
   const scene={format:'tosampool-scene/v4',width,height,loop:4,entities:[{id:'sprite',type:'rect',w:2,h:2,fill:'#ffffff',particleSourceOnly:true},...(quality==='geometry'?[]:[rangeSource]),emitter]},player=ToSampoolRuntimeVNext.createRuntime(scene),canvas=document.createElement('canvas');
   try{const start=performance.now(),cold=player.renderTo(canvas,1),coldMs=performance.now()-start,times=[],builds=[];for(let i=1;i<=20;i++){const s=performance.now(),stats=player.renderTo(canvas,1+i/120);times.push(performance.now()-s);builds.push(stats.particleBirthBuilds||0);}times.sort((a,b)=>a-b);rows.push({width,height,quality,coldMs,warmP95:times[18],coldBirths:cold.particleBirthBuilds,coldSourceBuilds:cold.maskSourceBuilds,coldSourcePixels:cold.maskSourcePixels,incrementalBirths:builds.reduce((a,b)=>a+b,0),drawn:cold.particlesDrawn});}finally{player.dispose();}
  }return rows;
 });console.log(JSON.stringify({kind:'particle-cold-vs-incremental-cpu',samples:20,rows:result},null,2));
}finally{await browser.close();}
