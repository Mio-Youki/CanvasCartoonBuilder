#!/usr/bin/env node
// Isolated wave/radial dynamic sampling-field experiment; edge rules excluded.
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
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-field=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.field?.build);
  const result=await page.evaluate(()=>{
    const field=window.ToSampoolRuntimeVNext.modules.field;
    const W=960,H=540,source=document.createElement('canvas');source.width=W;source.height=H;
    source.getContext('2d').fillRect(0,0,W,H);
    const output=document.createElement('canvas');output.width=W;output.height=H;
    const gl=output.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');
    const vertex='attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;uniform vec2 size,center;uniform float scale,contrast,seed,flow,direction,kind;
      void main(){vec2 p=vec2(gl_FragCoord.x-.5,size.y-gl_FragCoord.y-.5);float coordinate=kind<.5?dot(p,vec2(cos(direction),sin(direction))):length(p-center);
        float raw=.5+.5*sin((coordinate/scale-flow+seed*.031)*6.28318530718);
        float value=.5+(raw-.5)*contrast;gl_FragColor=vec4(value,value,value,1.0);}`;
    const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.viewport(0,0,W,H);
    const uniform=(key,value)=>gl.uniform1f(gl.getUniformLocation(program,key),value);
    gl.uniform2f(gl.getUniformLocation(program,'size'),W,H);gl.uniform2f(gl.getUniformLocation(program,'center'),W*.43,H*.57);
    const percentile=(arr,p)=>{const sorted=arr.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];};
    const rows=[];
    for(const kind of ['wave','radial']){
      const config={field:{enabled:true,type:kind,scale:63,contrast:.8,seed:5,direction:29,centerX:.43,centerY:.57},edge:{mode:'off'},motion:{fieldFlow:true,period:3,steps:24,flowSpeed:2}};
      const cpu=[],gpu=[],visual=[];
      for(let i=0;i<13;i++){
        const time=i*.12+.07,begin=performance.now(),expected=field.build(source,config,time),cpuEnd=performance.now();
        const flow=expected.tick/24*2;
        uniform('scale',63);uniform('contrast',.8);uniform('seed',5);uniform('flow',flow);uniform('direction',29*Math.PI/180);uniform('kind',kind==='wave'?0:1);
        gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();const gpuEnd=performance.now();
        if(i>0){cpu.push(cpuEnd-begin);gpu.push(gpuEnd-cpuEnd);}
        if(i===5){const pixels=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let sum=0,max=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const delta=Math.abs(expected.values[y*W+x]*255-pixels[((H-1-y)*W+x)*4]);sum+=delta;max=Math.max(max,delta);}visual.push({meanByteDifference:+(sum/(W*H)).toFixed(3),maxByteDifference:+max.toFixed(3)});}
      }
      rows.push({kind,source:`${W}x${H}`,cpuBuildMedianMs:+percentile(cpu,.5).toFixed(2),cpuBuildP95Ms:+percentile(cpu,.95).toFixed(2),gpuFieldMedianMs:+percentile(gpu,.5).toFixed(2),gpuFieldP95Ms:+percentile(gpu,.95).toFixed(2),visual:visual[0]});
    }
    return {rows,glError:gl.getError(),contextLost:gl.isContextLost()};
  });
  assert.equal(result.glError,0);assert.equal(result.contextLost,false);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
