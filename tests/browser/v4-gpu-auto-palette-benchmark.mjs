#!/usr/bin/env node
// Isolated automatic-palette experiment. No production renderer changes.
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
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-auto-palette=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.sampling?.autoPalette);
  const result=await page.evaluate(()=>{
    const sampling=window.ToSampoolRuntimeVNext.modules.sampling;
    const W=640,H=360,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const output=document.createElement('canvas');output.width=W;output.height=H;
    const gl=output.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL unavailable');
    const vertex='attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;varying vec2 uv;uniform sampler2D src;uniform vec3 colours[64];uniform int count;
      void main(){vec4 p=texture2D(src,uv);vec3 q=(floor(p.rgb*255.0/8.0)*8.0+4.0)/255.0;
        float best=1e10;vec3 chosen=colours[0];
        for(int i=0;i<64;i++){if(i>=count)break;vec3 d=q-colours[i];float score=dot(d,d);if(score<best){best=score;chosen=colours[i];}}
        gl_FragColor=vec4(chosen,p.a);}`;
    const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program,'src'),0);gl.viewport(0,0,W,H);
    const drawInput=t=>{const gradient=ctx.createLinearGradient(0,0,W,H);gradient.addColorStop(0,`hsl(${12+t*9} 70% 30%)`);gradient.addColorStop(.5,`hsl(${175+t*7} 55% 64%)`);gradient.addColorStop(1,`hsl(${310+t*5} 75% 80%)`);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);for(let i=0;i<64;i++){ctx.fillStyle=`hsla(${(i*37+t*11)%360} 74% ${20+i%8*8}% / .5)`;ctx.fillRect((i*137)%W,(i*83)%H,32+i%4*13,22+i%5*9);}};
    const percentile=(values,p)=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];};
    const rows=[];
    for(const count of [16,64]){
      const extract=[],gpu=[],cpu=[],endToEnd=[],differences=[];
      for(let frame=0;frame<9;frame++){
        drawInput(frame);const source=ctx.getImageData(0,0,W,H),start=performance.now();
        const palette=sampling.autoPalette(source.data,count);const extracted=performance.now();
        const values=new Float32Array(64*3);palette.forEach((c,i)=>{values[i*3]=c[0]/255;values[i*3+1]=c[1]/255;values[i*3+2]=c[2]/255;});
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        gl.uniform3fv(gl.getUniformLocation(program,'colours'),values);gl.uniform1i(gl.getUniformLocation(program,'count'),palette.length);
        gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();const rendered=performance.now();
        const surfaces=window.ToSampoolRuntimeVNext.modules.surfaces.create();surfaces.beginFrame();const formal=sampling.colorMap(canvas,{palette:'auto',colors:count},surfaces,0);const mapped=performance.now();
        const reference=formal.getContext('2d').getImageData(0,0,W,H).data,actual=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,actual);
        let diff=0;for(let i=0;i<reference.length;i+=4){const j=((H-1-Math.floor(i/4/W))*W+(i/4%W))*4;diff+=Math.abs(reference[i]-actual[j])+Math.abs(reference[i+1]-actual[j+1])+Math.abs(reference[i+2]-actual[j+2]);}
        if(frame>0){extract.push(extracted-start);gpu.push(rendered-extracted);cpu.push(mapped-rendered);endToEnd.push(rendered-start);differences.push(diff/(W*H*3));}
        surfaces.release(formal);
      }
      const staticTimes=[],surfaces=window.ToSampoolRuntimeVNext.modules.surfaces.create();
      for(let i=0;i<8;i++){surfaces.beginFrame();const start=performance.now(),mapped=sampling.colorMap(canvas,{palette:'auto',colors:count},surfaces,0);staticTimes.push(performance.now()-start);surfaces.release(mapped);}
      rows.push({colours:count,source:`${W}x${H}`,extractMedianMs:+percentile(extract,.5).toFixed(2),extractP95Ms:+percentile(extract,.95).toFixed(2),gpuUploadAndDrawMedianMs:+percentile(gpu,.5).toFixed(2),gpuUploadAndDrawP95Ms:+percentile(gpu,.95).toFixed(2),gpuPipelineMedianMs:+percentile(endToEnd,.5).toFixed(2),cpuFormalMapMedianMs:+percentile(cpu,.5).toFixed(2),cpuStaticCachedMedianMs:+percentile(staticTimes.slice(1),.5).toFixed(2),meanRgbDifference255:+percentile(differences,.5).toFixed(3)});
    }
    return {rows,glError:gl.getError(),contextLost:gl.isContextLost()};
  });
  assert.equal(result.glError,0);assert.equal(result.contextLost,false);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
