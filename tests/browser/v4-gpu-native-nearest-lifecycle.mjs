import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(import.meta.dirname,'../../img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.nativeNearest);
  const result=await page.evaluate(()=>{
    const rt=ToSampoolRuntimeVNext,scene={format:'tosampool-scene/v4',width:640,height:360,loop:4,background:{alpha:0},entities:[{id:'shape',type:'rect',x:10,y:10,w:400,h:250,fill:'#ec6542',alpha:.7}],sceneEffects:{sample:{controllers:{'sampling-grid':{size:3}},threshold:{enabled:true,value:.5,dark:'#000000',light:'#ffffff'}}}};
    const make=()=>document.createElement('canvas'),p=rt.createRuntime(scene),out=make(),executor=rt.modules.sceneGpu.create(),options={sceneBackend:'gpu-experimental',_sceneGpuExecutor:executor};
    const first=p.renderTo(out,.2,options),second=p.renderTo(out,.3,options);
    const versioned={...options,sceneSourceVersion:7};p.renderTo(out,.3,versioned);
    p.scene.entities[0].x+=50;
    const staleControl=p.renderTo(out,.3,versioned);
    executor.invalidateSource();const refreshed=p.renderTo(out,.3,versioned);
    const reference=rt.createRuntime(p.scene),expected=make();reference.renderTo(expected,.3);reference.dispose();
    const a=out.getContext('2d').getImageData(0,0,out.width,out.height).data,b=expected.getContext('2d').getImageData(0,0,expected.width,expected.height).data;
    let refreshMax=0;for(let i=0;i<a.length;i++)refreshMax=Math.max(refreshMax,Math.abs(a[i]-b[i]));
    p.clearCaches();executor.dispose();const released=executor.stats();p.dispose();
    const prototype=OffscreenCanvasRenderingContext2D.prototype,original=prototype.getImageData;
    let failure,failedPlayer;
    try{
      prototype.getImageData=function(...args){if(this.canvas.width===1||this.canvas.height===1)throw new Error('native-nearest-calibration-invalid');return original.apply(this,args);};
      failedPlayer=rt.createRuntime(scene);failure=failedPlayer.renderTo(make(),.2,{sceneBackend:'gpu-experimental'});
    }finally{prototype.getImageData=original;failedPlayer?.dispose();}
    return {first:first.sceneGpu,second:second.sceneGpu,released,sourceInvalidation:{staleControlHit:staleControl.sceneGpu.cacheHit,refreshedHit:refreshed.sceneGpu.cacheHit,max:refreshMax},failure:{backend:failure.sceneBackend,reason:failure.sceneGpu?.reason,bytes:failure.sceneGpu?.textureBytes}};
  });
  assert.ok(result.first.handled);assert.ok(result.first.nearestCalibrationBytes>0);
  assert.equal(result.first.nearestCalibration.bytes,640*16);
  assert.equal(result.second.allocations,result.first.allocations);
  assert.equal(result.second.nearestCalibration.prepareMs,0);
  assert.equal(result.second.initialized,false);
  assert.equal(result.released.textureBytes,0);assert.equal(result.released.nearestCalibrationBytes,0);
  assert.deepEqual(result.sourceInvalidation,{staleControlHit:true,refreshedHit:false,max:0});
  assert.equal(result.failure.backend,'cpu');assert.equal(result.failure.reason,'native-nearest-calibration-invalid');assert.equal(result.failure.bytes,0);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
