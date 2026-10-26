#!/usr/bin/env node
// Isolate source generation / target history / prefixes. No product hooks or fixes.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const width=Number((process.argv.find(x=>x.startsWith('--size='))||'--size=1920').split('=')[1]);
const grid=Number((process.argv.find(x=>x.startsWith('--grid='))||'--grid=4').split('=')[1]);
const prefixLimit=Number((process.argv.find(x=>x.startsWith('--prefix='))||'--prefix=5').split('=')[1]);
const tintAlpha=Number((process.argv.find(x=>x.startsWith('--tint-alpha='))||'--tint-alpha=.35').split('=')[1]);
const trace=process.argv.includes('--trace');
if(![640,1280,1920].includes(width)||!Number.isInteger(grid)||grid<1||grid>16||!Number.isInteger(prefixLimit)||prefixLimit<0||prefixLimit>5||!Number.isFinite(tintAlpha)||tintAlpha<0||tintAlpha>1)throw Error('Invalid size/grid/prefix/alpha');
const photo='data:image/jpeg;base64,'+readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-stage-diagnostic=1');
  await page.waitForFunction(()=>window.classicV4PreviewBackend&&window.ToSampoolV4Workspace?.hasDocument);
  await page.selectOption('#preview-quality','full');
  const result=await page.evaluate(async({photo,width,grid,prefixLimit,tintAlpha,trace})=>{
    if(state.playing)togglePlay();state.t=.9;
    const w=width,h=w*9/16,ws=ToSampoolV4Workspace,view=classicV4View,backend=classicV4PreviewBackend;
    let tracing=false,frames=[];
    if(trace){
      for(const prototype of [CanvasRenderingContext2D.prototype,OffscreenCanvasRenderingContext2D.prototype]){
        const draw=prototype.drawImage;
        prototype.drawImage=function(...args){
          if(tracing&&this.canvas.width===Math.ceil(w/grid)&&args[0]?.width===w){
            const source=args[0];frames.push({kind:'cpu-before-downsample',w,h,data:source.getContext('2d').getImageData(0,0,w,h).data});
          }
          const value=draw.apply(this,args);
          if(tracing&&this.canvas.width===Math.ceil(w/grid)&&args[0]?.width===w)frames.push({kind:'cpu-after-downsample',w:this.canvas.width,h:this.canvas.height,data:this.getImageData(0,0,this.canvas.width,this.canvas.height).data});
          return value;
        };
      }
      const get=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        const gl=get.call(this,type,...args);if(type==='webgl2'&&gl&&!seen.has(gl)){
          seen.add(gl);const draw=gl.drawArrays.bind(gl);
          gl.drawArrays=(...values)=>{const value=draw(...values);if(tracing){const shaders=gl.getAttachedShaders(gl.getParameter(gl.CURRENT_PROGRAM)),text=shaders.map(shader=>gl.getShaderSource(shader)).join('\n'),kind=text.includes('tinting')?'gpu-tint':text.includes('ivec2 from=textureSize(source')&&!text.includes('baseOnly')?'gpu-resample':text.includes('baseOnly')?'gpu-output':'gpu-field',v=gl.getParameter(gl.VIEWPORT),data=new Uint8Array(v[2]*v[3]*4);gl.readPixels(0,0,v[2],v[3],gl.RGBA,gl.UNSIGNED_BYTE,data);const top=new Uint8ClampedArray(data.length);for(let y=0;y<v[3];y++)top.set(data.subarray(y*v[2]*4,(y+1)*v[2]*4),(v[3]-1-y)*v[2]*4);frames.push({kind,w:v[2],h:v[3],data:top,premultiplied:true});}return value;};
        }return gl;
      };
    }
    const pixels=()=>new Uint8ClampedArray(view.canvas.getContext('2d').getImageData(0,0,w,h).data);
    function diff(a,b){let preMax=0,alphaMax=0,count=0;const first=[];for(let i=0;i<a.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++){const d=Math.abs(Math.round(a[i+c]*a[i+3]/255)-Math.round(b[i+c]*b[i+3]/255));preMax=Math.max(preMax,d);if(d>2){count++;if(first.length<3)first.push({x:i/4%w,y:Math.floor(i/4/w),a:Array.from(a.slice(i,i+4)),b:Array.from(b.slice(i,i+4))});}}}return{preMax,alphaMax,channelsOver2:count,first};}
    function fixture(source,prefix,frozen){
      const scene=EditorVNextScene.blank({width:w,height:h,loop:8});scene.background.alpha=source==='native'?.4:0;
      scene.assets={photo:{locator:source==='native'?photo:frozen}};
      scene.entities=source==='native'?[{id:'photo',type:'image',assetId:'photo',x:0,y:0,w,h,alpha:.85},{id:'shape',type:'ellipse',x:w*.15,y:h*.2,w:w*.25,h:h*.35,fill:'#f09638',alpha:.55}]:[{id:'raster',type:'image',assetId:'photo',x:0,y:0,w,h,alpha:1}];
      if(prefix===0)return scene;
      const overlay=scene.sceneEffects.overlay,sample=scene.sceneEffects.sample;
      sample.controllers={'sampling-grid':{size:grid}};
      overlay['tint-overlay']={enabled:true,color:'#d4657980',alpha:tintAlpha,blend:'screen'};
      if(prefix>=2)sample['noise-dither']={enabled:true,amount:31,size:1,colorMode:'rgb',seed:7};
      if(prefix>=3)sample.threshold={enabled:true,threshold:.5,dark:'#182033',light:'#e8dbc3'};
      if(prefix>=4)sample['uneven-sampling']={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:'wave',scale:63,contrast:.8,seed:5},motion:{enabled:false}};
      if(prefix>=5)sample['edge-dispersion']={enabled:true,distance:2,angle:35,width:2,strength:.5,source:'auto',order:'bgr'};
      return scene;
    }
    async function capture(scene,requested,resetTarget){
      backend.setPolicy(requested);ws.replace(scene);
      if(resetTarget){view.canvas.width=w;view.canvas.height=h;}
      await view.render();await new Promise(requestAnimationFrame);await view.render();
      const first=pixels();await view.render();frames=[];tracing=trace;try{await view.render();}finally{tracing=false;}const last=pixels();
      const stats=view.performance().lastRender,output={pixels:last,frames,backend:stats.sceneBackend,reason:stats.sceneGpu?.reason||null,time:stats.time,self:diff(first,last)};
      return output;
    }
    await capture(fixture('native',0),'cpu',true);const frozen=view.canvas.toDataURL('image/png');ws.releasePlayer();
    const rows=[];
    for(const source of (trace?['native']:['native','frozen']))for(let prefix=0;prefix<=prefixLimit;prefix++){
      const scene=fixture(source,prefix,frozen),cpu=await capture(scene,'cpu',true),gpu=await capture(scene,'gpu-experimental',true);
      const normalize=f=>{if(!f)return null;const out=new Uint8ClampedArray(f.data);if(!f.premultiplied)for(let i=0;i<out.length;i+=4)for(let c=0;c<3;c++)out[i+c]=Math.round(out[i+c]*out[i+3]/255);return out;};
      const compareFrames=(a,b)=>{const x=normalize(a),y=normalize(b);if(!x||!y||x.length!==y.length)return null;let max=0,count=0;for(let i=0;i<x.length;i++){max=Math.max(max,Math.abs(x[i]-y[i]));if(x[i]!==y[i])count++;}return{max,count};};
      const tint=gpu.frames.filter(f=>f.kind==='gpu-tint').at(-1),resample=gpu.frames.find(f=>f.kind==='gpu-resample'),field=gpu.frames.find(f=>f.kind==='gpu-field');
      const full=gpu.frames.find(f=>f.kind==='gpu-output'),low=cpu.frames.find(f=>f.kind==='cpu-after-downsample');
      let formula=null;
      if(full&&resample){const data=new Uint8ClampedArray(resample.data.length);for(let y=0;y<resample.h;y++)for(let x=0;x<resample.w;x++){const sx=Math.floor((x+.5)*full.w/resample.w),sy=Math.floor((y+.5)*full.h/resample.h);data.set(full.data.subarray((sy*full.w+sx)*4,(sy*full.w+sx)*4+4),(y*resample.w+x)*4);}formula={data,premultiplied:true};}
      rows.push({source,prefix,resetTarget:true,cpuSelf:cpu.self,gpuSelf:gpu.self,actual:gpu.backend,reason:gpu.reason,cpuTime:cpu.time,gpuTime:gpu.time,trace:trace?{cpu:cpu.frames.map(f=>f.kind),gpu:gpu.frames.map(f=>f.kind),beforeDownsample:compareFrames(cpu.frames.find(f=>f.kind==='cpu-before-downsample'),tint),tintToFullCopy:compareFrames(tint,full),afterDownsample:compareFrames(low,resample),gpuVsFormula:compareFrames(formula,resample),cpuVsFormula:compareFrames(formula,low),resampleToField:compareFrames(resample,field)}:null,...diff(cpu.pixels,gpu.pixels)});ws.releasePlayer();
    }
    return{size:[w,h],grid,rows};
  },{photo,width,grid,prefixLimit,tintAlpha,trace});
  const report={date:'2026-10-24',browser:browser.version(),diagnostic:true,diagnosticMutatesProduct:false,errors,...result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(root,`docs/architecture/v4-editor-gpu-stage-diagnostic-${width}-grid${grid}-2026-10-24.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,rows:report.rows.map(({first,...row})=>row)},null,2));
  if(process.argv.includes('--assert-parity')){
    assert.deepEqual(errors,[]);
    assert.ok(result.rows.every(row=>row.preMax<=2&&row.alphaMax<=1&&row.channelsOver2===0&&row.cpuSelf.channelsOver2===0&&row.gpuSelf.channelsOver2===0),'Stage parity failed');
  }
}finally{await browser.close();}
