#!/usr/bin/env node
// Exploratory benchmark only. This does not change the production renderer.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const edge = [process.env.TOSAMPOOL_EDGE_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path => path && existsSync(path));
if (!edge) throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH。');
const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(root, 'img2asset-v4-classic.html')).href + '?gpu-postprocess-benchmark=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ToSampoolRuntimeVNext?.modules?.sampling);
  const captureCell2 = process.argv.includes('--capture-cell2');
  const materialMatrix = process.argv.includes('--material-matrix');
  const scenePassA = process.argv.includes('--scene-pass-a');
  const scenePassB = process.argv.includes('--scene-pass-b');
  const scenePassC = process.argv.includes('--scene-pass-c');
  const benchmarkBase = !process.argv.includes('--materials-only') && !scenePassA && !scenePassB && !scenePassC;
  const photoData = materialMatrix || scenePassA || scenePassB || scenePassC ? `data:image/jpeg;base64,${readFileSync(resolve(root, 'examples/assets/karsten.jpg')).toString('base64')}` : '';
  const alphaData = materialMatrix || scenePassA || scenePassB || scenePassC ? `data:image/png;base64,${readFileSync(resolve(root, 'examples/assets/karsten-layer-clouds.png')).toString('base64')}` : '';
  const results = await page.evaluate(async ({ captureCell2, materialMatrix, scenePassA, scenePassB, scenePassC, benchmarkBase, photoData, alphaData }) => {
    const runtime = window.ToSampoolRuntimeVNext;
    const vertex = 'attribute vec2 a; varying vec2 uv; void main(){uv=(a+1.0)*0.5; gl_Position=vec4(a,0.0,1.0);}';
    const gradeFragment = `precision highp float; varying vec2 uv; uniform sampler2D src;
      uniform float hue, brightness, contrast, saturation;
      void main(){vec4 px=texture2D(src,uv);float cs=cos(hue),sn=sin(hue);vec3 c=px.rgb;
        vec3 g=vec3(dot(c,vec3(.213+cs*.787-sn*.213,.715-cs*.715-sn*.715,.072-cs*.072+sn*.928)),
                    dot(c,vec3(.213-cs*.213+sn*.143,.715+cs*.285+sn*.140,.072-cs*.072-sn*.283)),
                    dot(c,vec3(.213-cs*.213-sn*.787,.715-cs*.715+sn*.715,.072+cs*.928+sn*.072)));
        float l=dot(g,vec3(.2126,.7152,.0722));g=vec3(l)+(g-vec3(l))*saturation;
        gl_FragColor=vec4(clamp((g-.5019608)*contrast+.5019608+brightness,0.0,1.0),px.a);}`;
    const analysisFragment = `precision highp float; varying vec2 uv; uniform sampler2D src;
      uniform vec2 size,analysisSize; uniform float cell;
      void main(){vec2 index=floor(uv*analysisSize),base=index*cell;
        float taps=min(cell,4.0),stepSize=cell/taps,weight=0.0;vec3 sum=vec3(0.0);
        for(int y=0;y<4;y++)for(int x=0;x<4;x++){
          if(float(x)>=taps||float(y)>=taps)continue;
          vec2 pixel=min(base+(vec2(float(x),float(y))+.5)*stepSize,size-.5);
          vec4 sample=texture2D(src,(floor(pixel)+.5)/size);
          sum+=sample.rgb*sample.a;weight+=sample.a;
        }
        vec2 center=min(base+floor(cell*.5),size-.5);
        float coverage=texture2D(src,(floor(center)+.5)/size).a;
        gl_FragColor=vec4(weight>0.0?sum/weight:vec3(0.0),coverage);}`;
    const halftoneFragment = `precision highp float; varying vec2 uv; uniform sampler2D src,analysis;
      uniform vec2 size,analysisSize;uniform float cell,threshold,contrast,angle,rowOffset;
      vec2 centerFor(vec2 p,float row){float shift=mod(abs(row),2.0)*rowOffset;
        return vec2(floor(p.x/cell-shift+.5)+shift,row)*cell;}
      void main(){vec2 pixel=vec2(uv.x*size.x,(1.0-uv.y)*size.y),origin=size*.5,offset=pixel-origin;
        float cs=cos(angle),sn=sin(angle);vec2 local=vec2(offset.x*cs+offset.y*sn,-offset.x*sn+offset.y*cs);
        float row=floor(local.y/cell+.5);vec2 nearest=vec2(1e5);float best=1e10;
        for(int i=-1;i<=1;i++){vec2 p=centerFor(local,row+float(i));
          vec2 c=origin+vec2(p.x*cs-p.y*sn,p.x*sn+p.y*cs);float d=length(pixel-c);
          if(d<best){best=d;nearest=c;}}
        if(nearest.x<0.0||nearest.y<0.0||nearest.x>=size.x||nearest.y>=size.y){gl_FragColor=vec4(0.0);return;}
        vec2 index=floor(nearest/cell);vec4 info=texture2D(analysis,vec2((index.x+.5)/analysisSize.x,1.0-(index.y+.5)/analysisSize.y));
        float l=dot(info.rgb,vec3(.2126,.7152,.0722));float strength=clamp((.5-l)*contrast+threshold,0.0,1.0);
        float radius=strength*cell*.52;
        vec3 quant=floor(info.rgb*255.0/32.0)*32.0+16.0;
        float dotAlpha=1.0-smoothstep(radius-.65,radius+.65,best);
        if(cell<=2.0){dotAlpha=0.0;
          for(int sy=0;sy<4;sy++)for(int sx=0;sx<4;sx++){
            vec2 subpixel=(vec2(float(sx),float(sy))+.5)/4.0-.5;
            dotAlpha+=step(length(pixel+subpixel-nearest),radius)/16.0;
          }
        }
        float visible=step(.5,info.a)*dotAlpha*step(.15,radius);
        gl_FragColor=vec4(quant/255.0,visible);}`;
    const thresholdFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec3 darkColour,lightColour;uniform float pivot;
      void main(){vec4 p=texture2D(src,uv);float l=dot(p.rgb,vec3(.2126,.7152,.0722));
        gl_FragColor=vec4(l>=pivot?lightColour:darkColour,p.a);}`;
    const tintFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec3 tintColour;uniform float opacity;
      void main(){vec4 p=texture2D(src,uv);float layerAlpha=p.a*opacity;
        float outAlpha=layerAlpha+p.a*(1.0-layerAlpha);
        vec3 premultiplied=tintColour*layerAlpha+p.rgb*p.a*(1.0-layerAlpha);
        gl_FragColor=vec4(outAlpha>0.0?premultiplied/outAlpha:vec3(0.0),outAlpha);}`;
    const noiseFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec2 size;uniform float amount,seed;
      float hash(vec2 p){return fract(sin(dot(p+seed,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec4 p=texture2D(src,uv);vec2 cell=floor(uv*size);
        float delta=(hash(cell)*2.0-1.0)*amount;
        gl_FragColor=vec4(clamp(p.rgb+vec3(delta),0.0,1.0),p.a);}`;
    const dispersionFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec2 size,shift;uniform float strength,reach;
      float luma(vec4 p){return dot(p.rgb,vec3(.2126,.7152,.0722));}
      void main(){vec4 p=texture2D(src,uv);vec2 x=vec2(reach/size.x,0.0),y=vec2(0.0,reach/size.y);
        vec4 l=texture2D(src,clamp(uv-x,vec2(0.0),vec2(1.0))),r=texture2D(src,clamp(uv+x,vec2(0.0),vec2(1.0)));
        vec4 u=texture2D(src,clamp(uv+y,vec2(0.0),vec2(1.0))),d=texture2D(src,clamp(uv-y,vec2(0.0),vec2(1.0)));
        float edge=max(max(abs(p.a-l.a),abs(p.a-r.a)),max(abs(p.a-u.a),abs(p.a-d.a)));
        float horizontal=max(abs(luma(p)-luma(l)),abs(luma(p)-luma(r)));
        float vertical=max(abs(luma(p)-luma(u)),abs(luma(p)-luma(d)));
        edge=max(edge,step(24.0/255.0,max(horizontal,vertical)));
        vec4 plus=texture2D(src,clamp(uv+shift/size,vec2(0.0),vec2(1.0)));
        vec4 minus=texture2D(src,clamp(uv-shift/size,vec2(0.0),vec2(1.0)));
        float mixAmount=step(8.0/255.0,edge)*strength;
        vec4 candidate=vec4(plus.a>0.0?plus.r:0.0,p.g,minus.a>0.0?minus.b:0.0,max(p.a,max(plus.a,minus.a)));
        gl_FragColor=mix(p,candidate,mixAmount);}`;
    const layerFragment=`precision highp float;varying vec2 uv;uniform sampler2D src,layer;
      uniform float opacity,hard;
      void main(){vec4 base=texture2D(src,uv),pattern=texture2D(layer,uv);
        float la=pattern.a*base.a*opacity,ba=base.a,outA=la+ba*(1.0-la);
        vec3 mixed=step(vec3(1.0),base.rgb+pattern.rgb);
        vec3 normalRGB=pattern.rgb*la+base.rgb*ba*(1.0-la);
        vec3 hardRGB=la*((1.0-ba)*pattern.rgb+ba*mixed)+ba*(1.0-la)*base.rgb;
        gl_FragColor=vec4(outA>0.0?mix(normalRGB,hardRGB,hard)/max(outA,.00001):vec3(0.0),outA);}`;
    const vignetteFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec2 size;uniform vec3 colour;uniform float strength,innerRadius,outerRadius;
      void main(){vec4 base=texture2D(src,uv);vec2 pixel=uv*size;
        float radius=length(pixel-size*.5),layerAlpha=clamp((radius-innerRadius)/(outerRadius-innerRadius),0.0,1.0)*strength;
        float outAlpha=layerAlpha+base.a*(1.0-layerAlpha);
        vec3 rgb=colour*layerAlpha+base.rgb*base.a*(1.0-layerAlpha);
        gl_FragColor=vec4(outAlpha>0.0?rgb/outAlpha:vec3(0.0),outAlpha);}`;
    const paletteFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec3 palette[16];
      void main(){vec4 p=texture2D(src,uv);vec3 q=(floor(p.rgb*255.0/8.0)*8.0+4.0)/255.0;
        float best=1e10;vec3 chosen=palette[0];
        for(int i=0;i<16;i++){vec3 delta=q-palette[i];float distance=dot(delta,delta);
          if(distance<best){best=distance;chosen=palette[i];}}
        gl_FragColor=vec4(chosen,p.a);}`;
    const bandsFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec2 size;uniform vec3 bands[6];
      void main(){vec4 base=texture2D(src,uv);float row=floor((1.0-uv.y)*size.y);
        for(int i=0;i<6;i++){vec3 band=bands[i];
          if(row>=band.x&&row<band.x+band.y){vec2 sourceUV=vec2(clamp((floor(uv.x*size.x)+band.z+.5)/size.x,0.0,1.0),uv.y);
            vec4 shifted=texture2D(src,sourceUV);base.rgb=shifted.rgb;}}
        gl_FragColor=base;}`;
    const unevenFragment=`precision highp float;varying vec2 uv;uniform sampler2D src;
      uniform vec2 size;uniform float amount,coarseness,scale,contrast,seed;
      void main(){vec2 pixel=floor(vec2(uv.x*size.x,(1.0-uv.y)*size.y));
        float raw=.5+.5*sin(((pixel.x/scale)+seed*.031)*6.2831853);
        float field=.5+(raw-.5)*contrast;
        float cell=1.0+floor(clamp(field,0.0,1.0)*amount*(coarseness-1.0));
        vec2 sourcePixel=floor(pixel/cell)*cell;
        vec2 sourceUV=vec2((sourcePixel.x+.5)/size.x,1.0-(sourcePixel.y+.5)/size.y);
        gl_FragColor=texture2D(src,sourceUV);}`;
    const makeInput = (width, height, transparent=false) => {
      const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(transparent){ctx.save();ctx.beginPath();ctx.ellipse(width*.5,height*.5,width*.35,height*.35,0,0,Math.PI*2);ctx.clip();}
      const gradient=ctx.createLinearGradient(0,0,width,height);
      gradient.addColorStop(0,'#183a60');gradient.addColorStop(.36,'#e68164');gradient.addColorStop(1,'#f4e4a7');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      for(let i=0;i<36;i++){ctx.fillStyle=`hsla(${i*17%360},70%,${25+i%6*8}%,.35)`;
        ctx.fillRect((i*173)%width,(i*117)%height,Math.max(12,width/9),Math.max(8,height/13));}
      if(transparent)ctx.restore();
      return canvas;
    };
    const percentile=(values,p)=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];};
    const measure=(fn,count=10)=>{for(let i=0;i<3;i++)fn(i);const times=[];
      for(let i=0;i<count;i++){const start=performance.now();fn(i+3);times.push(performance.now()-start);}
      return {median:+percentile(times,.5).toFixed(2),p95:+percentile(times,.95).toFixed(2),samples:times.map(value=>+value.toFixed(2))};};
    const createGpu=(width,height)=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});
      if(!gl)throw new Error('WebGL 不可用');
      const compile=(kind,code)=>{const s=gl.createShader(kind);gl.shaderSource(s,code);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const vs=compile(gl.VERTEX_SHADER,vertex);
      const program=(fragment,name='shader')=>{const p=gl.createProgram();gl.attachShader(p,vs);try{gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));}catch(error){throw new Error(`${name}: ${error.message}`);}gl.linkProgram(p);
        if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;};
      const grade=program(gradeFragment),analysis=program(analysisFragment),halftone=program(halftoneFragment);
      const scenePrograms={threshold:program(thresholdFragment,'threshold'),tint:program(tintFragment,'tint'),noise:program(noiseFragment,'noise'),dispersion:program(dispersionFragment,'dispersion')};
      const layerProgram=program(layerFragment,'layer'),vignetteProgram=program(vignetteFragment,'vignette');
      const sceneProgramsC={palette:program(paletteFragment,'palette'),bands:program(bandsFragment,'bands'),uneven:program(unevenFragment,'uneven')};
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const texture=(w,h,filter)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;};
      const input=texture(width,height,gl.LINEAR),ping=texture(width,height,gl.LINEAR),pong=texture(width,height,gl.LINEAR),layerTexture=texture(width,height,gl.NEAREST);
      const fbo=gl.createFramebuffer(),sampleOutput=document.createElement('canvas');sampleOutput.width=width;sampleOutput.height=height;
      const output=sampleOutput.getContext('2d');
      const bind=(p,tex,target,w,h)=>{gl.viewport(0,0,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
        if(target){gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target,0);
          if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('FBO incomplete');}
        else gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const at=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(p,'src'),0);
      };
      const number=(p,key,value)=>gl.uniform1f(gl.getUniformLocation(p,key),value);
      const vec2=(p,key,x,y)=>gl.uniform2f(gl.getUniformLocation(p,key),x,y);
      const upload=source=>{gl.bindTexture(gl.TEXTURE_2D,input);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);};
      const finish=()=>{output.clearRect(0,0,width,height);output.drawImage(canvas,0,0);};
      const gradePass=(source,passes=1)=>{upload(source);gl.bindTexture(gl.TEXTURE_2D,input);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);let current=input;
        for(let i=0;i<passes;i++){const next=i%2?pong:ping;bind(grade,current,i===passes-1?null:next,width,height);
          number(grade,'hue',15*Math.PI/180);number(grade,'brightness',12*2.55/255);number(grade,'contrast',1.12);number(grade,'saturation',1.18);
          gl.drawArrays(gl.TRIANGLES,0,3);current=next;}
        finish();return sampleOutput;};
      const halftonePass=(source,cell=8,angle=0)=>{upload(source);gl.bindTexture(gl.TEXTURE_2D,input);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);const aw=Math.ceil(width/cell),ah=Math.ceil(height/cell);
        const analyzed=texture(aw,ah,gl.NEAREST);bind(analysis,input,analyzed,aw,ah);vec2(analysis,'size',width,height);vec2(analysis,'analysisSize',aw,ah);number(analysis,'cell',cell);
        gl.drawArrays(gl.TRIANGLES,0,3);bind(halftone,input,null,width,height);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,analyzed);gl.uniform1i(gl.getUniformLocation(halftone,'analysis'),1);
        vec2(halftone,'size',width,height);vec2(halftone,'analysisSize',aw,ah);
        number(halftone,'cell',cell);number(halftone,'threshold',.65);number(halftone,'contrast',.75);
        number(halftone,'angle',angle*Math.PI/180);number(halftone,'rowOffset',.5);
        gl.drawArrays(gl.TRIANGLES,0,3);finish();gl.deleteTexture(analyzed);return sampleOutput;};
      const scenePass=(source,effect)=>{
        upload(source);gl.bindTexture(gl.TEXTURE_2D,input);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        const p=scenePrograms[effect];bind(p,input,null,width,height);
        if(effect==='threshold'){
          gl.uniform3f(gl.getUniformLocation(p,'darkColour'),17/255,24/255,39/255);
          gl.uniform3f(gl.getUniformLocation(p,'lightColour'),244/255,232/255,207/255);
          number(p,'pivot',.5);
        }else if(effect==='tint'){
          gl.uniform3f(gl.getUniformLocation(p,'tintColour'),198/255,69/255,125/255);
          number(p,'opacity',.35);
        }else if(effect==='noise'){
          vec2(p,'size',width,height);number(p,'amount',.18);number(p,'seed',7);
        }else if(effect==='dispersion'){
          vec2(p,'size',width,height);vec2(p,'shift',2,0);number(p,'reach',2);number(p,'strength',.8);
        }
        gl.drawArrays(gl.TRIANGLES,0,3);finish();return sampleOutput;
      };
      const scenePassB=(source,effect,stamp)=>{
        upload(source);gl.bindTexture(gl.TEXTURE_2D,input);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        if(effect==='vignette'){
          bind(vignetteProgram,input,null,width,height);vec2(vignetteProgram,'size',width,height);
          gl.uniform3f(gl.getUniformLocation(vignetteProgram,'colour'),0,0,0);
          number(vignetteProgram,'strength',.45);number(vignetteProgram,'innerRadius',Math.min(width,height)*.25);number(vignetteProgram,'outerRadius',Math.max(width,height)*.8);
        }else{
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,layerTexture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,stamp);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
          bind(layerProgram,input,null,width,height);
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,layerTexture);gl.uniform1i(gl.getUniformLocation(layerProgram,'layer'),1);
          number(layerProgram,'opacity',effect==='grain'?.18:.4);number(layerProgram,'hard',effect==='hard-mix'?1:0);
        }
        gl.drawArrays(gl.TRIANGLES,0,3);finish();return sampleOutput;
      };
      const scenePassC=(source,effect,palette,bands)=>{
        upload(source);gl.bindTexture(gl.TEXTURE_2D,input);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        const p=sceneProgramsC[effect];bind(p,input,null,width,height);
        if(effect==='palette')gl.uniform3fv(gl.getUniformLocation(p,'palette[0]'),new Float32Array(palette.flat().map(value=>value/255)));
        else if(effect==='bands'){vec2(p,'size',width,height);gl.uniform3fv(gl.getUniformLocation(p,'bands[0]'),new Float32Array(bands.flat()));}
        else {vec2(p,'size',width,height);number(p,'amount',.7);number(p,'coarseness',5);number(p,'scale',48);number(p,'contrast',.5);number(p,'seed',1);}
        gl.drawArrays(gl.TRIANGLES,0,3);finish();return sampleOutput;
      };
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {gradePass,halftonePass,scenePass,scenePassB,scenePassC,output:sampleOutput,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
    };
    const gradeConfig={hue:15,brightness:12,contrast:12,saturation:18};
    const gradeCpu=(source,passes,surfaces,target)=>{let current=source;
      for(let i=0;i<passes;i++){const next=runtime.modules.sceneEffects.colorGrade(current,gradeConfig,surfaces,{preview:{pixelDivMultiplier:1}});
        if(current!==source)surfaces.release(current);current=next;}
      const ctx=target||document.createElement('canvas');if(ctx.width!==source.width)ctx.width=source.width;if(ctx.height!==source.height)ctx.height=source.height;
      const out=ctx.getContext('2d');out.clearRect(0,0,ctx.width,ctx.height);out.drawImage(current,0,0);
      if(current!==source)surfaces.release(current);return ctx;};
    const halftoneCpu=(source,cell,surfaces,angle=0,target)=>{const out=runtime.modules.sampling.apply(source,{halftone:{enabled:true,size:cell,shape:'circle',angle,rowOffset:.5,threshold:.65,contrast:.75,colorMode:'original'}},surfaces,{time:0,preview:{pixelDivMultiplier:1}});
      const copy=target||document.createElement('canvas');if(copy.width!==source.width)copy.width=source.width;if(copy.height!==source.height)copy.height=source.height;
      const ctx=copy.getContext('2d');ctx.clearRect(0,0,copy.width,copy.height);ctx.drawImage(out,0,0);
      if(out!==source)surfaces.release(out);return copy;};
    const compare=(a,b)=>{const ad=a.getContext('2d').getImageData(0,0,a.width,a.height).data,bd=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
      let total=0,large=0,occupancyA=0,occupancyB=0;const count=ad.length/4;
      for(let i=0;i<ad.length;i+=4){const err=(Math.abs(ad[i]-bd[i])+Math.abs(ad[i+1]-bd[i+1])+Math.abs(ad[i+2]-bd[i+2])+Math.abs(ad[i+3]-bd[i+3]))/4;
        total+=err;if(err>32)large++;if(ad[i+3]>127)occupancyA++;if(bd[i+3]>127)occupancyB++;}
      return {meanChannelError:+(total/count).toFixed(2),largeErrorPercent:+(large/count*100).toFixed(2),cpuCoveragePercent:+(occupancyA/count*100).toFixed(2),gpuCoveragePercent:+(occupancyB/count*100).toFixed(2)};};
    const rows=[];let renderer='';
    for(const [width,height] of benchmarkBase?[[64,64],[128,128],[256,256],[640,360],[1280,720],[1920,1080]]:[]){
      const input=makeInput(width,height),gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),cpuSink=document.createElement('canvas');
      cpuSink.width=width;cpuSink.height=height;renderer=gpu.renderer;
      for(const passes of [1,3]){
        const cpu=measure(()=>gradeCpu(input,passes,surfaces,cpuSink),width>=1920?6:10),gpuTime=measure(()=>gpu.gradePass(input,passes),width>=1920?6:10);
        const quality=compare(gradeCpu(input,passes,surfaces,cpuSink),gpu.gradePass(input,passes));
        rows.push({size:`${width}x${height}`,effect:`color-grade x${passes}`,cpu,gpu:gpuTime,quality});
      }
      const cell=8,cpu=measure(()=>halftoneCpu(input,cell,surfaces,0,cpuSink),width>=1920?6:10),gpuTime=measure(()=>gpu.halftonePass(input,cell),width>=1920?6:10),quality=compare(halftoneCpu(input,cell,surfaces,0,cpuSink),gpu.halftonePass(input,cell));
      rows.push({size:`${width}x${height}`,effect:'halftone circle original 0° cell=8',cpu,gpu:gpuTime,quality});
      if(width===640){
        for(const alternateCell of [2,16]){
          const alternateCpu=measure(()=>halftoneCpu(input,alternateCell,surfaces,0,cpuSink),8),alternateGpu=measure(()=>gpu.halftonePass(input,alternateCell),8);
          rows.push({size:`${width}x${height}`,effect:`halftone circle original 0° cell=${alternateCell}`,cpu:alternateCpu,gpu:alternateGpu,quality:compare(halftoneCpu(input,alternateCell,surfaces,0,cpuSink),gpu.halftonePass(input,alternateCell))});
          if(captureCell2&&alternateCell===2){
            const cpuFrame=halftoneCpu(input,2,surfaces,0,cpuSink),gpuFrame=gpu.halftonePass(input,2);
            const attach=(source,kind)=>{
              for(const [theme,bg] of [['','#fff'],['-dark','#15191f']]){
                const full=document.createElement('canvas');full.id=`gpu-bench-cell2-${kind}${theme}`;full.width=width;full.height=height;
                full.getContext('2d').drawImage(source,0,0);full.style.cssText=`position:fixed;left:12px;top:12px;z-index:2147483647;background:${bg};display:none`;document.body.append(full);
                const zoom=document.createElement('canvas');zoom.id=`gpu-bench-cell2-${kind}${theme}-zoom`;zoom.width=512;zoom.height=512;
                const ctx=zoom.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,512);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,240,120,64,64,0,0,512,512);
                zoom.style.cssText=`position:fixed;left:12px;top:12px;z-index:2147483647;background:${bg};display:none`;document.body.append(zoom);
              }
              const alpha=document.createElement('canvas');alpha.width=64;alpha.height=64;
              const alphaCtx=alpha.getContext('2d'),input=source.getContext('2d').getImageData(240,120,64,64),pixels=alphaCtx.createImageData(64,64);
              for(let i=0;i<input.data.length;i+=4){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=input.data[i+3];pixels.data[i+3]=255;}
              alphaCtx.putImageData(pixels,0,0);
              const alphaZoom=document.createElement('canvas');alphaZoom.id=`gpu-bench-cell2-${kind}-alpha-zoom`;alphaZoom.width=512;alphaZoom.height=512;
              const alphaOut=alphaZoom.getContext('2d');alphaOut.imageSmoothingEnabled=false;alphaOut.drawImage(alpha,0,0,512,512);
              alphaZoom.style.cssText='position:fixed;left:12px;top:12px;z-index:2147483647;background:#000;display:none';document.body.append(alphaZoom);
            };
            attach(cpuFrame,'cpu');attach(gpuFrame,'gpu');
          }
        }
        const rotatedCpu=measure(()=>halftoneCpu(input,cell,surfaces,45,cpuSink)),rotatedGpu=measure(()=>gpu.halftonePass(input,cell,45));
        rows.push({size:`${width}x${height}`,effect:'halftone circle original 45° cell=8',cpu:rotatedCpu,gpu:rotatedGpu,quality:compare(halftoneCpu(input,cell,surfaces,45,cpuSink),gpu.halftonePass(input,cell,45))});
        const cutout=makeInput(width,height,true),cutoutCpu=measure(()=>halftoneCpu(cutout,cell,surfaces,0,cpuSink)),cutoutGpu=measure(()=>gpu.halftonePass(cutout,cell));
        rows.push({size:`${width}x${height}`,effect:'halftone transparent object 0° cell=8',cpu:cutoutCpu,gpu:cutoutGpu,quality:compare(halftoneCpu(cutout,cell,surfaces,0,cpuSink),gpu.halftonePass(cutout,cell))});
      }
    }
    const materialRows=[],sceneRows=[],sceneRowsB=[],sceneRowsC=[];
    if(materialMatrix){
      const width=640,height=360,gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),cpuSink=document.createElement('canvas');
      renderer=gpu.renderer;
      cpuSink.width=width;cpuSink.height=height;
      const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('素材读取失败'));image.src=src;});
      const photo=await loadImage(photoData),clouds=await loadImage(alphaData);
      const fixture=(kind)=>{
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d');
        if(kind==='photo')ctx.drawImage(photo,0,0,width,height);
        else if(kind==='alpha-image')ctx.drawImage(clouds,0,0,width,height);
        else if(kind==='vector'){
          ctx.fillStyle='#ebd9a1';ctx.fillRect(85,65,470,230);
          ctx.fillStyle='#1c5270';ctx.beginPath();ctx.arc(255,180,92,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#ef815c';ctx.beginPath();ctx.moveTo(300,270);ctx.lineTo(520,95);ctx.lineTo(535,270);ctx.closePath();ctx.fill();
          ctx.clearRect(345,155,62,55);
        }else if(kind==='text'){
          ctx.fillStyle='#f3ead0';ctx.font='bold 158px Arial';ctx.textBaseline='middle';ctx.fillText('SAMPLE',20,185);
          ctx.font='bold 35px Arial';ctx.fillText('TO SAMP  /  2026',88,293);
        }
        return canvas;
      };
      for(const kind of ['photo','alpha-image','vector','text']){
        const input=fixture(kind);
        for(const cell of [2,8]){
          const cpu=halftoneCpu(input,cell,surfaces,0),gpuFrame=gpu.halftonePass(input,cell),quality=compare(cpu,gpuFrame);
          const benchmarkCpu=measure(()=>halftoneCpu(input,cell,surfaces,0,cpuSink),8),benchmarkGpu=measure(()=>gpu.halftonePass(input,cell),8);
          const comparison=document.createElement('canvas');comparison.id=`gpu-material-${kind}-${cell}`;
          comparison.width=width*2;comparison.height=height*2;
          const out=comparison.getContext('2d');out.fillStyle='#f5f1e8';out.fillRect(0,0,comparison.width,height);
          out.fillStyle='#1b2029';out.fillRect(0,height,comparison.width,height);
          for(const [frame,x] of [[cpu,0],[gpuFrame,width]]){out.drawImage(frame,x,0);out.drawImage(frame,x,height);}
          comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);
          materialRows.push({kind,cell,cpu:benchmarkCpu,gpu:benchmarkGpu,quality});
        }
      }
    }
    if(scenePassA){
      const width=640,height=360,gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),cpuSink=document.createElement('canvas');
      cpuSink.width=width;cpuSink.height=height;renderer=gpu.renderer;
      const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('场景素材读取失败'));image.src=src;});
      const photo=await loadImage(photoData),clouds=await loadImage(alphaData),frame={time:0,preview:{pixelDivMultiplier:1}};
      const cpuEffect=(source,effect,target)=>{
        const config=effect==='threshold'?{threshold:{enabled:true,threshold:.5,dark:'#111827',light:'#f4e8cf'}}:
          effect==='noise'?{'noise-dither':{enabled:true,amount:18,size:1,seed:7,colorMode:'mono'}}:
          {'edge-dispersion':{enabled:true,distance:2,strength:.8,angle:0,width:1,source:'auto',order:'rgb'}};
        const result=effect==='tint'?runtime.modules.decorate.apply(source,{'tint-overlay':{enabled:true,color:'#c6457d',alpha:.35,blend:'normal'}},surfaces,frame):runtime.modules.sampling.apply(source,config,surfaces,frame);
        const output=target||document.createElement('canvas');if(output.width!==width)output.width=width;if(output.height!==height)output.height=height;
        const ctx=output.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(result,0,0);
        if(result!==source)surfaces.release(result);return output;
      };
      for(const [kind,image] of [['photo',photo],['alpha-image',clouds]]){
        const input=document.createElement('canvas');input.width=width;input.height=height;input.getContext('2d').drawImage(image,0,0,width,height);
        for(const effect of ['threshold','noise','tint','dispersion']){
          const cpuFrame=cpuEffect(input,effect),gpuFrame=gpu.scenePass(input,effect),quality=compare(cpuFrame,gpuFrame);
          const cpu=measure(()=>cpuEffect(input,effect,cpuSink),6),gpuTime=measure(()=>gpu.scenePass(input,effect),6);
          const comparison=document.createElement('canvas');comparison.id=`gpu-scene-a-${kind}-${effect}`;
          comparison.width=width*2;comparison.height=height*2;
          const ctx=comparison.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,comparison.width,height);
          ctx.fillStyle='#1b2029';ctx.fillRect(0,height,comparison.width,height);
          for(const [source,x] of [[cpuFrame,0],[gpuFrame,width]]){ctx.drawImage(source,x,0);ctx.drawImage(source,x,height);}
          comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);
          sceneRows.push({kind,effect,cpu,gpu:gpuTime,quality});
        }
      }
    }
    if(scenePassB){
      const width=640,height=360,gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),cpuSink=document.createElement('canvas');
      cpuSink.width=width;cpuSink.height=height;renderer=gpu.renderer;
      const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('场景素材读取失败'));image.src=src;});
      const photo=await loadImage(photoData),clouds=await loadImage(alphaData),frame={time:0,preview:{pixelDivMultiplier:1}};
      const bayer=runtime.modules.pattern.bayer(4),grain={enabled:true,amount:.18,size:2,seed:7,colorMode:'mono',blend:'normal'};
      const dotted={enabled:true,texture:'dots',spacing:8,size:2,shape:'circle',layout:'regular',color:'#edc981',alpha:.4,blend:'normal'};
      const hard=Object.assign({},dotted,{texture:'custom',tileWidth:bayer.tileWidth,tileHeight:bayer.tileHeight,tileScale:1,tileScaleMode:'pixel',tilePixels:bayer.tilePixels,blend:'hard-mix'});
      const vignette={enabled:true,strength:.45,inner:.25,outer:.8,color:'#000000',blend:'normal'};
      const configs={grain:{'grain-overlay':grain},texture:{'texture-overlay':dotted},'hard-mix':{'texture-overlay':hard}};
      const stampFor=effect=>effect==='grain'?runtime.modules.grain.frame(width,height,grain,0):runtime.modules.pattern.texture(width,height,runtime.modules.pattern.overlay(effect==='hard-mix'?hard:dotted),'#edc981',{time:0,dynamic:false});
      const cpuEffect=(source,effect,target)=>{
        const result=effect==='vignette'?runtime.modules.sceneEffects.maskedInnerLight(source,vignette,{},frame,surfaces):runtime.modules.decorate.apply(source,configs[effect],surfaces,frame);
        const output=target||document.createElement('canvas');if(output.width!==width)output.width=width;if(output.height!==height)output.height=height;
        const ctx=output.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(result,0,0);
        if(result!==source)surfaces.release(result);return output;
      };
      for(const [kind,image] of [['photo',photo],['alpha-image',clouds]]){
        const input=document.createElement('canvas');input.width=width;input.height=height;input.getContext('2d').drawImage(image,0,0,width,height);
        for(const effect of ['grain','texture','vignette','hard-mix']){
          const stamp=effect==='vignette'?null:stampFor(effect);
          const cpuFrame=cpuEffect(input,effect),gpuFrame=gpu.scenePassB(input,effect,stamp),quality=compare(cpuFrame,gpuFrame);
          const cpu=measure(()=>cpuEffect(input,effect,cpuSink),6),gpuTime=measure(()=>gpu.scenePassB(input,effect,stamp),6);
          const comparison=document.createElement('canvas');comparison.id=`gpu-scene-b-${kind}-${effect}`;
          comparison.width=width*2;comparison.height=height*2;
          const ctx=comparison.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,comparison.width,height);
          ctx.fillStyle='#1b2029';ctx.fillRect(0,height,comparison.width,height);
          for(const [source,x] of [[cpuFrame,0],[gpuFrame,width]]){ctx.drawImage(source,x,0);ctx.drawImage(source,x,height);}
          comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);
          sceneRowsB.push({kind,effect,cpu,gpu:gpuTime,quality});
        }
      }
    }
    if(scenePassC){
      const width=640,height=360,gpu=createGpu(width,height),surfaces=runtime.modules.surfaces.create(),cpuSink=document.createElement('canvas');
      cpuSink.width=width;cpuSink.height=height;renderer=gpu.renderer;
      const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('场景素材读取失败'));image.src=src;});
      const photo=await loadImage(photoData),clouds=await loadImage(alphaData),frame={time:0,preview:{pixelDivMultiplier:1}},palette=runtime.modules.sampling.palettes.nes;
      const bands=Array.from({length:6},(_,index)=>[Math.floor(runtime.modules.sampling.hash(index,11,7,0)*357),3,Math.round((runtime.modules.sampling.hash(index,23,7,0)*2-1)*4)]);
      const group={
        palette:{'color-map':{enabled:true,palette:'nes',colors:16}},
        bands:{'offset-sampling':{enabled:true,type:'bands',seed:7,bands:{orientation:'horizontal',count:6,thickness:3,offset:4,channels:'combined'},motion:{enabled:false}}},
        uneven:{'uneven-sampling':{enabled:true,amount:.7,coarseness:5,field:{enabled:true,type:'wave',scale:48,contrast:.5,seed:1,direction:0},edge:{mode:'off'}}},
        halftone:{halftone:{enabled:true,size:8,shape:'circle',angle:0,rowOffset:.5,threshold:.65,contrast:.75,colorMode:'original'}}
      };
      const cpuEffect=(source,effect,target)=>{
        const result=runtime.modules.sampling.apply(source,group[effect],surfaces,frame);
        const output=target||document.createElement('canvas');if(output.width!==width)output.width=width;if(output.height!==height)output.height=height;
        const ctx=output.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(result,0,0);
        if(result!==source)surfaces.release(result);return output;
      };
      const gpuEffect=(source,effect)=>effect==='halftone'?gpu.halftonePass(source,8):gpu.scenePassC(source,effect,palette,bands);
      for(const [kind,image] of [['photo',photo],['alpha-image',clouds]]){
        const input=document.createElement('canvas');input.width=width;input.height=height;input.getContext('2d').drawImage(image,0,0,width,height);
        for(const effect of ['palette','bands','uneven','halftone']){
          const cpuFrame=cpuEffect(input,effect),gpuFrame=gpuEffect(input,effect),quality=compare(cpuFrame,gpuFrame);
          const cpu=measure(()=>cpuEffect(input,effect,cpuSink),6),gpuTime=measure(()=>gpuEffect(input,effect),6);
          const comparison=document.createElement('canvas');comparison.id=`gpu-scene-c-${kind}-${effect}`;
          comparison.width=width*2;comparison.height=height*2;
          const ctx=comparison.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,comparison.width,height);
          ctx.fillStyle='#1b2029';ctx.fillRect(0,height,comparison.width,height);
          for(const [source,x] of [[cpuFrame,0],[gpuFrame,width]]){ctx.drawImage(source,x,0);ctx.drawImage(source,x,height);}
          comparison.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;display:none';document.body.append(comparison);
          sceneRowsC.push({kind,effect,cpu,gpu:gpuTime,quality});
        }
      }
    }
    return {renderer,userAgent:navigator.userAgent,rows,materialRows,sceneRows,sceneRowsB,sceneRowsC};
  }, { captureCell2, materialMatrix, scenePassA, scenePassB, scenePassC, benchmarkBase, photoData, alphaData });
  for(const row of results.rows.filter(item=>item.effect.startsWith('color-grade'))){
    assert.ok(row.quality.meanChannelError<.5,`${row.size} ${row.effect} 的 GPU 调色结果偏离 CPU`);
  }
  for(const row of results.rows.filter(item=>item.effect.includes('cell=8')&&item.size==='640x360')){
    assert.ok(Math.abs(row.quality.cpuCoveragePercent-row.quality.gpuCoveragePercent)<2,`${row.effect} 的网点面积明显偏离 CPU`);
  }
  if(process.argv.includes('--raw'))console.log(JSON.stringify(results,null,2));
  else if(process.argv.includes('--materials-only'))console.log(JSON.stringify({renderer:results.renderer,materialRows:results.materialRows.map(row=>({kind:row.kind,cell:row.cell,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality}))},null,2));
  else if(scenePassA)console.log(JSON.stringify({renderer:results.renderer,sceneRows:results.sceneRows.map(row=>({kind:row.kind,effect:row.effect,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality}))},null,2));
  else if(scenePassB)console.log(JSON.stringify({renderer:results.renderer,sceneRowsB:results.sceneRowsB.map(row=>({kind:row.kind,effect:row.effect,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality}))},null,2));
  else if(scenePassC)console.log(JSON.stringify({renderer:results.renderer,sceneRowsC:results.sceneRowsC.map(row=>({kind:row.kind,effect:row.effect,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality}))},null,2));
  else console.log(JSON.stringify({renderer:results.renderer,rows:results.rows.map(row=>({size:row.size,effect:row.effect,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality})),materialRows:results.materialRows.map(row=>({kind:row.kind,cell:row.cell,cpuMedianMs:row.cpu.median,cpuP95Ms:row.cpu.p95,gpuMedianMs:row.gpu.median,gpuP95Ms:row.gpu.p95,quality:row.quality}))},null,2));
  if(materialMatrix){
    for(const row of results.materialRows){
      const id=`gpu-material-${row.kind}-${row.cell}`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-material-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-gpu-halftone-${row.kind}-cell${row.cell}.png`)});
    }
  }
  if(scenePassA){
    for(const row of results.sceneRows){
      const id=`gpu-scene-a-${row.kind}-${row.effect}`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-scene-a-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-gpu-scene-a-${row.kind}-${row.effect}.png`)});
    }
  }
  if(scenePassB){
    for(const row of results.sceneRowsB){
      const id=`gpu-scene-b-${row.kind}-${row.effect}`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-scene-b-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-gpu-scene-b-${row.kind}-${row.effect}.png`)});
    }
  }
  if(scenePassC){
    for(const row of results.sceneRowsC){
      const id=`gpu-scene-c-${row.kind}-${row.effect}`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-scene-c-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-gpu-scene-c-${row.kind}-${row.effect}.png`)});
    }
  }
  if(captureCell2){
    for(const kind of ['cpu','gpu'])for(const theme of ['', '-dark'])for(const zoom of ['', '-zoom']){
      const id=`gpu-bench-cell2-${kind}${theme}${zoom}`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-bench-cell2-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-halftone-cell2-${kind}${theme}${zoom}.png`)});
    }
    for(const kind of ['cpu','gpu']){
      const id=`gpu-bench-cell2-${kind}-alpha-zoom`;
      await page.evaluate(selected=>{for(const canvas of document.querySelectorAll('[id^="gpu-bench-cell2-"]'))canvas.style.display=canvas.id===selected?'block':'none';},id);
      await page.locator(`#${id}`).screenshot({path:resolve(root,'docs/architecture',`v4-halftone-cell2-${kind}-alpha-zoom.png`)});
    }
  }
} finally {
  await browser.close();
}
