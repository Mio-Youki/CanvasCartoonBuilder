#!/usr/bin/env node
// Isolated playback benchmark. No production renderer or project data is changed.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found; set TOSAMPOOL_EDGE_PATH.');
const photo=`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`;
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('about:blank');
  const result=await page.evaluate(async dataUrl=>{
    const image=await new Promise((ok,bad)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=bad;img.src=dataUrl;});
    const percentile=(data,p)=>{if(!data.length)return null;const sorted=[...data].sort((a,b)=>a-b);return +sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)].toFixed(2);};
    const summarize=data=>({median:percentile(data,.5),p95:percentile(data,.95),max:data.length?+Math.max(...data).toFixed(2):null});
    const rows=[];
    for(const [width,height] of [[640,360],[1920,1080]]){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.style.cssText='width:640px;height:360px';document.body.append(canvas);
      const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false});
      if(!gl){rows.push({width,height,unsupported:'WebGL2'});canvas.remove();continue;}
      const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const vertex=`#version 300 es
        in vec2 a;out vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}`;
      const fragment=`#version 300 es
        precision highp float;precision highp int;
        in vec2 uv;out vec4 color;uniform sampler2D src,noiseTex;uniform uint tick;uniform int mode;
        uint hash(uvec2 p){uint h=p.x*0x9e3779b9u^p.y*0x85ebca6bu^7u*0xc2b2ae35u^tick*0x27d4eb2fu;
          h^=h>>16;h*=0x7feb352du;h^=h>>15;h*=0x846ca68bu;return h^(h>>16);}
        void main(){vec4 pixel=texture(src,uv);float n=mode==0?float(hash(uvec2(gl_FragCoord.xy))&255u)/255.0:texelFetch(noiseTex,ivec2(gl_FragCoord.xy),0).r;
          color=vec4(clamp(pixel.rgb+vec3((n*2.0-1.0)*.18),0.0,1.0),pixel.a);}`;
      const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      gl.useProgram(program);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      const texture=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
      const input=texture(),source=document.createElement('canvas');source.width=width;source.height=height;source.getContext('2d').drawImage(image,0,0,width,height);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      const noise=texture(),bytes=new Uint8Array(width*height*4);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.uniform1i(gl.getUniformLocation(program,'src'),0);gl.uniform1i(gl.getUniformLocation(program,'noiseTex'),1);
      const modeLoc=gl.getUniformLocation(program,'mode'),tickLoc=gl.getUniformLocation(program,'tick');
      const fill=tick=>{for(let y=0;y<height;y++){let state=(Math.imul(8,0x9e3779b1)^Math.imul(tick+1,0x85ebca6b)^Math.imul(y+1,0xc2b2ae35))>>>0;if(!state)state=1;for(let x=0;x<width;x++){state^=state<<13;state^=state>>>17;state^=state<<5;const at=(y*width+x)*4;bytes[at]=bytes[at+1]=bytes[at+2]=state&255;bytes[at+3]=255;}}};
      const run=async mode=>{
        const gaps=[],js=[],prep=[],queries=[];let previous=0;
        for(let frame=0;frame<90;frame++){
          const now=await new Promise(requestAnimationFrame);if(previous&&frame>=10)gaps.push(now-previous);previous=now;
          const start=performance.now();
          if(mode===1){fill(frame);prep.push(performance.now()-start);}
          let q=null;if(timer){q=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,q);}
          if(mode===1){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);}
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.uniform1i(modeLoc,mode);gl.uniform1ui(tickLoc,frame);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,3);
          if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(q);}
          if(frame>=10)js.push(performance.now()-start);
        }
        gl.finish();const gpu=[];const disjoint=timer?gl.getParameter(timer.GPU_DISJOINT_EXT):null;
        for(let i=0;i<queries.length;i++){const q=queries[i];if(i>=10&&!disjoint&&gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
        return {frameGapMs:summarize(gaps),mainThreadMs:summarize(js),cpuFillMs:mode===1?summarize(prep.slice(10)):null,gpuQueryMs:gpu.length?summarize(gpu):null,gpuQuerySamples:gpu.length,gpuDisjoint:disjoint,framesOver16_7:gaps.filter(x=>x>16.7).length,gaps:gaps.length};
      };
      // Counterbalance order, including warm-up. A fresh tick is generated every RAF.
      await run(0);await run(1);const integer=await run(0),upload=await run(1);
      const ext=gl.getExtension('WEBGL_debug_renderer_info');rows.push({width,height,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),timerQueryAvailable:!!timer,integerHash:integer,cpuTextureUpload:upload,glError:gl.getError()});
      canvas.remove();
    }
    return rows;
  },photo);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
