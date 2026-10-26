#!/usr/bin/env node
// Measures the CPU mask-rasterization/upload boundary; does not modify Runtime.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found; set TOSAMPOOL_EDGE_PATH.');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-mask-upload=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.masks);
  const result=await page.evaluate(()=>{
    const rt=window.ToSampoolRuntimeVNext,percentile=(samples,p)=>{const sorted=[...samples].sort((a,b)=>a-b);return +sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)].toFixed(2);},stats=samples=>({median:percentile(samples,.5),p95:percentile(samples,.95)}),rows=[];
    for(const [width,height] of [[640,360],[1920,1080]]){
      const canvas=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
      const alpha=document.createElement('canvas');alpha.width=alpha.height=128;{const ctx=alpha.getContext('2d'),g=ctx.createLinearGradient(0,0,128,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}
      const glCanvas=canvas(),gl=glCanvas.getContext('webgl',{alpha:false,antialias:false});if(!gl){rows.push({width,height,unsupported:'WebGL'});continue;}
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 uv;uniform sampler2D maskTex;void main(){float a=texture2D(maskTex,uv).a;gl_FragColor=vec4(a,a,a,1.0);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.useProgram(program);const attr=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);gl.uniform1i(gl.getUniformLocation(program,'maskTex'),0);gl.viewport(0,0,width,height);
      const scene={format:'tosampool-scene/v4',width,height,loop:2,background:{alpha:0},runtimeAssets:{alpha:{image:alpha}},entities:[{id:'mask-source',type:'ellipse',x:width*.2,y:height*.2,w:width*.6,h:height*.6,fill:'#fff',anim:{bob:{enabled:true,amount:width*.04,period:1,angle:0}}}]};
      const player=rt.createRuntime(scene),surfaces=rt.modules.surfaces.create(),masks={rect:{type:'rect',x:width*.2,y:height*.2,w:width*.6,h:height*.6},alpha:{type:'alpha',assetId:'alpha',x:width*.2,y:height*.2,w:width*.6,h:height*.6,mode:'alpha'},dynamicElement:{type:'element',targetId:'mask-source'}};
      for(const [kind,mask] of Object.entries(masks)){
        const generation=[],upload=[],total=[],samples=kind==='dynamicElement'?36:18;
        for(let i=0;i<samples;i++){
          const surface=canvas(),ctx=surface.getContext('2d');const start=performance.now();ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);surfaces.beginFrame();const frame=rt.modules.frame.create(player.scene,i/12);rt.modules.masks.apply(surface,mask,{x:0,y:0,w:width,h:height},player.scene,frame,surfaces);const afterMask=performance.now();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,surface);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();const end=performance.now();if(i>=5){generation.push(afterMask-start);upload.push(end-afterMask);total.push(end-start);}
        }
        rows.push({width,height,kind,cpuMaskGenerationMs:stats(generation),uploadAndDrawMs:stats(upload),combinedMs:stats(total),samples:total.length,glError:gl.getError()});
      }
    }
    return rows;
  });console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
