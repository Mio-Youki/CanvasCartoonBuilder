#!/usr/bin/env node
// Device-side playback budget of full-resolution GPU uneven sampling with edge protection.
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
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-uneven-playback=1',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const W=1920,H=1080,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.style.width='960px';canvas.style.height='540px';document.body.append(canvas);
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)throw new Error('WebGL2 unavailable');
    const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const vertex='#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`#version 300 es
      precision highp float;uniform sampler2D src;uniform vec2 size;uniform float grid,flow,mode;out vec4 outColor;
      vec4 pixel(vec2 p){return texture(src,vec2((p.x+.5)/size.x,1.0-(p.y+.5)/size.y));}
      void main(){vec2 outPixel=floor(vec2(gl_FragCoord.x-.5,1080.0-gl_FragCoord.y-.5));vec2 p=floor(outPixel/grid);
        float raw=.5+.5*sin((p.x/63.0-flow+5.0*.031)*6.28318530718),field=.5+(raw-.5)*.8;
        if(mode>.5){float dist=min(min(p.x,p.y),min(size.x-1.0-p.x,size.y-1.0-p.y));
          for(int dy=-3;dy<=3;dy++)for(int dx=-3;dx<=3;dx++){
            vec2 q=p+vec2(float(dx),float(dy));float d=abs(float(dx))+abs(float(dy));
            if(d>=dist||q.x<0.0||q.y<0.0||q.x>=size.x||q.y>=size.y)continue;
            if(pixel(q).a<8.0/255.0)dist=d;
          }
          float near=clamp(1.0-dist/2.0,0.0,1.0);field=.5+(field-.5)*(mode<1.5?1.0-near:near);
        }
        float cell=1.0+floor(clamp(field,0.0,1.0)*.85*4.0);outColor=pixel(floor(p/cell)*cell);}`;
    const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'src'),0);
    const full=document.createElement('canvas');full.width=W;full.height=H;const fullCtx=full.getContext('2d');
    const percentile=(items,p)=>{const a=items.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];};
    const summary=values=>values.length?{median:+percentile(values,.5).toFixed(2),p95:+percentile(values,.95).toFixed(2),max:+Math.max(...values).toFixed(2)}:null;
    const results=[];
    for(const grid of [1,3]){
      const width=Math.ceil(W/grid),height=Math.ceil(H/grid),work=document.createElement('canvas');work.width=width;work.height=height;const workCtx=work.getContext('2d');workCtx.imageSmoothingEnabled=false;
      gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.uniform2f(gl.getUniformLocation(program,'size'),width,height);gl.uniform1f(gl.getUniformLocation(program,'grid'),grid);gl.viewport(0,0,W,H);
      for(const mode of [0,1,2]){
        const main=[],gaps=[],queries=[];let previous=0;
        for(let frame=0;frame<36;frame++){
          const now=await new Promise(requestAnimationFrame);if(previous&&frame>=6)gaps.push(now-previous);previous=now;
          const start=performance.now(),x=180+Math.sin(frame*.14)*100;
          fullCtx.clearRect(0,0,W,H);const g=fullCtx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#135079');g.addColorStop(.5,'#e38a64');g.addColorStop(1,'#f4dfa6');fullCtx.fillStyle=g;fullCtx.beginPath();fullCtx.ellipse(W*.5+x,H*.5,W*.33,H*.34,0,0,Math.PI*2);fullCtx.fill();
          workCtx.clearRect(0,0,width,height);workCtx.drawImage(full,0,0,width,height);
          let q=null;if(timer){q=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,q);}
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,work);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
          gl.uniform1f(gl.getUniformLocation(program,'flow'),Math.floor(frame/3)/24);gl.uniform1f(gl.getUniformLocation(program,'mode'),mode);gl.drawArrays(gl.TRIANGLES,0,3);
          if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(q);}if(frame>=6)main.push(performance.now()-start);
        }
        gl.finish();const gpu=[],disjoint=timer?gl.getParameter(timer.GPU_DISJOINT_EXT):null;
        for(let i=0;i<queries.length;i++){const q=queries[i];if(i>=6&&!disjoint&&gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
        results.push({grid,mode:['off','contour','interior'][mode],mainThreadMs:summary(main),gpuQueryMs:summary(gpu),frameGapMs:summary(gaps),querySamples:gpu.length,disjoint,glError:gl.getError()});
      }
    }
    const ext=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),results};
  });
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
