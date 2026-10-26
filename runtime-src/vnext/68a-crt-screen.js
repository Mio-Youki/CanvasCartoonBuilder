/* Scene-only CRT display sampling. The optional GPU pass has a Canvas 2D fallback. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, +value || 0));
  const presets = Object.freeze({
    default: Object.freeze({curvature:.12,scanline:.28,scanlinePitch:3,phosphor:.22,rgbShift:1.3,glow:.18,vignette:.32,noise:.012,flicker:.018,sweep:.04,colorMode:'color',phosphorColor:'#b8ffc8'}),
    'monochrome-green': Object.freeze({curvature:.08,scanline:.18,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.28,vignette:.3,noise:.01,flicker:.012,sweep:.025,colorMode:'mono',phosphorColor:'#70ff9a'}),
    'green-scanlines': Object.freeze({curvature:.1,scanline:.48,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.25,vignette:.36,noise:.018,flicker:.025,sweep:.06,colorMode:'mono',phosphorColor:'#5eff8c'}),
    apple: Object.freeze({curvature:.16,scanline:.22,scanlinePitch:4,phosphor:0,rgbShift:0,glow:.26,vignette:.38,noise:.016,flicker:.018,sweep:.03,colorMode:'mono',phosphorColor:'#ffb860'}),
    vintage: Object.freeze({curvature:.2,scanline:.34,scanlinePitch:3,phosphor:.12,rgbShift:.8,glow:.22,vignette:.48,noise:.03,flicker:.03,sweep:.045,colorMode:'color',phosphorColor:'#ffe4ad'}),
    'ibm-3278': Object.freeze({curvature:.06,scanline:.13,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.14,vignette:.2,noise:.006,flicker:.006,sweep:0,colorMode:'mono',phosphorColor:'#57e78b'}),
    futuristic: Object.freeze({curvature:.14,scanline:.24,scanlinePitch:2,phosphor:.32,rgbShift:2.2,glow:.4,vignette:.26,noise:.02,flicker:.022,sweep:.075,colorMode:'color',phosphorColor:'#8afff5'}),
  });
  const gpuBySurfaces = new WeakMap();
  let backend = 'auto',lastBackend = null;
  // Smallest centred uniform crop whose warped corners still sample the image.
  // For scale s=1/zoom: s + .48*curvature*s^3 = 1. No extra surface/pass.
  function fitScale(curvature,mask){
    if(mask&&mask.type&&mask.type!=='none')return 1;
    const curve=Math.max(0,+curvature||0);if(!curve)return 1;
    let lo=0,hi=1;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(mid+.48*curve*mid**3>1)hi=mid;else lo=mid;}return lo;
  }
  function color(hex) {
    const raw=String(hex||'#ffffff').replace('#','');
    if(raw.length===3)return [0,1,2].map(index=>parseInt(raw[index]+raw[index],16)/255);
    if(!/^[0-9a-f]{6}$/i.test(raw))return [1,1,1];
    return [0,2,4].map(index=>parseInt(raw.slice(index,index+2),16)/255);
  }
  function options(config) {
    const preset=presets[config.theme]||presets.default;
    const motion=config.motion||{},enabled=motion.enabled===true,period=Math.max(.05,+motion.period||2),phase=enabled?((+config.time||0)/period%1+1)%1:0;
    return Object.assign({seed:1},preset,config,{fitScale:fitScale(config.curvature??preset.curvature,config.mask),scanlinePitch:Math.max(1,+config.scanlinePitch||preset.scanlinePitch),phosphorColor:color(config.phosphorColor||preset.phosphorColor),motionPhase:phase,motionTick:enabled?Math.floor(phase*Math.max(1,Math.round(+motion.steps||12))):0,scanlineDrift:enabled?Math.max(0,+motion.scanlineDrift||0):0});
  }
  const vertex='attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}';
  const fragment=`precision mediump float;
    varying vec2 vUv; uniform sampler2D uImage; uniform vec2 uSize; uniform vec3 uTint;
    uniform float uPhase,uTick,uLineTravel,uSeed,uCurve,uFit,uLines,uPitch,uMask,uShift,uGlow,uVignette,uNoise,uFlicker,uSweep,uMono;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*17.13)*43758.5453);}
    void main(){
      vec2 center=vUv*2.0-1.0;vec2 sampleCenter=center*uFit;vec2 warped=0.5+sampleCenter*0.5+sampleCenter*dot(sampleCenter,sampleCenter)*uCurve*0.12;
      if(warped.x<0.0||warped.x>1.0||warped.y<0.0||warped.y>1.0){gl_FragColor=vec4(0.0);return;}
      vec2 offset=vec2(uShift/uSize.x,0.0);
      vec4 base=texture2D(uImage,warped);
      vec3 rgb=vec3(texture2D(uImage,warped+offset).r,base.g,texture2D(uImage,warped-offset).b);
      float lum=dot(rgb,vec3(0.2126,0.7152,0.0722));rgb=mix(rgb,lum*uTint,uMono);
      float light=(sin(warped.y*uSize.y*6.2831853/uPitch+uPhase*6.2831853*uLineTravel)+1.0)*0.5;
      rgb*=1.0-uLines*(1.0-light);
      float phase=mod(gl_FragCoord.x,3.0);vec3 grille=phase<1.0?vec3(1.0,.73,.73):(phase<2.0?vec3(.73,1.0,.73):vec3(.73,.73,1.0));
      rgb*=mix(vec3(1.0),grille,uMask*(1.0-uMono));
      vec2 d=vec2(1.5/uSize.x,1.5/uSize.y);
      vec3 bloom=(texture2D(uImage,warped+vec2(d.x,0.0)).rgb+texture2D(uImage,warped-vec2(d.x,0.0)).rgb+texture2D(uImage,warped+vec2(0.0,d.y)).rgb+texture2D(uImage,warped-vec2(0.0,d.y)).rgb)*0.25;
      rgb+=max(bloom-vec3(.25),vec3(0.0))*uGlow*.55;
      float edge=clamp((length(center)-.3)/1.1,0.0,1.0);rgb*=1.0-uVignette*edge*edge;
      float band=exp(-pow((fract(warped.y-uPhase)-.15)*18.0,2.0));rgb+=base.rgb*band*uSweep;
      float flick=1.0-uFlicker*(.5+.5*sin(uPhase*6.2831853));rgb*=flick;
      float grain=hash(floor(gl_FragCoord.xy)+uTick*vec2(19.0,31.0))-.5;rgb+=grain*uNoise;
      gl_FragColor=vec4(clamp(rgb,0.0,1.0),base.a);
    }`;
  function shader(gl,type,source){const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(value)||'CRT shader compilation failed');return value;}
  function gpuSurface(width,height){
    const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(width,height):null;
    if(!canvas)return null;canvas.width=width;canvas.height=height;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});if(!gl)return null;
    const vert=shader(gl,gl.VERTEX_SHADER,vertex),frag=shader(gl,gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'CRT shader link failed');
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return {canvas,gl,program,texture,width,height};
  }
  function renderGpu(source,out,opts,surfaces){
    let gpu=gpuBySurfaces.get(surfaces);
    if(!gpu||gpu.width!==source.width||gpu.height!==source.height){gpu=gpuSurface(source.width,source.height);if(!gpu)return false;gpuBySurfaces.set(surfaces,gpu);}
    const {gl,program,texture,canvas}=gpu;if(gl.isContextLost())return false;
    gl.viewport(0,0,source.width,source.height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    const uniform=(name,...values)=>{const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]);else if(values.length===2)gl.uniform2f(location,...values);else gl.uniform3f(location,...values);};
    gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);uniform('uSize',source.width,source.height);uniform('uTint',...opts.phosphorColor);uniform('uPhase',opts.motionPhase);uniform('uTick',opts.motionTick);uniform('uLineTravel',opts.scanlineDrift);uniform('uSeed',opts.seed);uniform('uCurve',opts.curvature);uniform('uLines',opts.scanline);uniform('uPitch',opts.scanlinePitch);uniform('uMask',opts.phosphor);uniform('uShift',opts.rgbShift);uniform('uGlow',opts.glow);uniform('uVignette',opts.vignette);uniform('uNoise',opts.noise);uniform('uFlicker',opts.flicker);uniform('uSweep',opts.sweep);uniform('uMono',opts.colorMode==='mono'?1:0);
    uniform('uFit',opts.fitScale);
    gl.drawArrays(gl.TRIANGLES,0,3);const ctx=out.getContext('2d');ctx.clearRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0);return true;
  }
  function renderCpu(source,out,opts,surfaces){
    const width=source.width,height=source.height,from=source.getContext('2d').getImageData(0,0,width,height).data,ctx=out.getContext('2d'),image=ctx.createImageData(width,height),to=image.data,tint=opts.phosphorColor;
    const sample=(x,y,channel)=>{const sx=Math.max(0,Math.min(width-1,Math.round(x))),sy=Math.max(0,Math.min(height-1,Math.round(y)));return from[(sy*width+sx)*4+channel];};
    const tick=opts.motionTick,seed=opts.seed|0,phase=opts.motionPhase;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const cx=(x+.5)/width*2-1,cy=(y+.5)/height*2-1,radius=cx*cx+cy*cy,sx0=cx*opts.fitScale,sy0=cy*opts.fitScale,sampleRadius=sx0*sx0+sy0*sy0,wx=(.5+sx0*.5+sx0*sampleRadius*opts.curvature*.12)*width,wy=(.5+sy0*.5+sy0*sampleRadius*opts.curvature*.12)*height,index=(y*width+x)*4;
      if(wx<0||wx>=width||wy<0||wy>=height)continue;
      const sx=Math.max(0,Math.min(width-1,Math.round(wx))),sy=Math.max(0,Math.min(height-1,Math.round(wy))),origin=(sy*width+sx)*4,alpha=from[origin+3];if(!alpha)continue;
      let red=sample(wx+opts.rgbShift,wy,0),green=from[origin+1],blue=sample(wx-opts.rgbShift,wy,2);
      if(opts.colorMode==='mono'){const luminance=(red*.2126+green*.7152+blue*.0722);red=luminance*tint[0];green=luminance*tint[1];blue=luminance*tint[2];}
      const line=(Math.sin((wy/opts.scanlinePitch)*Math.PI*2+phase*Math.PI*2*opts.scanlineDrift)+1)*.5,dim=1-opts.scanline*(1-line),mask=opts.colorMode==='mono'?0:opts.phosphor,channel=x%3,grille=[channel===0?1:.73,channel===1?1:.73,channel===2?1:.73];
      const edge=Math.max(0,Math.min(1,(Math.sqrt(radius)-.3)/1.1)),flick=1-opts.flicker*(.5+.5*Math.sin(phase*Math.PI*2)),band=Math.exp(-Math.pow((((wy/height-phase)%1+1)%1)-.15,2)*324)*opts.sweep;
      const bloom=opts.glow?Math.max(0,((sample(wx+2,wy,0)+sample(wx-2,wy,0)+sample(wx,wy+2,0)+sample(wx,wy-2,0))*.25)-64)*opts.glow*.55:0;
      let hash=(x*374761393+y*668265263+tick*1442695041+seed*1274126177)|0;hash=Math.imul(hash^(hash>>>13),1274126177);const noise=(((hash^(hash>>>16))>>>0)/4294967295-.5)*opts.noise*255;
      const shade=dim*(1-opts.vignette*edge*edge)*flick;
      to[index]=Math.max(0,Math.min(255,red*shade*(1-mask+mask*grille[0])+bloom+red*band+noise));to[index+1]=Math.max(0,Math.min(255,green*shade*(1-mask+mask*grille[1])+bloom+green*band+noise));to[index+2]=Math.max(0,Math.min(255,blue*shade*(1-mask+mask*grille[2])+bloom+blue*band+noise));to[index+3]=alpha;
    }
    ctx.putImageData(image,0,0);surfaces.notePixels?.(width,height,1);
  }
  function apply(source,config,surfaces,frame){
    const opts=options(Object.assign({},config,{time:frame&&frame.time||0})),out=surfaces.acquire(source.width,source.height);
    try{if(backend!=='cpu'){try{if(renderGpu(source,out,opts,surfaces)){lastBackend='gpu';return out;}if(backend==='gpu')throw new Error('CRT WebGL 不可用');}catch(error){if(backend==='gpu')throw error;}}renderCpu(source,out,opts,surfaces);lastBackend='cpu';return out;}
    catch(error){surfaces.release(out);throw error;}
  }
  api.modules.crtScreen=Object.freeze({apply,presets,fitScale,setBackend(value){backend=['auto','cpu','gpu'].includes(value)?value:'auto';},getBackend(){return backend;},getLastBackend(){return lastBackend;}});
})(typeof window!=='undefined'?window:globalThis);
