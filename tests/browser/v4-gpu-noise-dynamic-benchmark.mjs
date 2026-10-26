#!/usr/bin/env node
// Experimental comparison only. The production renderer is not modified.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
if (!edge) throw new Error('Edge not found; set TOSAMPOOL_EDGE_PATH.');
const photo = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?gpu-noise-dynamic=1', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async dataUrl => {
    const image = await new Promise((resolveImage, reject) => { const img = new Image(); img.onload = () => resolveImage(img); img.onerror = reject; img.src = dataUrl; });
    const rows = [];
    let diagnosticPng = null;
    for (const [width, height] of [[640, 360], [1920, 1080]]) {
      const source = document.createElement('canvas'); source.width = width; source.height = height;
      source.getContext('2d').drawImage(image, 0, 0, width, height);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
      if (!gl) { rows.push({ width, height, unsupported: 'WebGL2' }); continue; }
      const vertex = `#version 300 es
        in vec2 a; out vec2 uv;
        void main(){uv=(a+1.0)*0.5;gl_Position=vec4(a,0.0,1.0);}`;
      const fragment = `#version 300 es
        precision highp float; precision highp int;
        in vec2 uv; out vec4 color;
        uniform sampler2D src, noiseTex; uniform uint seed, tick; uniform int mode;
        uint hash(uvec2 p){uint h=p.x*0x9e3779b9u ^ p.y*0x85ebca6bu ^ seed*0xc2b2ae35u ^ tick*0x27d4eb2fu;
          h^=h>>16;h*=0x7feb352du;h^=h>>15;h*=0x846ca68bu;return h^(h>>16);}
        void main(){vec4 pixel=texture(src,uv);uvec2 cell=uvec2(gl_FragCoord.xy);
          float n=mode==0?float(hash(cell)&255u)/255.0:texelFetch(noiseTex,ivec2(cell),0).r;
          float d=(n*2.0-1.0)*0.18; color=vec4(clamp(pixel.rgb+vec3(d),0.0,1.0),pixel.a);}`;
      const compile = (type, code) => { const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader; };
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      gl.useProgram(program);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      const makeTexture=()=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;};
      const input=makeTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      const noise=makeTexture(), bytes=new Uint8Array(width*height*4);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.uniform1i(gl.getUniformLocation(program,'src'),0);gl.uniform1i(gl.getUniformLocation(program,'noiseTex'),1);gl.uniform1ui(gl.getUniformLocation(program,'seed'),7);
      const modeLoc=gl.getUniformLocation(program,'mode'),tickLoc=gl.getUniformLocation(program,'tick');
      const output=document.createElement('canvas');output.width=width;output.height=height;const outCtx=output.getContext('2d');
      const fill=(tick)=>{for(let y=0;y<height;y++){let state=(Math.imul(8,0x9e3779b1)^Math.imul(tick+1,0x85ebca6b)^Math.imul(y+1,0xc2b2ae35))>>>0;if(!state)state=1;
        for(let x=0;x<width;x++){state^=state<<13;state^=state>>>17;state^=state<<5;const at=(y*width+x)*4;bytes[at]=bytes[at+1]=bytes[at+2]=state&255;bytes[at+3]=255;}}};
      const run=(mode,tick,readback=false)=>{const start=performance.now();if(mode===1){fill(tick);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);}
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.uniform1i(modeLoc,mode);gl.uniform1ui(tickLoc,tick);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
        outCtx.drawImage(canvas,0,0);if(readback)outCtx.getImageData(0,0,width,height);return performance.now()-start;};
      // Alternate order and use a changing tick, so neither route benefits from a fixed noise frame.
      for(let i=0;i<5;i++){run(0,i);run(1,i);}
      const gpu=[],upload=[];for(let i=0;i<24;i++){const tick=i+5;if(i%2){upload.push(run(1,tick));gpu.push(run(0,tick));}else{gpu.push(run(0,tick));upload.push(run(1,tick));}}
      const gpuReadback=[],uploadReadback=[];for(let i=0;i<12;i++){const tick=i+30;if(i%2){uploadReadback.push(run(1,tick,true));gpuReadback.push(run(0,tick,true));}else{gpuReadback.push(run(0,tick,true));uploadReadback.push(run(1,tick,true));}}
      const stats=samples=>{const sorted=[...samples].sort((x,y)=>x-y);return {median:+sorted[Math.floor(sorted.length/2)].toFixed(2),p95:+sorted[Math.ceil(sorted.length*.95)-1].toFixed(2)};};
      const images=[];for(const mode of [0,1]){run(mode,42);const pixels=outCtx.getImageData(0,0,width,height).data;images.push(new Uint8ClampedArray(pixels));}
      const changed=mode=>{run(mode,43);const next=outCtx.getImageData(0,0,width,height).data;let count=0;for(let i=0;i<next.length;i+=4)if(next[i]!==images[mode][i])count++;return +(count/(width*height)*100).toFixed(2);};
      const imageStats=pixels=>{let alpha=0,mean=0,variation=0;for(let i=0;i<pixels.length;i+=4){alpha+=pixels[i+3];mean+=pixels[i];}alpha/=width*height;mean/=width*height;for(let i=0;i<pixels.length;i+=4)variation+=Math.abs(pixels[i]-mean);return {alpha:+alpha.toFixed(2),redMean:+mean.toFixed(2),redVariation:+(variation/(width*height)).toFixed(2)};};
      const difference=()=>{let total=0;for(let i=0;i<images[0].length;i+=4)total+=Math.abs(images[0][i]-images[1][i])+Math.abs(images[0][i+1]-images[1][i+1])+Math.abs(images[0][i+2]-images[1][i+2]);return +(total/(width*height*3)).toFixed(2);};
      // A neutral flat input reveals structure in the noise itself; preserve a small diagnostic image.
      if(width===640){const flat=document.createElement('canvas');flat.width=width;flat.height=height;flat.getContext('2d').fillStyle='#808080';flat.getContext('2d').fillRect(0,0,width,height);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,flat);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        const contact=document.createElement('canvas');contact.width=width*2;contact.height=height;const ctx=contact.getContext('2d');for(const mode of [0,1]){run(mode,42);ctx.drawImage(output,mode*width,0);}diagnosticPng=contact.toDataURL('image/png').split(',')[1];}
      const ext=gl.getExtension('WEBGL_debug_renderer_info');rows.push({width,height,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),gpuIntegerHashMs:stats(gpu),cpuXorshiftUploadMs:stats(upload),gpuWithReadbackMs:stats(gpuReadback),uploadWithReadbackMs:stats(uploadReadback),gpuImage:imageStats(images[0]),uploadImage:imageStats(images[1]),changedPixelsNextTickPercent:{gpu:changed(0),upload:changed(1)},meanRgbDifference:difference(),glError:gl.getError()});
    }
    return {rows,diagnosticPng};
  }, photo);
  if(result.diagnosticPng)writeFileSync(resolve(root,'docs/architecture/v4-gpu-noise-dynamic-flat.png'),Buffer.from(result.diagnosticPng,'base64'));
  console.log(JSON.stringify(result.rows,null,2));
} finally { await browser.close(); }
