#!/usr/bin/env node
// Full isolated wave/radial uneven-sampling pass, against formal CPU output.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-uneven-full=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.sampling?.apply);
  const result=await page.evaluate(()=>{
    const rt=window.ToSampoolRuntimeVNext,W=384,H=216;
    const source=document.createElement('canvas');source.width=W;source.height=H;const ctx=source.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#17304f');gradient.addColorStop(.5,'#da7660');gradient.addColorStop(1,'#ede2a3');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    for(let i=0;i<80;i++){ctx.fillStyle=`hsla(${i*43%360},70%,${25+i%6*8}%,.7)`;ctx.fillRect((i*71)%W,(i*47)%H,4+i%5*7,3+i%4*9);}
    const output=document.createElement('canvas');output.width=W;output.height=H;
    const gl=output.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');
    const vertex='attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;uniform sampler2D src;uniform vec2 size,center;uniform float scale,contrast,seed,flow,direction,kind,amount,coarseness;
      void main(){vec2 p=floor(vec2(gl_FragCoord.x-.5,size.y-gl_FragCoord.y-.5));
        float coordinate=kind<.5?dot(p,vec2(cos(direction),sin(direction))):length(p-center);
        float raw=.5+.5*sin((coordinate/scale-flow+seed*.031)*6.28318530718);
        float field=.5+(raw-.5)*contrast;
        float cell=1.0+floor(clamp(field,0.0,1.0)*amount*(coarseness-1.0));
        vec2 sampled=floor(p/cell)*cell;
        gl_FragColor=texture2D(src,vec2((sampled.x+.5)/size.x,1.0-(sampled.y+.5)/size.y));}`;
    const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.viewport(0,0,W,H);
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'src'),0);
    const upload=()=>{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);};upload();
    const uniform=(name,value)=>gl.uniform1f(gl.getUniformLocation(program,name),value);gl.uniform2f(gl.getUniformLocation(program,'size'),W,H);gl.uniform2f(gl.getUniformLocation(program,'center'),W*.43,H*.57);uniform('scale',63);uniform('contrast',.8);uniform('seed',5);uniform('direction',29*Math.PI/180);uniform('coarseness',5);
    const percentile=(values,p)=>{const sorted=values.slice().sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];};
    const rows=[];
    for(const kind of ['wave','radial']){
      const cfg={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:kind,scale:63,contrast:.8,seed:5,direction:29,centerX:.43,centerY:.57},edge:{mode:'off'},motion:{enabled:true,type:'uneven-motion',period:3,steps:24,flowSpeed:2,tideAmount:.2}};
      const group={controllers:{'sampling-grid':{size:1}},'uneven-sampling':cfg},cpu=[],gpuCached=[],gpuUploaded=[],comparisons=[];
      for(let i=0;i<11;i++){
        const time=i*.11+.07,surfaces=rt.modules.surfaces.create();surfaces.beginFrame();const start=performance.now(),formal=rt.modules.sampling.apply(source,group,surfaces,{time,preview:{pixelDivMultiplier:1}}),cpuEnd=performance.now();
        const pulse=(Math.sin(time/3*Math.PI*2)+1)/2,tideScale=Math.max(0,1+(pulse-.5)*2*.2),amount=Math.max(0,Math.min(1,.85*tideScale)),tick=Math.floor(time/3*24),flow=tick/24*2;
        uniform('kind',kind==='wave'?0:1);uniform('flow',flow);uniform('amount',amount);
        gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();const cachedEnd=performance.now();
        upload();gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();const uploadedEnd=performance.now();
        if(i>1){cpu.push(cpuEnd-start);gpuCached.push(cachedEnd-cpuEnd);gpuUploaded.push(uploadedEnd-cachedEnd);}
        if(i===5){const pixels=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const expected=formal.getContext('2d').getImageData(0,0,W,H).data;let sum=0,changed=0,max=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=(y*W+x)*4,b=((H-1-y)*W+x)*4,delta=Math.abs(expected[a]-pixels[b])+Math.abs(expected[a+1]-pixels[b+1])+Math.abs(expected[a+2]-pixels[b+2]);sum+=delta;max=Math.max(max,delta/3);if(delta)changed++;}comparisons.push({meanRgbDifference255:+(sum/(W*H*3)).toFixed(3),changedPercent:+(changed/(W*H)*100).toFixed(3),maxChannelMeanDifference:+max.toFixed(3)});}
        surfaces.release(formal);
      }
      rows.push({kind,source:`${W}x${H}`,cpuFullMedianMs:+percentile(cpu,.5).toFixed(2),cpuFullP95Ms:+percentile(cpu,.95).toFixed(2),gpuCachedMedianMs:+percentile(gpuCached,.5).toFixed(2),gpuCachedP95Ms:+percentile(gpuCached,.95).toFixed(2),gpuUploadMedianMs:+percentile(gpuUploaded,.5).toFixed(2),gpuUploadP95Ms:+percentile(gpuUploaded,.95).toFixed(2),visual:comparisons[0]});
    }
    return{rows,glError:gl.getError(),contextLost:gl.isContextLost()};
  });
  assert.equal(result.glError,0);assert.equal(result.contextLost,false);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
