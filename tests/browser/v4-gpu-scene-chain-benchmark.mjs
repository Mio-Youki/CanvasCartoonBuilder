#!/usr/bin/env node
// Isolated shared-context experiment. It does not change the production renderer.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
if (!edge) throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const photoData = `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}`;
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?gpu-scene-chain=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ToSampoolRuntimeVNext?.modules?.sceneEffects);
  const result = await page.evaluate(async photoData => {
    const runtime = window.ToSampoolRuntimeVNext;
    const image = await new Promise((done, fail) => { const img = new Image(); img.onload = () => done(img); img.onerror = fail; img.src = photoData; });
    const stages = {
      palette: { 'color-map': { enabled: true, palette: 'nes', colors: 16 } },
      noise: { 'noise-dither': { enabled: true, amount: 18, size: 1, seed: 7, colorMode: 'mono' } },
      threshold: { threshold: { enabled: true, threshold: .5, dark: '#111827', light: '#f4e8cf' } },
      uneven: { 'uneven-sampling': { enabled: true, amount: .7, coarseness: 5, field: { enabled: true, type: 'wave', scale: 48, contrast: .5, seed: 1, direction: 0 }, edge: { mode: 'off' } } },
      dispersion: { 'edge-dispersion': { enabled: true, distance: 2, strength: .8, angle: 0, width: 1, source: 'auto', order: 'rgb' } },
      tint: { 'tint-overlay': { enabled: true, color: '#c6457d', alpha: .35, blend: 'normal' } },
      'hard-mix': null,
      vignette: { enabled: true, strength: .45, inner: .25, outer: .8, color: '#000000', blend: 'normal' }
    };
    const bayer = runtime.modules.pattern.bayer(4);
    stages['hard-mix'] = { 'texture-overlay': { enabled: true, texture: 'custom', tileWidth: bayer.tileWidth, tileHeight: bayer.tileHeight, tileScale: 1, tileScaleMode: 'pixel', tilePixels: bayer.tilePixels, color: '#edc981', alpha: .4, blend: 'hard-mix' } };
    const chains = [
      ['threshold','tint'],
      ['noise','dispersion','tint','hard-mix'],
      ['palette','noise','threshold','uneven','dispersion','tint','hard-mix','vignette']
    ];
    const shaderSource = {
      palette: `precision highp float;varying vec2 uv;uniform sampler2D src;uniform vec3 palette[16];void main(){vec4 p=texture2D(src,uv);vec3 q=(floor(p.rgb*255.0/8.0)*8.0+4.0)/255.0;float best=1e10;vec3 chosen=palette[0];for(int i=0;i<16;i++){vec3 d=q-palette[i];float distance=dot(d,d);if(distance<best){best=distance;chosen=palette[i];}}gl_FragColor=vec4(chosen,p.a);}`,
      noise: `precision highp float;varying vec2 uv;uniform sampler2D src,noiseTex;void main(){vec4 p=texture2D(src,uv);float delta=(texture2D(noiseTex,uv).r*2.0-1.0)*.18;gl_FragColor=vec4(clamp(p.rgb+vec3(delta),0.0,1.0),p.a);}`,
      threshold: `precision highp float;varying vec2 uv;uniform sampler2D src;void main(){vec4 p=texture2D(src,uv);float l=dot(p.rgb,vec3(.2126,.7152,.0722));gl_FragColor=vec4(l>=.5?vec3(244.0,232.0,207.0)/255.0:vec3(17.0,24.0,39.0)/255.0,p.a);}`,
      uneven: `precision highp float;varying vec2 uv;uniform sampler2D src;uniform vec2 size;void main(){vec2 pixel=floor(vec2(uv.x*size.x,(1.0-uv.y)*size.y));float raw=.5+.5*sin(((pixel.x/48.0)+.031)*6.2831853);float field=.5+(raw-.5)*.5;float cell=1.0+floor(clamp(field,0.0,1.0)*.7*4.0);vec2 q=floor(pixel/cell)*cell;gl_FragColor=texture2D(src,vec2((q.x+.5)/size.x,1.0-(q.y+.5)/size.y));}`,
      dispersion: `precision highp float;varying vec2 uv;uniform sampler2D src;uniform vec2 size;
        float lum(vec4 p){return dot(p.rgb,vec3(.2126,.7152,.0722));}
        void main(){vec4 p=texture2D(src,uv);vec2 x=vec2(2.0/size.x,0.0),y=vec2(0.0,2.0/size.y);
          vec4 l=texture2D(src,clamp(uv-x,vec2(0.0),vec2(1.0)));
          vec4 r=texture2D(src,clamp(uv+x,vec2(0.0),vec2(1.0)));
          vec4 u=texture2D(src,clamp(uv+y,vec2(0.0),vec2(1.0)));
          vec4 d=texture2D(src,clamp(uv-y,vec2(0.0),vec2(1.0)));
          float edge=max(max(abs(p.a-l.a),abs(p.a-r.a)),max(abs(p.a-u.a),abs(p.a-d.a)));
          float horizontal=max(abs(lum(p)-lum(l)),abs(lum(p)-lum(r)));
          float vertical=max(abs(lum(p)-lum(u)),abs(lum(p)-lum(d)));
          edge=max(edge,step(24.0/255.0,max(horizontal,vertical)));
          vec4 candidate=vec4(r.a>0.0?r.r:0.0,p.g,l.a>0.0?l.b:0.0,max(p.a,max(r.a,l.a)));
          gl_FragColor=mix(p,candidate,step(8.0/255.0,edge)*.8);}`,
      tint: `precision highp float;varying vec2 uv;uniform sampler2D src;void main(){vec4 p=texture2D(src,uv);float la=p.a*.35,outA=la+p.a*(1.0-la);vec3 rgb=vec3(198.0,69.0,125.0)/255.0*la+p.rgb*p.a*(1.0-la);gl_FragColor=vec4(outA>0.0?rgb/outA:vec3(0.0),outA);}`,
      'hard-mix': `precision highp float;varying vec2 uv;uniform sampler2D src,stamp;void main(){vec4 base=texture2D(src,uv),pattern=texture2D(stamp,uv);float la=pattern.a*base.a*.4,ba=base.a,outA=la+ba*(1.0-la);vec3 mixed=step(vec3(1.0),base.rgb+pattern.rgb);vec3 rgb=la*((1.0-ba)*pattern.rgb+ba*mixed)+ba*(1.0-la)*base.rgb;gl_FragColor=vec4(outA>0.0?rgb/max(outA,.00001):vec3(0.0),outA);}`,
      vignette: `precision highp float;varying vec2 uv;uniform sampler2D src;uniform vec2 size;void main(){vec4 p=texture2D(src,uv);float r=length(uv*size-size*.5),la=clamp((r-min(size.x,size.y)*.25)/(max(size.x,size.y)*.8-min(size.x,size.y)*.25),0.0,1.0)*.45;float outA=la+p.a*(1.0-la);gl_FragColor=vec4(outA>0.0?p.rgb*p.a*(1.0-la)/outA:vec3(0.0),outA);}`
    };
    const palette = runtime.modules.sampling.palettes.nes;
    const results = [];
    const measure = (fn, samples) => { for (let i=0;i<2;i++) fn(i); const times=[]; for (let i=0;i<samples;i++){const start=performance.now();fn(i+2);times.push(performance.now()-start);} times.sort((a,b)=>a-b);return {median:+times[Math.floor((times.length-1)*.5)].toFixed(2),p95:+times[Math.ceil(times.length*.95)-1].toFixed(2)};};
    const difference = (a,b,width,height) => { const x=a.getContext('2d').getImageData(0,0,width,height).data,y=b.getContext('2d').getImageData(0,0,width,height).data;let sum=0;for(let i=0;i<x.length;i++)sum+=Math.abs(x[i]-y[i]);return +(sum/x.length).toFixed(2);};
    const makeNoise = (width,height) => { const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);for(let y=0;y<height;y++){let state=(Math.imul(8,0x9e3779b1)^Math.imul(1,0x85ebca6b)^Math.imul(y+1,0xc2b2ae35))>>>0;if(!state)state=1;for(let x=0;x<width;x++){state^=state<<13;state^=state>>>17;state^=state<<5;const byte=state&255,at=(y*width+x)*4;data.data[at]=data.data[at+1]=data.data[at+2]=byte;data.data[at+3]=255;}}ctx.putImageData(data,0,0);return canvas;};
    function createGpu(width,height) {
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});if(!gl)throw new Error('WebGL 不可用');
      const compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(`${gl.getShaderInfoLog(s)} SOURCE: ${code}`);return s;};
      const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}');
      const programs={};for(const [name,fragment] of Object.entries(shaderSource)){const p=gl.createProgram();gl.attachShader(p,vertex);gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(`${name}: ${gl.getProgramInfoLog(p)}`);programs[name]=p;}
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const texture=(source=null)=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);if(source){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return tex;};
      const upload=(target,source)=>{gl.bindTexture(gl.TEXTURE_2D,target);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);};
      const input=texture(),ping=texture(),pong=texture(),noise=texture(makeNoise(width,height));
      const stampCanvas=runtime.modules.pattern.texture(width,height,runtime.modules.pattern.overlay(stages['hard-mix']['texture-overlay']),'#edc981',{time:0,dynamic:false});
      const stamp=texture(stampCanvas),fbo=gl.createFramebuffer(),output=document.createElement('canvas');output.width=width;output.height=height;
      const run=(source,chain)=>{upload(input,source);let current=input;for(let i=0;i<chain.length;i++){const name=chain[i],p=programs[name],last=i===chain.length-1;gl.bindFramebuffer(gl.FRAMEBUFFER,last?null:fbo);if(!last)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,i%2?pong:ping,0);gl.viewport(0,0,width,height);gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const at=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,current);gl.uniform1i(gl.getUniformLocation(p,'src'),0);if(['uneven','dispersion','vignette'].includes(name))gl.uniform2f(gl.getUniformLocation(p,'size'),width,height);if(name==='palette')gl.uniform3fv(gl.getUniformLocation(p,'palette[0]'),new Float32Array(palette.flat().map(v=>v/255)));if(name==='noise'||name==='hard-mix'){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,name==='noise'?noise:stamp);gl.uniform1i(gl.getUniformLocation(p,name==='noise'?'noiseTex':'stamp'),1);}gl.drawArrays(gl.TRIANGLES,0,3);current=i%2?pong:ping;}gl.finish();const ctx=output.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(canvas,0,0);return output;};
      const ext=gl.getExtension('WEBGL_debug_renderer_info');return {run,status:()=>({contextLost:gl.isContextLost(),error:gl.getError()}),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),textureBytes:5*width*height*4};
    }
    for (const [width,height] of [[640,360],[1280,720],[1920,1080]]) {
      const source=document.createElement('canvas');source.width=width;source.height=height;source.getContext('2d').drawImage(image,0,0,width,height);
      const gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),frame={time:0,preview:{pixelDivMultiplier:1}},cpuSink=document.createElement('canvas');cpuSink.width=width;cpuSink.height=height;
      const cpuStep=(src,name)=>name==='vignette'?runtime.modules.sceneEffects.maskedInnerLight(src,stages.vignette,{},frame,surfaces):['tint','hard-mix'].includes(name)?runtime.modules.decorate.apply(src,stages[name],surfaces,frame):runtime.modules.sampling.apply(src,stages[name],surfaces,frame);
      const cpuRun=(src,chain)=>{let current=src;for(const name of chain){const next=cpuStep(current,name);if(current!==src&&current!==next)surfaces.release(current);current=next;}const ctx=cpuSink.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(current,0,0);if(current!==src)surfaces.release(current);return cpuSink;};
      for (const chain of chains) {
        if(width>640&&chain.length!==4)continue;
        const cpuFrame=document.createElement('canvas');cpuFrame.width=width;cpuFrame.height=height;cpuFrame.getContext('2d').drawImage(cpuRun(source,chain),0,0);
        const gpuFrame=gpu.run(source,chain);const meanChannelError=difference(cpuFrame,gpuFrame,width,height);
        const cpu=measure(()=>cpuRun(source,chain),width>=1920?3:6),sharedGpu=measure(()=>gpu.run(source,chain),width>=1920?10:width>=1280?12:20);
        let hybrid=null,hybridPixelReadback=null;
        if(chain.length===4){
          const readbackCanvas=document.createElement('canvas');readbackCanvas.width=width;readbackCanvas.height=height;
          const hybridRun=(forceReadback=false)=>{const partial=gpu.run(source,['noise','dispersion']);let intermediate=partial;
            if(forceReadback){const image=partial.getContext('2d').getImageData(0,0,width,height);readbackCanvas.getContext('2d').putImageData(image,0,0);intermediate=readbackCanvas;}
            const tinted=runtime.modules.decorate.apply(intermediate,stages.tint,surfaces,frame);const final=gpu.run(tinted,['hard-mix']);surfaces.release(tinted);return final;};
          hybrid=measure(()=>hybridRun(false),width>=1920?10:width>=1280?12:20);
          hybridPixelReadback=measure(()=>hybridRun(true),width>=1920?6:width>=1280?8:10);
        }
        let fullFrame=null;
        if(chain.length===4){
          const makeScene=withEffects=>({format:'tosampool-scene/v4',width,height,loop:2,background:{color:'#0f121a',alpha:1},assets:{photo:{image:source}},entities:[{id:'photo',type:'image',assetId:'photo',x:0,y:0,w:width,h:height},{id:'vector',type:'rect',x:width*.22,y:height*.36,w:width*.12,h:height*.13,fill:'#f7bb55'}],sceneEffects:withEffects?{sample:Object.assign({},stages.noise,stages.dispersion),overlay:Object.assign({},stages.tint,stages['hard-mix'])}:{sample:{},overlay:{}}});
          const plainPlayer=runtime.createRuntime(makeScene(false)),effectPlayer=runtime.createRuntime(makeScene(true)),plainCanvas=document.createElement('canvas'),effectCanvas=document.createElement('canvas');
          effectPlayer.renderTo(effectCanvas,0);plainPlayer.renderTo(plainCanvas,0);
          const fullChain=['tint','hard-mix','noise','dispersion'];
          const fullGpuFrame=gpu.run(plainCanvas,fullChain);
          fullFrame={meanChannelError:difference(effectCanvas,fullGpuFrame,width,height),cpu:measure(index=>effectPlayer.renderTo(effectCanvas,index/12),width>=1920?3:6),base:measure(index=>plainPlayer.renderTo(plainCanvas,index/12),width>=1920?6:10),gpu:measure(index=>{plainPlayer.renderTo(plainCanvas,index/12);gpu.run(plainCanvas,fullChain);},width>=1920?10:width>=1280?12:20),gpuAfterPixelRead:measure(index=>{plainPlayer.renderTo(plainCanvas,index/12);plainCanvas.getContext('2d').getImageData(0,0,width,height);gpu.run(plainCanvas,fullChain);},width>=1920?5:8),pipeline:effectPlayer.scene.sceneEffects.pipeline,status:gpu.status(),canvasSize:[plainCanvas.width,plainCanvas.height]};
          if(width===640){const comparison=document.createElement('canvas');comparison.id='gpu-chain-full-frame';comparison.width=width*2;comparison.height=height;const ctx=comparison.getContext('2d');ctx.drawImage(effectCanvas,0,0);ctx.drawImage(fullGpuFrame,width,0);comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);}
        }
        if(width===640){const comparison=document.createElement('canvas');comparison.id=`gpu-chain-${chain.length}`;comparison.width=width*2;comparison.height=height;const ctx=comparison.getContext('2d');ctx.drawImage(cpuFrame,0,0);ctx.drawImage(gpuFrame,width,0);comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);}
        results.push({size:`${width}x${height}`,passes:chain,meanChannelError,cpu,sharedGpu,hybrid,hybridPixelReadback,fullFrame,estimatedTextureMB:+(gpu.textureBytes/1048576).toFixed(1)});
      }
    }
    return results;
  }, photoData);
  console.log(JSON.stringify(result,null,2));
  for(const count of [2,4,8,'full-frame']){await page.evaluate(count=>{for(const canvas of document.querySelectorAll('[id^="gpu-chain-"]'))canvas.style.display=canvas.id===`gpu-chain-${count}`?'block':'none';},count);await page.locator(`#gpu-chain-${count}`).screenshot({path:resolve(root,'docs/architecture',`v4-gpu-scene-chain-${count}.png`)});}
} finally { await browser.close(); }
