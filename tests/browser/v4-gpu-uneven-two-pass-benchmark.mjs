#!/usr/bin/env node
// Compare 1080p full-resolution recomputation with low-resolution effect + upscale.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const browser=await chromium.launch({executablePath:edge,headless:true});
const includeSceneChain=process.argv.includes('--scene-chain');
const includeSecondMask=includeSceneChain&&process.argv.includes('--two-masks');
const includeDualScene=includeSceneChain&&process.argv.includes('--dual-scene');
const fusedOnly=includeDualScene&&process.argv.includes('--fused-only');
const includeFused=includeSceneChain&&(process.argv.includes('--fused')||fusedOnly);
const gpuDownsample=includeFused&&process.argv.includes('--gpu-downsample');
const frameCount=Math.max(48,Math.min(3600,Math.round(Number(process.argv.find(arg=>arg.startsWith('--frames='))?.split('=')[1])||48)));
const transitionType=process.argv.find(arg=>arg.startsWith('--transition='))?.split('=')[1]||'fade';
assert.ok(['fade','wipe','dissolve'].includes(transitionType),'unsupported transition');
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-uneven-two-pass=1',{waitUntil:'domcontentloaded'});
  if(includeSceneChain)await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.sampling?.apply);
  const result=await page.evaluate(async({includeSceneChain,includeSecondMask,includeDualScene,includeFused,transitionType,fusedOnly,gpuDownsample,frameCount})=>{
    const lastFrame=frameCount-1;
    const W=1920,H=1080,grid=3,lowW=W/grid,lowH=H/grid,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.style.width='960px';canvas.style.height='540px';document.body.append(canvas);
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL2 unavailable');
    const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if(!timer)throw new Error('GPU timer queries are required for this benchmark');
    const vertex='#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
    const effectFragment=`#version 300 es
      precision highp float;uniform sampler2D src;uniform vec2 size;uniform float grid,outputHeight,flow,mode;out vec4 outColor;
      vec4 pixel(vec2 p){return texture(src,vec2((p.x+.5)/size.x,1.0-(p.y+.5)/size.y));}
      void main(){vec2 outPixel=floor(vec2(gl_FragCoord.x-.5,outputHeight-gl_FragCoord.y-.5));vec2 p=floor(outPixel/grid);
        float raw=.5+.5*sin((p.x/63.0-flow+5.0*.031)*6.28318530718),field=.5+(raw-.5)*.8;
        if(mode>.5){float dist=min(min(p.x,p.y),min(size.x-1.0-p.x,size.y-1.0-p.y));
          for(int dy=-3;dy<=3;dy++)for(int dx=-3;dx<=3;dx++){
            vec2 q=p+vec2(float(dx),float(dy));float d=abs(float(dx))+abs(float(dy));
            if(d>=dist||q.x<0.0||q.y<0.0||q.x>=size.x||q.y>=size.y)continue;
            if(pixel(q).a<8.0/255.0)dist=d;
          }
          float near=clamp(1.0-dist/2.0,0.0,1.0);field=.5+(field-.5)*(1.0-near);
        }
        float cell=1.0+floor(clamp(field,0.0,1.0)*.85*4.0);outColor=pixel(floor(p/cell)*cell);}`;
    const upscaleFragment=`#version 300 es
      precision highp float;uniform sampler2D src;uniform vec2 fullSize;out vec4 outColor;
      void main(){outColor=texture(src,gl_FragCoord.xy/fullSize);}`;
    const maskFragment=`#version 300 es
      precision highp float;uniform sampler2D baseTex,effectTex,maskTex;uniform vec2 fullSize;out vec4 outColor;
      void main(){vec2 uv=gl_FragCoord.xy/fullSize;vec4 base=texture(baseTex,uv),effect=texture(effectTex,uv);float layer=effect.a*texture(maskTex,uv).a,outA=layer+base.a*(1.0-layer);vec3 rgb=effect.rgb*layer+base.rgb*base.a*(1.0-layer);outColor=vec4(outA>0.0?rgb/outA:vec3(0.0),outA);}`;
    const tintFragment=`#version 300 es
      precision highp float;uniform sampler2D src;uniform vec2 fullSize;out vec4 outColor;
      void main(){vec4 p=texture(src,gl_FragCoord.xy/fullSize);float layer=p.a*.35,outA=layer+p.a*(1.0-layer);vec3 rgb=vec3(198.0,69.0,125.0)/255.0*layer+p.rgb*p.a*(1.0-layer);outColor=vec4(outA>0.0?rgb/outA:vec3(0.0),outA);}`;
    const fusedFragment=`#version 300 es
      precision highp float;uniform sampler2D baseTex,lowEffect,maskTex,secondMaskTex;uniform vec2 fullSize;uniform bool secondMask;out vec4 outColor;
      vec4 quantize(vec4 p){return floor(clamp(p,0.0,1.0)*255.0+.5)/255.0;}
      vec4 over(vec4 base,vec4 layer){float a=layer.a+base.a*(1.0-layer.a);return vec4(a>0.0?(layer.rgb*layer.a+base.rgb*base.a*(1.0-layer.a))/a:vec3(0.0),a);}
      void main(){vec2 uv=gl_FragCoord.xy/fullSize;vec4 base=texture(baseTex,uv),sampled=texture(lowEffect,uv);sampled.a*=texture(maskTex,uv).a;vec4 merged=quantize(over(base,sampled));vec4 tinted=quantize(over(merged,vec4(vec3(198.0,69.0,125.0)/255.0,merged.a*.35)));if(secondMask){tinted.a*=texture(secondMaskTex,uv).a;outColor=over(merged,tinted);}else outColor=tinted;}`;
    const transitionFragment=`#version 300 es
      precision highp float;precision highp int;uniform sampler2D previousScene,currentScene;uniform vec2 fullSize;uniform int transitionMode;out vec4 outColor;
      float hashCell(uvec2 p){uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^10u*69069u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.0;}
      void main(){vec2 uv=gl_FragCoord.xy/fullSize;vec4 previous=texture(previousScene,uv),current=texture(currentScene,uv);float cover=.55;if(transitionMode==1)cover=gl_FragCoord.x>=floor(fullSize.x*.45)?1.0:0.0;else if(transitionMode==2){uvec2 cell=uvec2(floor(vec2(gl_FragCoord.x,fullSize.y-gl_FragCoord.y)/16.0));cover=hashCell(cell)>.45?1.0:0.0;}float layer=previous.a*cover,outA=layer+current.a*(1.0-layer);vec3 rgb=previous.rgb*layer+current.rgb*current.a*(1.0-layer);outColor=vec4(outA>0.0?rgb/outA:vec3(0.0),outA);}`;
    const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const vs=compile(gl.VERTEX_SHADER,vertex),createProgram=fragment=>{const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;},effect=createProgram(effectFragment),upscale=createProgram(upscaleFragment),maskProgram=includeSceneChain&&!fusedOnly?createProgram(maskFragment):null,tintProgram=includeSceneChain&&!fusedOnly?createProgram(tintFragment):null,transitionProgram=includeDualScene?createProgram(transitionFragment):null,fusedProgram=includeFused?createProgram(fusedFragment):null;
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const bind=p=>{gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);};
    let texturesAllocated=0;
    const texture=(w,h)=>{const t=gl.createTexture();texturesAllocated++;gl.bindTexture(gl.TEXTURE_2D,t);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;};
    const input=texture(lowW,lowH),processed=texture(lowW,lowH),fullInput=includeSceneChain?texture(W,H):null,maskInput=includeSceneChain?texture(W,H):null,effectFull=includeSceneChain&&!fusedOnly?texture(W,H):null,composited=includeSceneChain&&!fusedOnly?texture(W,H):null,mask2Input=includeSecondMask?texture(W,H):null,tintOutput=includeSecondMask&&!fusedOnly?texture(W,H):null,previousScene=includeDualScene?texture(W,H):null,currentScene=includeDualScene?texture(W,H):null,fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,processed,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('FBO incomplete');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    const full=document.createElement('canvas');full.width=W;full.height=H;const fullCtx=full.getContext('2d'),work=document.createElement('canvas');work.width=lowW;work.height=lowH;const workCtx=work.getContext('2d');workCtx.imageSmoothingEnabled=false;const maskCanvas=includeSceneChain?document.createElement('canvas'):null,mask2Canvas=includeSecondMask?document.createElement('canvas'):null;for(const c of [maskCanvas,mask2Canvas])if(c){c.width=W;c.height=H;}
    const drawInput=frame=>{const x=180+Math.sin(frame*.14)*100;fullCtx.clearRect(0,0,W,H);const g=fullCtx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#135079');g.addColorStop(.5,'#e38a64');g.addColorStop(1,'#f4dfa6');fullCtx.fillStyle=g;fullCtx.beginPath();fullCtx.ellipse(W*.5+x,H*.5,W*.33,H*.34,0,0,Math.PI*2);fullCtx.fill();if(!gpuDownsample){workCtx.clearRect(0,0,lowW,lowH);workCtx.drawImage(full,0,0,lowW,lowH);}if(maskCanvas){const ctx=maskCanvas.getContext('2d');ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(W*.55-x*.16,H*.52,W*.25,H*.3,0,0,Math.PI*2);ctx.fill();}if(mask2Canvas){const ctx=mask2Canvas.getContext('2d');ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(W*.41+Math.sin(frame*.1)*70,H*.48,W*.22,H*.38,0,0,Math.PI*2);ctx.fill();}};
    const render=(strategy,mode,frame,target=null)=>{
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);if(!gpuDownsample){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,work);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}
      if(includeSceneChain){for(const [target,source] of [[fullInput,full],[maskInput,maskCanvas],...(includeSecondMask?[[mask2Input,mask2Canvas]]:[])]){gl.bindTexture(gl.TEXTURE_2D,target);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}gl.bindTexture(gl.TEXTURE_2D,input);}
      if(gpuDownsample){gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,input,0);gl.viewport(0,0,lowW,lowH);bind(upscale);gl.bindTexture(gl.TEXTURE_2D,fullInput);gl.uniform1i(gl.getUniformLocation(upscale,'src'),0);gl.uniform2f(gl.getUniformLocation(upscale,'fullSize'),lowW,lowH);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindTexture(gl.TEXTURE_2D,input);}
      bind(effect);gl.uniform1i(gl.getUniformLocation(effect,'src'),0);gl.uniform2f(gl.getUniformLocation(effect,'size'),lowW,lowH);gl.uniform1f(gl.getUniformLocation(effect,'grid'),strategy==='one'?grid:1);gl.uniform1f(gl.getUniformLocation(effect,'outputHeight'),strategy==='one'?H:lowH);gl.uniform1f(gl.getUniformLocation(effect,'flow'),Math.floor(frame/3)/24);gl.uniform1f(gl.getUniformLocation(effect,'mode'),mode);
      if(strategy==='fused'){
        gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,processed,0);gl.viewport(0,0,lowW,lowH);gl.drawArrays(gl.TRIANGLES,0,3);
        gl.bindFramebuffer(gl.FRAMEBUFFER,target?fbo:null);if(target)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target,0);gl.viewport(0,0,W,H);bind(fusedProgram);
        for(const [unit,tex,name] of [[0,fullInput,'baseTex'],[1,processed,'lowEffect'],[2,maskInput,'maskTex'],[3,mask2Input||maskInput,'secondMaskTex']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(fusedProgram,name),unit);}gl.uniform2f(gl.getUniformLocation(fusedProgram,'fullSize'),W,H);gl.uniform1i(gl.getUniformLocation(fusedProgram,'secondMask'),includeSecondMask?1:0);gl.drawArrays(gl.TRIANGLES,0,3);return;
      }
      if(strategy==='one'){gl.bindFramebuffer(gl.FRAMEBUFFER,includeSceneChain?fbo:null);if(includeSceneChain)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,effectFull,0);gl.viewport(0,0,W,H);gl.drawArrays(gl.TRIANGLES,0,3);}
      else{gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,processed,0);gl.viewport(0,0,lowW,lowH);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindFramebuffer(gl.FRAMEBUFFER,includeSceneChain?fbo:null);if(includeSceneChain)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,effectFull,0);gl.viewport(0,0,W,H);bind(upscale);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,processed);gl.uniform1i(gl.getUniformLocation(upscale,'src'),0);gl.uniform2f(gl.getUniformLocation(upscale,'fullSize'),W,H);gl.drawArrays(gl.TRIANGLES,0,3);}
      if(includeSceneChain){const drawMasked=(base,effected,mask,target)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,target?fbo:null);if(target)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target,0);gl.viewport(0,0,W,H);bind(maskProgram);for(const [unit,tex,name] of [[0,base,'baseTex'],[1,effected,'effectTex'],[2,mask,'maskTex']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(maskProgram,name),unit);}gl.uniform2f(gl.getUniformLocation(maskProgram,'fullSize'),W,H);gl.drawArrays(gl.TRIANGLES,0,3);};drawMasked(fullInput,effectFull,maskInput,composited);gl.bindFramebuffer(gl.FRAMEBUFFER,includeSecondMask?fbo:null);if(includeSecondMask)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tintOutput,0);gl.viewport(0,0,W,H);bind(tintProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,composited);gl.uniform1i(gl.getUniformLocation(tintProgram,'src'),0);gl.uniform2f(gl.getUniformLocation(tintProgram,'fullSize'),W,H);gl.drawArrays(gl.TRIANGLES,0,3);if(includeSecondMask)drawMasked(composited,tintOutput,mask2Input,null);}
    };
    const copyScene=target=>{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,target);gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,W,H);};
    const drawTransition=()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);bind(transitionProgram);for(const [unit,tex,name] of [[0,previousScene,'previousScene'],[1,currentScene,'currentScene']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(transitionProgram,name),unit);}gl.uniform2f(gl.getUniformLocation(transitionProgram,'fullSize'),W,H);gl.uniform1i(gl.getUniformLocation(transitionProgram,'transitionMode'),transitionType==='wipe'?1:transitionType==='dissolve'?2:0);gl.drawArrays(gl.TRIANGLES,0,3);};
    const percentile=(values,p)=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];};
    const summary=values=>values.length?{median:+percentile(values,.5).toFixed(2),p95:+percentile(values,.95).toFixed(2),max:+Math.max(...values).toFixed(2)}:null;
    const rows=[],captures={};
    const strategies=fusedOnly?['fused']:includeFused?['one','two','fused']:['one','two'];
    for(const mode of [0,1])for(const strategy of strategies){
      const main=[],gaps=[],queries=[];let previous=0;
      const allocatedBefore=texturesAllocated;
      for(let frame=0;frame<frameCount;frame++){
        const now=await new Promise(requestAnimationFrame);if(previous&&frame>=8)gaps.push(now-previous);previous=now;
        const start=performance.now();drawInput(frame);let q=null;if(timer){q=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,q);}render(strategy,mode,frame,includeDualScene&&strategy==='fused'?previousScene:null);if(includeDualScene){if(strategy!=='fused')copyScene(previousScene);drawInput(frame+11);render(strategy,mode,frame+11,strategy==='fused'?currentScene:null);if(strategy!=='fused')copyScene(currentScene);drawTransition();}if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(q);}if(frame>=8)main.push(performance.now()-start);
      }
      gl.finish();await new Promise(resolve=>setTimeout(resolve,100));const gpu=[],disjoint=timer?gl.getParameter(timer.GPU_DISJOINT_EXT):null;
      for(let i=0;i<queries.length;i++){const q=queries[i];if(i>=8&&!disjoint&&gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
      const pixels=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,pixels);captures[`${mode}-${strategy}`]=pixels;
      if(includeSceneChain&&strategy==='two'){const effectPixels=new Uint8Array(W*H*4);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,effectFull,0);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,effectPixels);gl.bindFramebuffer(gl.FRAMEBUFFER,null);captures[`${mode}-effect`]=effectPixels;}
      const thirds=Array.from({length:3},(_,i)=>{const part=(values)=>values.slice(Math.floor(i*values.length/3),Math.floor((i+1)*values.length/3));const frameGaps=part(gaps);return{part:i+1,gpuQueryMs:summary(part(gpu)),mainThreadMs:summary(part(main)),frameGapMs:summary(frameGaps),over25msPercent:+(frameGaps.filter(value=>value>25).length/frameGaps.length*100).toFixed(2)};});
      rows.push({mode:mode?'contour':'off',strategy,mainThreadMs:summary(main),gpuQueryMs:summary(gpu),frameGapMs:summary(gaps),over25msPercent:+(gaps.filter(value=>value>25).length/gaps.length*100).toFixed(2),thirds,querySamples:gpu.length,disjoint,glError:gl.getError(),contextLost:gl.isContextLost(),texturesAllocatedDuringPlayback:texturesAllocated-allocatedBefore});
    }
    const visual=[];if(!fusedOnly)for(const mode of [0,1]){const left=captures[`${mode}-one`],right=captures[`${mode}-two`];let sum=0,changed=0,alpha=0;for(let i=0;i<left.length;i+=4){const d=Math.abs(left[i]-right[i])+Math.abs(left[i+1]-right[i+1])+Math.abs(left[i+2]-right[i+2]);sum+=d;alpha+=Math.abs(left[i+3]-right[i+3]);if(d||left[i+3]!==right[i+3])changed++;}visual.push({mode:mode?'contour':'off',meanRgb:+(sum/(W*H*3)).toFixed(4),meanAlpha:+(alpha/(W*H)).toFixed(4),changedPercent:+(changed/(W*H)*100).toFixed(4)});}
    const fusedVisual=[];if(includeFused&&!fusedOnly)for(const mode of [0,1]){const left=captures[`${mode}-two`],right=captures[`${mode}-fused`];let rgb=0,alpha=0,changed=0;for(let i=0;i<left.length;i+=4){const d=Math.abs(left[i]-right[i])+Math.abs(left[i+1]-right[i+1])+Math.abs(left[i+2]-right[i+2]);rgb+=d;alpha+=Math.abs(left[i+3]-right[i+3]);if(d||left[i+3]!==right[i+3])changed++;}fusedVisual.push({mode:mode?'contour':'off',meanRgb:+(rgb/(W*H*3)).toFixed(4),meanAlpha:+(alpha/(W*H)).toFixed(4),changedPercent:+(changed/(W*H)*100).toFixed(4)});}
    const impact=[];for(const strategy of strategies){const off=captures[`0-${strategy}`],contour=captures[`1-${strategy}`];let changed=0,opaque=0;for(let i=0;i<off.length;i+=4){if(off[i]!==contour[i]||off[i+1]!==contour[i+1]||off[i+2]!==contour[i+2]||off[i+3]!==contour[i+3])changed++;if(off[i+3]>0)opaque++;}impact.push({strategy,contourChangedPercent:+(changed/(W*H)*100).toFixed(4),visiblePercent:+(opaque/(W*H)*100).toFixed(4)});}
    const formal=[];
    if(includeSceneChain&&!includeDualScene){
      const rt=window.ToSampoolRuntimeVNext;
      for(const mode of [0,1]){
        const surfaces=rt.modules.surfaces.create();surfaces.beginFrame();
        const cfg={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:'wave',scale:63,contrast:.8,seed:5,direction:0},edge:{mode:mode?'contour':'off',width:2},motion:{enabled:true,type:'uneven-motion',period:3,steps:24,flowSpeed:1,tideAmount:0}};
        const sampled=rt.modules.sampling.apply(full,{controllers:{'sampling-grid':{size:grid}},'uneven-sampling':cfg},surfaces,{time:lastFrame/24,preview:{pixelDivMultiplier:1}});
        const cpuEffect=sampled.getContext('2d').getImageData(0,0,W,H).data,gpuEffect=captures[`${mode}-effect`];let effectRgb=0,effectAlpha=0,effectLarge=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=(y*W+x)*4,b=((H-1-y)*W+x)*4,dr=Math.abs(cpuEffect[a]-gpuEffect[b]),dg=Math.abs(cpuEffect[a+1]-gpuEffect[b+1]),db=Math.abs(cpuEffect[a+2]-gpuEffect[b+2]),da=Math.abs(cpuEffect[a+3]-gpuEffect[b+3]);effectRgb+=dr+dg+db;effectAlpha+=da;if(Math.max(dr,dg,db,da)>2)effectLarge++;}
        const masked=document.createElement('canvas');masked.width=W;masked.height=H;const maskedCtx=masked.getContext('2d');maskedCtx.drawImage(sampled,0,0);maskedCtx.globalCompositeOperation='destination-in';maskedCtx.drawImage(maskCanvas,0,0);maskedCtx.globalCompositeOperation='source-over';
        const merged=document.createElement('canvas');merged.width=W;merged.height=H;const mergedCtx=merged.getContext('2d');mergedCtx.drawImage(full,0,0);mergedCtx.drawImage(masked,0,0);
        const tinted=rt.modules.decorate.apply(merged,{'tint-overlay':{enabled:true,color:'#c6457d',alpha:.35,blend:'normal'}},surfaces,{time:lastFrame/24});let formalOutput=tinted;
        if(includeSecondMask){const clipped=document.createElement('canvas');clipped.width=W;clipped.height=H;const clip=clipped.getContext('2d');clip.drawImage(tinted,0,0);clip.globalCompositeOperation='destination-in';clip.drawImage(mask2Canvas,0,0);clip.globalCompositeOperation='source-over';formalOutput=document.createElement('canvas');formalOutput.width=W;formalOutput.height=H;const out=formalOutput.getContext('2d');out.drawImage(merged,0,0);out.drawImage(clipped,0,0);}
        const cpu=formalOutput.getContext('2d').getImageData(0,0,W,H).data,gpu=captures[`${mode}-${includeFused?'fused':'two'}`];let rgb=0,alpha=0,changed=0,large=0,max=0,visible=0,largeVisible=0,maxVisible=0,opaque=0,largeOpaque=0,maxOpaque=0;const examples=[];
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=(y*W+x)*4,b=((H-1-y)*W+x)*4,dr=Math.abs(cpu[a]-gpu[b]),dg=Math.abs(cpu[a+1]-gpu[b+1]),db=Math.abs(cpu[a+2]-gpu[b+2]),da=Math.abs(cpu[a+3]-gpu[b+3]),d=dr+dg+db,worst=Math.max(dr,dg,db,da);rgb+=d;alpha+=da;if(d||da)changed++;if(worst>2)large++;max=Math.max(max,worst);if(Math.max(cpu[a+3],gpu[b+3])>8){visible++;if(worst>2)largeVisible++;maxVisible=Math.max(maxVisible,worst);}if(Math.min(cpu[a+3],gpu[b+3])>128){opaque++;if(worst>2)largeOpaque++;maxOpaque=Math.max(maxOpaque,worst);if(worst>32&&examples.length<3)examples.push({x,y,cpu:Array.from(cpu.slice(a,a+4)),gpu:Array.from(gpu.slice(b,b+4))});}}
        formal.push({mode:mode?'contour':'off',effectMeanRgb:+(effectRgb/(W*H*3)).toFixed(4),effectMeanAlpha:+(effectAlpha/(W*H)).toFixed(4),effectOverTwoPercent:+(effectLarge/(W*H)*100).toFixed(4),meanRgb:+(rgb/(W*H*3)).toFixed(4),meanAlpha:+(alpha/(W*H)).toFixed(4),changedPercent:+(changed/(W*H)*100).toFixed(4),overTwoPercent:+(large/(W*H)*100).toFixed(4),overTwoVisiblePercent:+(largeVisible/visible*100).toFixed(4),overTwoOpaquePercent:+(largeOpaque/opaque*100).toFixed(4),maxChannelDifference:max,maxVisibleChannelDifference:maxVisible,maxOpaqueChannelDifference:maxOpaque,examples});
      }
    }
    if(includeDualScene){
      const rt=window.ToSampoolRuntimeVNext,formScene=(mode,frame)=>{
        drawInput(frame);const surfaces=rt.modules.surfaces.create();surfaces.beginFrame();const cfg={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:'wave',scale:63,contrast:.8,seed:5,direction:0},edge:{mode:mode?'contour':'off',width:2},motion:{enabled:true,type:'uneven-motion',period:3,steps:24,flowSpeed:1,tideAmount:0}},sampled=rt.modules.sampling.apply(full,{controllers:{'sampling-grid':{size:grid}},'uneven-sampling':cfg},surfaces,{time:frame/24,preview:{pixelDivMultiplier:1}});
        const clip=(source,mask)=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);return c;},composite=(base,overlay)=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.drawImage(base,0,0);ctx.drawImage(overlay,0,0);return c;};
        const merged=composite(full,clip(sampled,maskCanvas)),tinted=rt.modules.decorate.apply(merged,{'tint-overlay':{enabled:true,color:'#c6457d',alpha:.35,blend:'normal'}},surfaces,{time:frame/24});return includeSecondMask?composite(merged,clip(tinted,mask2Canvas)):tinted;
      };
      for(const mode of [0,1]){
        const previous=formScene(mode,lastFrame),current=formScene(mode,lastFrame+11),prevEarlier=formScene(mode,lastFrame-1),currEarlier=formScene(mode,lastFrame+10),expected=document.createElement('canvas');expected.width=W;expected.height=H;const ctx=expected.getContext('2d');ctx.drawImage(current,0,0);
        const scene=rt.modules.scene.normalize({format:'tosampool-scene/v4',width:W,height:H,loop:2,entities:[],timeline:{scenes:[{id:'a',f:[0,.5]},{id:'b',f:[.5,1],transition:{type:transitionType,duration:1,direction:'right',cell:16,seed:9}}]}});rt.modules.renderer.drawTransition(ctx,scene,rt.modules.frame.create(scene,1.45),previous);
        const cpu=ctx.getImageData(0,0,W,H).data,gpu=captures[`${mode}-${includeFused?'fused':'two'}`],difference=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,W,H).data,y=b.getContext('2d').getImageData(0,0,W,H).data;let sum=0;for(let i=0;i<x.length;i+=4)sum+=Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]);return +(sum/(W*H*3)).toFixed(4);};let rgb=0,alpha=0,visible=0,largeVisible=0;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=(y*W+x)*4,b=((H-1-y)*W+x)*4,dr=Math.abs(cpu[a]-gpu[b]),dg=Math.abs(cpu[a+1]-gpu[b+1]),db=Math.abs(cpu[a+2]-gpu[b+2]),da=Math.abs(cpu[a+3]-gpu[b+3]);rgb+=dr+dg+db;alpha+=da;if(Math.max(cpu[a+3],gpu[b+3])>8){visible++;if(Math.max(dr,dg,db,da)>2)largeVisible++;}}
        formal.push({mode:mode?'contour':'off',meanRgb:+(rgb/(W*H*3)).toFixed(4),meanAlpha:+(alpha/(W*H)).toFixed(4),overTwoVisiblePercent:+(largeVisible/visible*100).toFixed(4),previousClockDifference:difference(previous,prevEarlier),currentClockDifference:difference(current,currEarlier)});
      }
    }
    const offscreenBytes=(includeSceneChain?includeSecondMask?6:4:0)*W*H*4+2*lowW*lowH*4+(includeDualScene?2*W*H*4:0);
    const fusedBytes=((includeSecondMask?3:2)+(includeDualScene?2:0))*W*H*4+2*lowW*lowH*4;
    const debug=gl.getExtension('WEBGL_debug_renderer_info');return{sceneChain:includeSceneChain,secondMask:includeSecondMask,dualScene:includeDualScene,transitionType,fusedOnly,gpuDownsample,frameCount,texturesAllocated,uploadsPerFrame:(includeDualScene?2:1)*(includeSceneChain?(includeSecondMask?3:2)+(gpuDownsample?0:1):1),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),offscreenTextureMiB:+((fusedOnly?fusedBytes:offscreenBytes)/1048576).toFixed(2),fusedActiveTextureMiB:includeFused?+(fusedBytes/1048576).toFixed(2):null,rows,visual,fusedVisual,impact,formal};
  },{includeSceneChain,includeSecondMask,includeDualScene,includeFused,transitionType,fusedOnly,gpuDownsample,frameCount});
  assert.ok(result.rows.every(row=>row.glError===0&&!row.disjoint&&!row.contextLost&&row.texturesAllocatedDuringPlayback===0&&row.querySamples>(frameCount-8)*.9));
  assert.ok(result.visual.every(row=>row.changedPercent===0),'two-pass and one-pass output differ');
  assert.ok(result.fusedVisual.every(row=>row.meanRgb<.1&&row.meanAlpha<.01),'fused stages differ from separate GPU passes');
  assert.ok(result.impact.every(row=>row.visiblePercent>1&&row.contourChangedPercent>0),'test fixture is blank or edge mode is inactive');
  if(includeSceneChain&&!includeDualScene)assert.ok(result.formal.every(row=>row.effectMeanRgb===0&&row.effectMeanAlpha===0&&row.meanRgb<.1&&row.meanAlpha<.01&&row.overTwoVisiblePercent<.1),'scene chain drifted from formal Runtime');
  if(includeDualScene)assert.ok(result.formal.every(row=>row.meanRgb<.1&&row.meanAlpha<.01&&row.previousClockDifference>.01&&row.currentClockDifference>.01),'dual Scene transition drifted or one side froze');
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
