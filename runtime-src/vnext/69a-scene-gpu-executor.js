/* Opt-in scene GPU executor. Unsupported complete chains fall back before upload. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  function fallback(reason) {
    const result={handled:false,reason};
    const capabilities=api.modules.backendCapabilities;
    if(capabilities)result.diagnostic=capabilities.diagnose(reason);
    return result;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const thresholdBoundaries=new Map();
  const tintTables=new Map();
  function tintTable(config){
    const opacity=clamp(Number.isFinite(+config.alpha)?+config.alpha:1,0,1),color=config.color||'#000000',key=JSON.stringify([color,opacity]);
    if(tintTables.has(key))return {key,data:tintTables.get(key)};
    // Source-in depends only on source Alpha. Preserve the host's CSS colour,
    // colour Alpha and globalAlpha rounding with a 256-pixel synthetic atlas.
    const atlas=canvas(256,1),ctx=atlas.getContext('2d'),image=ctx.createImageData(256,1);
    for(let a=0;a<256;a++)image.data.set([255,255,255,a],a*4);
    ctx.putImageData(image,0,0);ctx.globalCompositeOperation='source-in';ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.fillRect(0,0,256,1);
    const bytes=ctx.getImageData(0,0,256,1).data,data=new Uint8Array(1024);
    for(let a=0;a<256;a++){for(let k=0;k<3;k++)data[a*4+k]=Math.floor((bytes[a*4+k]*bytes[a*4+3]+127)/255);data[a*4+3]=bytes[a*4+3];}
    tintTables.set(key,data);if(tintTables.size>8)tintTables.delete(tintTables.keys().next().value);return {key,data};
  }
  let alphaDecodeBytes=null;
  let lumaProductBytes=null;
  function lumaProducts(){
    if(lumaProductBytes)return lumaProductBytes;
    // Store the actual JS-double products as unsigned integers in units of
    // 2^-56. GLSL then rounds each addition/subtraction to 53 significant bits.
    // This preserves the CPU's strict >24 contrast test, including grey ties.
    const data=new Uint32Array(256*3*2),weights=[.2126,.7152,.0722];
    for(let channel=0;channel<3;channel++)for(let c=0;c<256;c++){
      const value=BigInt((c*weights[channel])*2**56),at=(channel*256+c)*2;
      data[at]=Number(value&0xffffffffn);data[at+1]=Number(value>>32n);
    }
    lumaProductBytes=data;return data;
  }
  function alphaDecodeTable(){
    if(alphaDecodeBytes)return alphaDecodeBytes;
    // Calibrate Canvas's byte unpremultiplication once, without source images
    // or GPU readback. Half ties are host-dependent (round(c*255/a) is NOT
    // equivalent). Every valid premultiplied byte is represented in this atlas.
    const atlas=canvas(256,256),ctx=atlas.getContext('2d'),input=ctx.createImageData(256,256);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++)input.data.set([c,c,c,a],(a*256+c)*4);
    ctx.putImageData(input,0,0);const output=ctx.getImageData(0,0,256,256).data,table=new Uint8Array(65536);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++)table[a*256+Math.floor((c*a+127)/255)]=output[(a*256+c)*4];
    alphaDecodeBytes=table;return table;
  }
  function thresholdBoundary(config,time){
    const motion=config.motion||{},pulse=motion.enabled?(+motion.amount||0)*api.modules.motion.oscillate(motion,time,{stepped:true,frames:12}):0;
    const pivot=clamp((config.threshold==null?.5:+config.threshold)+pulse,0,1)*255,cutoff=Math.ceil(pivot*10000);
    const key=String(pivot);if(thresholdBoundaries.has(key))return thresholdBoundaries.get(key);
    const dark=[];
    // CPU uses JS doubles: at exact byte-luma ties its decimal additions can
    // fall just below the pivot. Enumerate ONLY those ties, not 16M colours.
    // 1063*r+3576*g+361*b=cutoff/2; inverse(3576 mod 361)=138.
    if(cutoff%2===0)for(let r=0;r<256;r++){
      const rhs=cutoff/2-1063*r,g=((rhs*138)%361+361)%361,b=(rhs-3576*g)/361;
      if(g<256&&b>=0&&b<256&&Number.isInteger(b)&&r*.2126+g*.7152+b*.0722<pivot)dark.push((r<<16)|(g<<8)|b);
    }
    const value={cutoff,dark},packed=new Int32Array(256).fill(-1);
    // At most one exact tie per red byte: a 1KB uniform table avoids a
    // per-pixel linear scan on large, flat fills at the threshold boundary.
    for(const code of dark)packed[code>>>16]=code;
    Object.defineProperty(value,'packed',{value:packed});thresholdBoundaries.set(key,value);
    if(thresholdBoundaries.size>16)thresholdBoundaries.delete(thresholdBoundaries.keys().next().value);return value;
  }
  function canvas(width, height) {
    if (typeof document !== 'undefined' && document.createElement) {
      const output = document.createElement('canvas'); output.width = width; output.height = height; return output;
    }
    return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : null;
  }
  function plan(scene, frame) {
    let uneven = null, threshold = null, noiseDither = null, dispersion = null, tint = null;
    for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
      for (const [id, base] of Object.entries(scene.sceneEffects[stage] || {})) {
        if (id === 'controllers' || !base || !base.enabled) continue;
        const value = frame.effectValuesFor('scene', stage, id, base);
        if (!value.enabled) continue;
        if(stage==='overlay'&&id==='tint-overlay'){
          const mode=api.modules.blend.toCanvas(value.blend);
          if(!['source-over','screen','lighter'].includes(mode))return {reason:`unsupported-tint-blend:${value.blend}`};
          if(value.color!=null&&typeof value.color!=='string')return {reason:'unsupported-tint-paint'};
          tint=api.modules.decorate.animated(id,value,frame.time);continue;
        }
        if (stage !== 'sample' || !['noise-dither','threshold','uneven-sampling','edge-dispersion'].includes(id)) return { reason: `unsupported-effect:${id}` };
        if(id==='threshold')threshold=value;else if(id==='noise-dither')noiseDither=value;else if(id==='edge-dispersion')dispersion=value;else uneven=value;
      }
    }
    const raw = scene.sceneEffects.sample && scene.sceneEffects.sample.controllers || {};
    if (Object.keys(raw).some(id => id !== 'sampling-grid')) return { reason: 'unsupported-controller' };
    const gridConfig = raw['sampling-grid'] ? frame.controllerValuesFor('scene', 'sample', 'sampling-grid', raw['sampling-grid']) : {};
    if ((gridConfig.alphaMode || 'keep') !== 'keep') return { reason: 'unsupported-grid-alpha' };
    const grid = Math.max(1, Math.round(+gridConfig.size || 1)) * frame.preview.pixelDivMultiplier;
    if (!uneven && !threshold && !noiseDither && !dispersion && !tint && grid === 1) return { reason: 'no-supported-effect' };
    // (2*p+1)*from stays within signed highp int for extents <=32768.
    // This is a backend condition, never a restriction on product dimensions.
    if(scene.width>32768||scene.height>32768)return {reason:'unsupported-resample-range'};
    const field = uneven && uneven.field || {};
    if (uneven && !['wave', 'radial', 'noise'].includes(field.type || 'wave')) return { reason: 'unsupported-field' };
    const noiseScale=Math.max(4,+field.scale||48);
    if(field.type==='noise'&&(!Number.isInteger(noiseScale)||noiseScale>16777216))return {reason:'unsupported-noise-scale'};
    if (uneven && uneven.edge && (uneven.edge.mode || 'off') !== 'off') return { reason: 'unsupported-edge' };
    if(dispersion&&(!Number.isFinite(+dispersion.angle||0)||Math.max(+dispersion.distance||0,+dispersion.width||1)>16777216))return {reason:'unsupported-dispersion-range'};
    const boundary=threshold?thresholdBoundary(threshold,frame.time):null;
    // Match sceneEffects.applyStage's fixed order, not object insertion order.
    // Each card resamples and composites its OWN range before the next card.
    const passes=[];
    if(tint)passes.push({kind:'tint',config:tint});
    if(noiseDither)passes.push({kind:'noise',config:noiseDither});
    if(threshold)passes.push({kind:'threshold',config:threshold,boundary});
    if(uneven)passes.push({kind:'uneven',config:uneven});
    if(dispersion)passes.push({kind:'dispersion',config:dispersion});
    if(!passes.length||(tint&&passes.length===1&&grid>1))passes.push({kind:'grid',config:{}});
    return { grid, uneven, threshold, noiseDither, dispersion, tint, field, passes, count:passes.length };
  }
  const vertex = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  const alphaShader=`uniform highp usampler2D alphaBytes;
    ivec4 bytes(vec4 c){return ivec4(floor(c*255.0+.5));}
    ivec3 straight(ivec4 c){return ivec3(int(texelFetch(alphaBytes,ivec2(c.r,c.a),0).r),int(texelFetch(alphaBytes,ivec2(c.g,c.a),0).r),int(texelFetch(alphaBytes,ivec2(c.b,c.a),0).r));}
    vec4 premultiplied(ivec3 rgb,int a){return vec4(vec3((rgb*a+127)/255),float(a))/255.0;}`;
  const fieldFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform vec2 size,center;uniform float scale,contrast,flow,amount,span,angle,waveSeed;
    uniform uint seed,tick;uniform int fieldType;out vec4 outputColor;
    uniform bool thresholding;uniform vec3 darkColor,lightColor;uniform int thresholdCutoff,tieCount;uniform ivec4 tieDarkByRed[64];
    ${alphaShader}
    float noise(uvec2 p){uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^(seed+1u)*69069u^(tick+1u)*362437u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.0;}
    void main(){vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));float raw=.5;
      if(thresholding){ivec4 c=bytes(texture(source,vec2((p.x+.5)/size.x,1.0-(p.y+.5)/size.y)));ivec3 b=straight(c);int luma=b.r*2126+b.g*7152+b.b*722;bool bright=luma>=thresholdCutoff;if(luma==thresholdCutoff&&tieCount>0){int code=(b.r<<16)|(b.g<<8)|b.b;if(tieDarkByRed[b.r>>2][b.r&3]==code)bright=false;}outputColor=premultiplied(ivec3(floor((bright?lightColor:darkColor)*255.0+.5)),c.a);return;}
      if(fieldType==1)raw=.5+.5*sin(((p.x*cos(angle)+p.y*sin(angle))/scale-flow+waveSeed*.031)*6.28318530718);
      else if(fieldType==2)raw=.5+.5*sin((length(p-center)/scale-flow+waveSeed*.031)*6.28318530718);
      else if(fieldType==3)raw=noise(uvec2(ivec2(p)/int(scale)));
      int cell=1+int(floor(clamp(.5+(raw-.5)*contrast,0.0,1.0)*amount*span));vec2 q=vec2((ivec2(p)/cell)*cell);
      outputColor=texture(source,vec2((q.x+.5)/size.x,1.0-(q.y+.5)/size.y));}`;
  const nearestShader=`ivec2 nearestPixel(ivec2 p,ivec2 from,ivec2 to){return ((p*2+1)*from)/(to*2);}`;
  const mappedNearestShader=`uniform highp usampler2D nativeNearest;uniform ivec2 nearestLowExtent;
    ivec2 nearestPixel(ivec2 p,ivec2 from,ivec2 to){
      if(all(equal(from,to)))return p;
      int row=all(equal(to,nearestLowExtent))?0:2;
      return ivec2(int(texelFetch(nativeNearest,ivec2(p.x,row),0).r),int(texelFetch(nativeNearest,ivec2(p.y,row+1),0).r));
    }`;
  const resampleFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform vec2 size;out vec4 outputColor;
    ${nearestShader}
    void main(){ivec2 from=textureSize(source,0);vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));ivec2 q=nearestPixel(ivec2(p),from,ivec2(size));outputColor=texelFetch(source,ivec2(q.x,from.y-1-q.y),0);}`;
  // A static GF(2) jump table maps a row's initial xorshift state directly to
  // byte N. It contains no random frames and is independent of seed/time.
  // Eight integer texture reads replace an O(x) sequential PRNG loop.
  const noiseFragment = `#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D jumps,byteMap;uniform vec2 size;
    uniform uint seed,tick;uniform int grain,channels;uniform float amplitude;
    out vec4 outputColor;
    ${alphaShader}
    uint sampleByte(int x,int y,int channel){
      uint state=(seed+1u)*0x9e3779b1u^(tick+1u)*0x85ebca6bu^uint(y+1)*0xc2b2ae35u;
      if(state==0u)state=1u;uint value=0u;
      for(int block=0;block<8;block++){
        uvec4 basis=texelFetch(jumps,ivec2(x,channel*8+block),0);
        uint bits=(state>>uint(block*4))&15u;
        if((bits&1u)!=0u)value^=basis.x;if((bits&2u)!=0u)value^=basis.y;
        if((bits&4u)!=0u)value^=basis.z;if((bits&8u)!=0u)value^=basis.w;
      }return value&255u;
    }
    void main(){ivec2 p=ivec2(floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y)));
      vec4 pixel=texelFetch(source,ivec2(p.x,int(size.y)-1-p.y),0);
      if(pixel.a==0.0||amplitude==0.0){outputColor=pixel;return;}
      ivec2 cell=p/grain;vec3 n=vec3(float(sampleByte(cell.x,cell.y,0)));
      if(channels==3){n.g=float(sampleByte(cell.x,cell.y,1));n.b=float(sampleByte(cell.x,cell.y,2));}
      ivec4 c=bytes(pixel);ivec3 b=straight(c);
      outputColor=premultiplied(ivec3(int(texelFetch(byteMap,ivec2(b.r,int(n.r)),0).r),int(texelFetch(byteMap,ivec2(b.g,int(n.g)),0).r),int(texelFetch(byteMap,ivec2(b.b,int(n.b)),0).r)),c.a);
    }`;
  const dispersionFragment=`#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D lumaProducts,mixBytes;
    uniform ivec2 extent,delta;uniform int reach,edgeMode;uniform bool reverse,noOp;
    out vec4 outputColor;
    ${alphaShader}
    uvec2 add64(uvec2 a,uvec2 b){uint low=a.x+b.x;return uvec2(low,a.y+b.y+uint(low<a.x));}
    uvec2 rounded(uvec2 value){
      uint high=value.y;if(high==0u)return value;int top=0;
      if(high>=65536u){top+=16;high>>=16u;}if(high>=256u){top+=8;high>>=8u;}
      if(high>=16u){top+=4;high>>=4u;}if(high>=4u){top+=2;high>>=2u;}if(high>=2u)top++;
      int shift=top-20;if(shift<=0)return value;
      uint mask=(1u<<uint(shift))-1u,remainder=value.x&mask,midpoint=1u<<uint(shift-1);
      if(remainder>midpoint||(remainder==midpoint&&((value.x>>uint(shift))&1u)==1u))value=add64(value,uvec2(1u<<uint(shift),0u));
      value.x&=~mask;return value;
    }
    uvec2 luma(ivec3 c){uvec2 r=texelFetch(lumaProducts,ivec2(c.r,0),0).rg,g=texelFetch(lumaProducts,ivec2(c.g,1),0).rg,b=texelFetch(lumaProducts,ivec2(c.b,2),0).rg;return rounded(add64(rounded(add64(r,g)),b));}
    bool contrast(uvec2 a,uvec2 b){
      if(a.y<b.y||(a.y==b.y&&a.x<b.x)){uvec2 t=a;a=b;b=t;}
      uvec2 d=rounded(uvec2(a.x-b.x,a.y-b.y-uint(a.x<b.x)));
      return d.y>0x18000000u||(d.y==0x18000000u&&d.x>0u);
    }
    bool valid(ivec2 p){return p.x>=0&&p.y>=0&&p.x<extent.x&&p.y<extent.y;}
    ivec4 readAt(ivec2 p){return valid(p)?bytes(texelFetch(source,ivec2(p.x,extent.y-1-p.y),0)):ivec4(0);}
    int mixed(int a,int b){return int(texelFetch(mixBytes,ivec2(a,b),0).r);}
    void main(){
      ivec2 p=ivec2(floor(vec2(gl_FragCoord.x,float(extent.y)-gl_FragCoord.y)));ivec4 base=readAt(p);
      if(noOp){outputColor=vec4(base)/255.0;return;}
      ivec3 rgb=straight(base);uvec2 lum=edgeMode==1?uvec2(0u):luma(rgb);bool alphaEdge=false,contrastEdge=false;
      for(int i=0;i<4;i++){
        ivec2 q=p+(i==0?ivec2(-reach,0):i==1?ivec2(reach,0):i==2?ivec2(0,-reach):ivec2(0,reach));
        ivec4 next=readAt(q);if(abs(base.a-next.a)>8)alphaEdge=true;
        if(edgeMode!=1&&valid(q)&&contrast(lum,luma(straight(next))))contrastEdge=true;
      }
      bool edge=edgeMode==1?alphaEdge:edgeMode==2?contrastEdge:alphaEdge||contrastEdge;
      if(!edge){outputColor=vec4(base)/255.0;return;}
      ivec4 red=readAt(p+(reverse?-delta:delta)),blue=readAt(p+(reverse?delta:-delta));
      int r=red.a>0?straight(red).r:0,b=blue.a>0?straight(blue).b:0,a=mixed(base.a,max(base.a,max(red.a,blue.a)));
      outputColor=premultiplied(ivec3(mixed(rgb.r,r),rgb.g,mixed(rgb.b,b)),a);
    }`;
  const tintFragment=`#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D tintBytes;uniform vec2 size;uniform bool tinting;out vec4 outputColor;
    void main(){vec4 c=texture(source,gl_FragCoord.xy/size);outputColor=tinting?vec4(texelFetch(tintBytes,ivec2(int(floor(c.a*255.0+.5)),0),0))/255.0:c;}`;
  const outputFragment = `#version 300 es
    precision highp float;precision highp int;uniform sampler2D base,result,rangeMask;uniform vec2 size;uniform bool masked,baseOnly;out vec4 outputColor;
    ${nearestShader}
    void main(){vec2 uv=gl_FragCoord.xy/size;if(baseOnly){outputColor=texture(base,uv);return;}ivec2 from=textureSize(result,0);vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));ivec2 q=nearestPixel(ivec2(p),from,ivec2(size));vec4 effect=texelFetch(result,ivec2(q.x,from.y-1-q.y),0);if(!masked){outputColor=effect;return;}
      ivec4 e=ivec4(floor(effect*255.0+.5));int m=int(floor(texture(rangeMask,uv).a*255.0+.5));
      outputColor=vec4((e*m+127)/255)/255.0;}`;
  // Match Canvas source-over, including transparent incoming/outgoing Scenes.
  const transitionFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D incoming,outgoing;uniform vec2 size;uniform float progress;
    uniform int mode,direction,cell;uniform uint seed;out vec4 outputColor;
    float hash(uvec2 p){uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^(seed+1u)*69069u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.0;}
    void main(){vec2 uv=gl_FragCoord.xy/size,p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));float weight=1.0-progress;
      if(mode==1){if(direction==1)weight=p.x<ceil(size.x*(1.0-progress))?1.0:0.0;
        else if(direction==2)weight=p.y<ceil(size.y*(1.0-progress))?1.0:0.0;
        else if(direction==3)weight=p.y>=floor(size.y*progress)?1.0:0.0;
        else weight=p.x>=floor(size.x*progress)?1.0:0.0;}
      else if(mode==2)weight=hash(uvec2(ivec2(p)/cell))>progress?1.0:0.0;
      vec4 next=texture(incoming,uv),prev=texture(outgoing,uv)*weight;
      outputColor=prev+next*(1.0-prev.a);}`;
  function create() {
    let gpu = null, cachedKey = null, disabledReason = null;
    let contexts = 0, allocations = 0, disposals = 0, sourceUploads = 0, maskUploads = 0, hits = 0, noiseTableBuilds = 0, noiseByteMapBuilds = 0, surfaceRebuilds = 0;
    function dispose() {
      if (gpu) {
        for (const texture of gpu.textures) gpu.gl.deleteTexture(texture);
        for (const program of gpu.programs) gpu.gl.deleteProgram(program);
        gpu.gl.deleteBuffer(gpu.buffer); gpu.gl.deleteFramebuffer(gpu.fbo);
        gpu.gl.getExtension('WEBGL_lose_context')?.loseContext(); disposals += 1;
      }
      gpu = null; cachedKey = null; disabledReason = null;
    }
    function initialize(width, height) {
      const target = canvas(width, height), gl = target && target.getContext('webgl2', { alpha:true, antialias:false, premultipliedAlpha:true, preserveDrawingBuffer:true, depth:false });
      if (!gl || typeof gl.createShader !== 'function') throw new Error('webgl2-unavailable');
      const programs = [], textures = [];
      gpu = { canvas:target, gl, width:0, height:0, lowWidth:0, lowHeight:0, programs, textures, sizeTextures:new Set(), nearestPrograms:new Map(), validatedAttachments:new Set() };
      const compile = (type, text) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
        return shader;
      };
      const program = fragment => {
        const shaders = [compile(gl.VERTEX_SHADER,vertex), compile(gl.FRAGMENT_SHADER,fragment)], result = gl.createProgram(); programs.push(result);
        for (const shader of shaders) gl.attachShader(result,shader); gl.linkProgram(result); for (const shader of shaders) gl.deleteShader(shader);
        if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
        return { program:result, uniforms:new Map() };
      };
      const texture = (w,h) => {
        const result = gl.createTexture(); textures.push(result); gpu.sizeTextures.add(result); gl.bindTexture(gl.TEXTURE_2D,result);
        for (const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
        for (const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); allocations += 1; return result;
      };
      gpu.field = program(fieldFragment);
      gpu.makeTexture=texture;gpu.makeProgram=program;
      gpu.nearestProgram=(name,fragment)=>{
        const mapped=!!gpu.nativeNearest,key=name+(mapped?':mapped':':integer');
        if(!gpu.nearestPrograms.has(key))gpu.nearestPrograms.set(key,program(mapped?fragment.replace(nearestShader,mappedNearestShader):fragment));
        return gpu.nearestPrograms.get(key);
      };
      gpu.alphaBytes=gl.createTexture();textures.push(gpu.alphaBytes);allocations++;
      gl.bindTexture(gl.TEXTURE_2D,gpu.alphaBytes);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.R8UI,256,256,0,gl.RED_INTEGER,gl.UNSIGNED_BYTE,alphaDecodeTable());
      gpu.fbo = gl.createFramebuffer(); gpu.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW); contexts += 1;
    }
    function resize(width,height,lowWidth,lowHeight){
      const {gl}=gpu,max=gl.getParameter(gl.MAX_TEXTURE_SIZE),viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS),bufferMax=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if(width>max||height>max||lowWidth>max||lowHeight>max||width>viewport[0]||height>viewport[1]||width>bufferMax||height>bufferMax)throw new Error('webgl-surface-size-limit');
      const start=performance.now(),calibration=api.modules.nativeNearest.create(width,height,lowWidth,lowHeight),calibrationMs=performance.now()-start;
      if(calibration.data&&calibration.width>max)throw new Error('native-nearest-table-too-large');
      // Detach before deletion: an FBO attachment must not keep an old surface alive.
      gl.bindFramebuffer(gl.FRAMEBUFFER,gpu.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,null,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      for(const texture of gpu.sizeTextures){gl.deleteTexture(texture);const index=gpu.textures.indexOf(texture);if(index>=0)gpu.textures.splice(index,1);}
      gpu.sizeTextures.clear();gpu.validatedAttachments.clear();cachedKey=null;
      for(const name of ['lowInput','lowOutput','base','mask','nativeNearest','incoming','outgoing','stageResult','stageResult2','tintWork','noiseJumps','resample'])delete gpu[name];
      gpu.noiseTableKey=null;gpu.noiseTableBytes=0;
      if(gpu.canvas.width!==width)gpu.canvas.width=width;if(gpu.canvas.height!==height)gpu.canvas.height=height;
      if(gl.drawingBufferWidth!==width||gl.drawingBufferHeight!==height)throw new Error('webgl-drawing-buffer-size-mismatch');
      Object.assign(gpu,{width,height,lowWidth,lowHeight,nearestBytes:calibration.bytes,nearestExceptions:calibration.exceptions,nearestPrepareMs:calibrationMs});
      gpu.lowInput=gpu.makeTexture(lowWidth,lowHeight);gpu.lowOutput=gpu.makeTexture(lowWidth,lowHeight);gpu.base=gpu.makeTexture(width,height);gpu.mask=gpu.makeTexture(width,height);
      if(calibration.data){
        gpu.nativeNearest=gl.createTexture();gpu.textures.push(gpu.nativeNearest);gpu.sizeTextures.add(gpu.nativeNearest);allocations++;
        gl.bindTexture(gl.TEXTURE_2D,gpu.nativeNearest);
        for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.R32UI,calibration.width,4,0,gl.RED_INTEGER,gl.UNSIGNED_INT,calibration.data);
      }
      gpu.output=gpu.nearestProgram('output',outputFragment);gpu.surfacePrepareMs=performance.now()-start;surfaceRebuilds++;
    }
    function render(source, scene, frame, surfaces, targetCtx, options) {
      const profile=options&&options._sceneProfile;
      const now=()=>profile?performance.now():0;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=now();
      const selected = plan(scene,frame);
      if (selected.reason) return fallback(selected.reason);
      if (disabledReason) return fallback(disabledReason);
      const width=source.width,height=source.height,lowWidth=Math.ceil(width/selected.grid),lowHeight=Math.ceil(height/selected.grid);
      let work=null,range=null,initialized=false,surfacesRebuilt=false;
      try {
        if (!gpu) { initialize(width,height);initialized=true; }
        const { gl }=gpu;
        if (gl.isContextLost()) { disabledReason='webgl-context-lost'; return fallback(disabledReason); }
        if(gpu.width!==width||gpu.height!==height||gpu.lowWidth!==lowWidth||gpu.lowHeight!==lowHeight){resize(width,height,lowWidth,lowHeight);surfacesRebuilt=true;}
        const slot=options&&options._sceneGpuSlot;
        const key=!slot&&options && options.sceneSourceVersion!=null ? JSON.stringify([options.sceneSourceVersion,frame.time,width,height,selected,options.maskSourceQuality||'full']) : null;
        if (key!==null && key===cachedKey) {
          record('gpuPrepare',phaseStart);phaseStart=now();
          targetCtx.clearRect(0,0,width,height); targetCtx.drawImage(gpu.canvas,0,0); hits += 1;
          record('canvasOutput',phaseStart);
          return {handled:true,count:selected.count,cacheHit:true,uploads:0,passes:0,initialized:false,surfacesRebuilt:false};
        }
        const uniform=(entry,name)=>{if(!entry.uniforms.has(name))entry.uniforms.set(name,gl.getUniformLocation(entry.program,name));return entry.uniforms.get(name);};
        const bind=entry=>{gl.useProgram(entry.program);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);const at=gl.getAttribLocation(entry.program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,gpu.alphaBytes);gl.uniform1i(uniform(entry,'alphaBytes'),5);};
        const bindNearest=entry=>{if(gpu.nativeNearest){gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,gpu.nativeNearest);gl.uniform1i(uniform(entry,'nativeNearest'),6);gl.uniform2i(uniform(entry,'nearestLowExtent'),gpu.lowWidth,gpu.lowHeight);}};
        const upload=(texture,image)=>{const start=now();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);record('gpuUpload',start);};
        record('gpuPrepare',phaseStart);phaseStart=now();
        const fixedRoles=options&&options.sceneSurfacePolicy==='fixed-roles';
        let input=source;
        if(selected.grid>1&&!selected.tint){work=fixedRoles?surfaces.acquireRole('gpu-work',lowWidth,lowHeight):surfaces.acquire(lowWidth,lowHeight);const ctx=work.getContext('2d');ctx.clearRect(0,0,lowWidth,lowHeight);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,lowWidth,lowHeight);input=work;}
        record('sourceDownsample',phaseStart);
        upload(selected.tint?gpu.base:gpu.lowInput,input);sourceUploads += 1;let uploads=1+(initialized?1:0)+(surfacesRebuilt&&gpu.nativeNearest?1:0),passes=0,tick=0,samplingAmount=0;
        const attach=texture=>{
          if(!texture){gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;}
          gl.bindFramebuffer(gl.FRAMEBUFFER,gpu.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
          if(!gpu.validatedAttachments.has(texture)){
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('incomplete-framebuffer');
            gpu.validatedAttachments.add(texture);
          }
        };
        const colour=value=>{
          const hex=String(value||'#000000').replace('#',''),text=hex.length===3?hex.split('').map(c=>c+c).join(''):hex.padEnd(6,'0').slice(0,6);
          return [0,2,4].map(i=>(parseInt(text.slice(i,i+2),16)||0)/255);
        };
        let stageSource=gpu.base;
        for(let index=0;index<selected.passes.length;index++){
          const pass=selected.passes[index],config=pass.config,field=pass.kind==='uneven'?(config.field||{}):{},motion=config.motion||{};
          const mask=config.mask&&config.mask.type!=='none'?config.mask:null;
          phaseStart=now();
          if(index>0){
            // CPU applies the grid separately for every card. Keep the full
            // previous card result, then resample it, never fuse across a mask.
            if(!gpu.resample)gpu.resample=gpu.nearestProgram('resample',resampleFragment);
            attach(gpu.lowInput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.resample);
            bindNearest(gpu.resample);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stageSource);
            gl.uniform1i(uniform(gpu.resample,'source'),0);gl.uniform2f(uniform(gpu.resample,'size'),lowWidth,lowHeight);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }
          record('gpuSubmit',phaseStart);
          if(mask){
            phaseStart=now();
            if(!range)range=fixedRoles?surfaces.acquireRole('gpu-range',width,height):surfaces.acquire(width,height);
            const ctx=range.getContext('2d');ctx.clearRect(0,0,width,height);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
            if(!api.modules.masks.apply(range,mask,{x:0,y:0,w:width,h:height},scene,frame,surfaces))throw new Error('unsupported-mask');
            record('maskPrepare',phaseStart);upload(gpu.mask,range);maskUploads++;uploads++;
            if(index===0&&!selected.tint){upload(gpu.base,source);sourceUploads++;uploads++;}
          }
          if(pass.kind==='tint'){
            if(!gpu.tint)gpu.tint=gpu.makeProgram(tintFragment);
            if(!gpu.tintWork)gpu.tintWork=gpu.makeTexture(width,height);
            const start=now(),table=tintTable(config);
            if(table.key!==gpu.tintTableKey){
              if(!gpu.tintBytes){gpu.tintBytes=gl.createTexture();gpu.textures.push(gpu.tintBytes);allocations++;}
              gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.tintBytes);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8UI,256,1,0,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,table.data);gpu.tintTableKey=table.key;uploads++;
            }
            record('tintTablePrepare',start);phaseStart=now();
            attach(gpu.tintWork);gl.viewport(0,0,width,height);bind(gpu.tint);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stageSource);gl.uniform1i(uniform(gpu.tint,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.tintBytes);gl.uniform1i(uniform(gpu.tint,'tintBytes'),3);gl.uniform2f(uniform(gpu.tint,'size'),width,height);
            gl.uniform1i(uniform(gpu.tint,'tinting'),0);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
            gl.enable(gl.BLEND);const mode=api.modules.blend.toCanvas(config.blend);
            if(mode==='screen')gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_COLOR,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
            else gl.blendFunc(gl.ONE,mode==='lighter'?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
            gl.uniform1i(uniform(gpu.tint,'tinting'),1);gl.drawArrays(gl.TRIANGLES,0,3);passes++;gl.disable(gl.BLEND);
          }else if(pass.kind==='noise'){
            if(!gpu.noise)gpu.noise=gpu.makeProgram(noiseFragment);
            const amplitude=clamp(+config.amount||0,0,100)*2.55;
            if(gpu.noiseAmplitude!==amplitude){
              // Preserve JS-double + Uint8ClampedArray rounding, including
              // near-half ties at amount=50 which a following threshold amplifies.
              // This 64KB arithmetic LUT contains no source pixels/noise frames.
              const start=now(),data=new Uint8ClampedArray(256*256);
              for(let n=0;n<256;n++)for(let value=0;value<256;value++)data[n*256+value]=clamp(value+(n/127.5-1)*amplitude,0,255);
              if(!gpu.noiseByteMap){gpu.noiseByteMap=gl.createTexture();gpu.textures.push(gpu.noiseByteMap);allocations++;}
              gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseByteMap);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.R8UI,256,256,0,gl.RED_INTEGER,gl.UNSIGNED_BYTE,data);
              gpu.noiseAmplitude=amplitude;uploads++;noiseByteMapBuilds++;record('noiseByteMapPrepare',start);
            }
            const grain=Math.max(1,Math.min(16,Math.round(+config.size||1))),channels=config.colorMode==='rgb'?3:1,cells=Math.ceil(lowWidth/grain),tableKey=`${cells}:${channels}`;
            if(gpu.noiseTableKey!==tableKey){
              const start=now(),data=new Uint8Array(cells*channels*32),basis=Uint32Array.from({length:32},(_,bit)=>(1<<bit)>>>0);
              for(let x=0;x<cells;x++)for(let channel=0;channel<channels;channel++)for(let bit=0;bit<32;bit++){
                let v=basis[bit];v^=v<<13;v^=v>>>17;v^=v<<5;basis[bit]=v>>>0;
                // Only the output byte is used; retain full states solely while
                // constructing later powers. RGBA8UI is one quarter of RGBA32UI.
                data[((channel*8+(bit>>2))*cells+x)*4+(bit&3)]=v&255;
              }
              if(!gpu.noiseJumps){gpu.noiseJumps=gl.createTexture();gpu.textures.push(gpu.noiseJumps);gpu.sizeTextures.add(gpu.noiseJumps);allocations++;}
              gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseJumps);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8UI,cells,channels*8,0,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,data);
              gpu.noiseTableKey=tableKey;gpu.noiseTableBytes=data.byteLength;uploads++;noiseTableBuilds++;record('noiseJumpPrepare',start);
            }
            phaseStart=now();attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.noise);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.noise,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseJumps);gl.uniform1i(uniform(gpu.noise,'jumps'),3);
            gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseByteMap);gl.uniform1i(uniform(gpu.noise,'byteMap'),4);
            const period=Math.max(.001,+motion.period||1),steps=Math.max(1,Math.min(120,Math.round(+motion.steps||12))),phase=((frame.time/period)%1+1)%1;
            const noiseTick=motion.enabled&&motion.type==='noise-refresh'?Math.min(steps-1,Math.floor(phase*steps)):0;
            gl.uniform2f(uniform(gpu.noise,'size'),lowWidth,lowHeight);gl.uniform1i(uniform(gpu.noise,'grain'),grain);gl.uniform1i(uniform(gpu.noise,'channels'),channels);
            gl.uniform1ui(uniform(gpu.noise,'seed'),Math.round(+config.seed||0)>>>0);gl.uniform1ui(uniform(gpu.noise,'tick'),noiseTick>>>0);
            gl.uniform1f(uniform(gpu.noise,'amplitude'),amplitude);
            gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }else if(pass.kind==='dispersion'){
            if(!gpu.dispersion)gpu.dispersion=gpu.makeProgram(dispersionFragment);
            const integerTexture=(old,w,h,internal,format,type,data,unit)=>{
              const texture=old||gl.createTexture();if(!old){gpu.textures.push(texture);allocations++;}
              gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
              gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,data);uploads++;return texture;
            };
            phaseStart=now();
            if(!gpu.lumaProducts)gpu.lumaProducts=integerTexture(null,256,3,gl.RG32UI,gl.RG_INTEGER,gl.UNSIGNED_INT,lumaProducts(),3);
            const strength=clamp(config.strength==null?1:+config.strength,0,1);
            if(gpu.dispersionStrength!==strength){
              const data=new Uint8Array(65536);
              for(let b=0;b<256;b++)for(let a=0;a<256;a++)data[b*256+a]=Math.round(a+(b-a)*strength);
              gpu.dispersionMix=integerTexture(gpu.dispersionMix,256,256,gl.R8UI,gl.RED_INTEGER,gl.UNSIGNED_BYTE,data,4);gpu.dispersionStrength=strength;
            }
            record('dispersionTablePrepare',phaseStart);phaseStart=now();
            attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.dispersion);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.dispersion,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.lumaProducts);gl.uniform1i(uniform(gpu.dispersion,'lumaProducts'),3);
            gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.dispersionMix);gl.uniform1i(uniform(gpu.dispersion,'mixBytes'),4);
            const distance=Math.max(0,Math.round(+config.distance||0)),angle=(+config.angle||0)*Math.PI/180,dx=Math.round(Math.cos(angle)*distance),dy=Math.round(Math.sin(angle)*distance);
            gl.uniform2i(uniform(gpu.dispersion,'extent'),lowWidth,lowHeight);gl.uniform2i(uniform(gpu.dispersion,'delta'),dx,dy);
            gl.uniform1i(uniform(gpu.dispersion,'reach'),Math.max(1,distance+Math.max(1,Math.round(+config.width||1))-1));
            gl.uniform1i(uniform(gpu.dispersion,'edgeMode'),{contour:1,contrast:2}[config.source]||0);
            gl.uniform1i(uniform(gpu.dispersion,'reverse'),config.order==='bgr'?1:0);gl.uniform1i(uniform(gpu.dispersion,'noOp'),!distance||!strength||(!dx&&!dy)?1:0);
            gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }else{
          phaseStart=now();attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.field);
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.field,'source'),0);gl.uniform2f(uniform(gpu.field,'size'),lowWidth,lowHeight);
          const animated=pass.kind==='uneven'&&motion.enabled&&motion.type==='uneven-motion',steps=Math.max(1,Math.round(+motion.steps||24));
          tick=animated&&+motion.flowSpeed?Math.floor(frame.time/Math.max(.001,+motion.period||3)*steps):0;
          const tide=animated?1+Math.sin(frame.time/Math.max(.001,+motion.period||3)*Math.PI*2)*clamp(+motion.tideAmount||0,0,1):1;
          const values={scale:Math.max(4,+field.scale||48),contrast:clamp(field.contrast==null?.5:+field.contrast,0,1),flow:tick/steps*(+motion.flowSpeed||0),amount:field.enabled?clamp((+config.amount||0)*tide,0,1):0,span:Math.max(1,Math.max(2,Math.round(+config.coarseness||5))-1),angle:(+field.direction||0)*Math.PI/180,waveSeed:+field.seed||1};
          samplingAmount=values.amount;
          for(const [name,value] of Object.entries(values))gl.uniform1f(uniform(gpu.field,name),value);
          gl.uniform2f(uniform(gpu.field,'center'),clamp(field.centerX==null?.5:+field.centerX,0,1)*lowWidth,clamp(field.centerY==null?.5:+field.centerY,0,1)*lowHeight);
          gl.uniform1ui(uniform(gpu.field,'seed'),(+field.seed||1)>>>0);gl.uniform1ui(uniform(gpu.field,'tick'),tick>>>0);gl.uniform1i(uniform(gpu.field,'fieldType'),field.enabled?({wave:1,radial:2,noise:3}[field.type||'wave']):0);
          gl.uniform1i(uniform(gpu.field,'thresholding'),pass.kind==='threshold'?1:0);
          gl.uniform3f(uniform(gpu.field,'darkColor'),...colour(config.dark));gl.uniform3f(uniform(gpu.field,'lightColor'),...colour(config.light));
          const boundary=pass.boundary||{cutoff:0,dark:[]};
          gl.uniform1i(uniform(gpu.field,'thresholdCutoff'),boundary.cutoff);gl.uniform1i(uniform(gpu.field,'tieCount'),boundary.dark.length);
          if(boundary.dark.length)gl.uniform4iv(uniform(gpu.field,'tieDarkByRed[0]'),boundary.packed);
          gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }
          let destination=null;
          if(index<selected.passes.length-1){
            // Alternate full-size intermediates so the third card never reads
            // the texture currently attached as its output (feedback loop).
            const name=index%2?'stageResult2':'stageResult';
            if(!gpu[name])gpu[name]=gpu.makeTexture(width,height);destination=gpu[name];
          }else if(slot){
            if(!['incoming','outgoing'].includes(slot))throw new Error('invalid-transition-slot');
            if(!gpu[slot])gpu[slot]=gpu.makeTexture(width,height);destination=gpu[slot];
          }
          attach(destination);gl.viewport(0,0,width,height);bind(gpu.output);
          bindNearest(gpu.output);
          for(const [unit,texture,name] of [[0,pass.kind==='tint'?gpu.tintWork:gpu.lowOutput,'result'],[1,stageSource,'base'],[2,gpu.mask,'rangeMask']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniform(gpu.output,name),unit);}
          gl.uniform2f(uniform(gpu.output,'size'),width,height);gl.uniform1i(uniform(gpu.output,'masked'),mask?1:0);
          if(mask){
            gl.uniform1i(uniform(gpu.output,'baseOnly'),1);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
            gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
          }
          gl.uniform1i(uniform(gpu.output,'baseOnly'),0);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          if(mask)gl.disable(gl.BLEND);
          stageSource=destination;record('gpuSubmit',phaseStart);
        }
        phaseStart=now();
        // Deferred transition textures are not visible yet. The optional final
        // check covers both sides before any Canvas output, preserving same-frame
        // CPU fallback without synchronizing between the two scene submissions.
        if(!(slot&&options.sceneGpuValidation==='frame-end')&&gl.getError()!==gl.NO_ERROR)throw new Error('webgl-render-error');
        record('gpuValidation',phaseStart);phaseStart=now();
        if(!slot){targetCtx.clearRect(0,0,width,height);targetCtx.drawImage(gpu.canvas,0,0);}cachedKey=key;
        record('canvasOutput',phaseStart);
        const result={handled:true,count:selected.count,cacheHit:false,uploads,passes,fieldTick:tick,samplingAmount,initialized,surfacesRebuilt,surfacePrepareMs:surfacesRebuilt?gpu.surfacePrepareMs:0,nearestCalibration:{bytes:gpu.nearestBytes,exceptions:gpu.nearestExceptions,prepareMs:surfacesRebuilt?gpu.nearestPrepareMs:0}};
        if(options&&options.sceneSurfaceTrace)result.surfaceTrace={source:surfaces.describe(source),work:surfaces.describe(work),range:surfaces.describe(range)};
        return result;
      } catch(error) {
        const reason=String(error.message||error);dispose();disabledReason=reason;return fallback(reason);
      } finally { if(work)surfaces.release(work);if(range)surfaces.release(range); }
    }
    function composeTransition(state,targetCtx,options){
      if(!gpu||!gpu.incoming||!gpu.outgoing||disabledReason)return false;
      const profile=options&&options._sceneProfile;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=profile?performance.now():0;
      try{
        const gl=gpu.gl;if(gl.isContextLost())throw new Error('webgl-context-lost');
        const entry=gpu.transition||(gpu.transition=gpu.makeProgram(transitionFragment));
        const uniform=name=>{if(!entry.uniforms.has(name))entry.uniforms.set(name,gl.getUniformLocation(entry.program,name));return entry.uniforms.get(name);};
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,gpu.width,gpu.height);gl.useProgram(entry.program);
        gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);const at=gl.getAttribLocation(entry.program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
        for(const [unit,name] of [[0,'incoming'],[1,'outgoing']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gpu[name]);gl.uniform1i(uniform(name),unit);}
        gl.uniform2f(uniform('size'),gpu.width,gpu.height);gl.uniform1f(uniform('progress'),state.progress);
        gl.uniform1i(uniform('mode'),{fade:0,wipe:1,dissolve:2}[state.type]);gl.uniform1i(uniform('direction'),{right:0,left:1,up:2,down:3}[state.direction]||0);
        gl.uniform1i(uniform('cell'),Math.max(1,Math.round(+state.config.cell||Math.max(2,Math.min(gpu.width,gpu.height)/36))));gl.uniform1ui(uniform('seed'),Math.round(+state.config.seed||13)>>>0);
        gl.drawArrays(gl.TRIANGLES,0,3);record('gpuTransitionSubmit',phaseStart);phaseStart=profile?performance.now():0;
        if(gl.getError()!==gl.NO_ERROR)throw new Error('webgl-transition-error');
        record('gpuValidation',phaseStart);phaseStart=profile?performance.now():0;
        targetCtx.clearRect(0,0,gpu.width,gpu.height);targetCtx.drawImage(gpu.canvas,0,0);cachedKey=null;record('canvasOutput',phaseStart);return true;
      }catch(error){const reason=String(error.message||error);dispose();disabledReason=reason;return false;}
    }
    function stats(){
      return {contexts,allocations,disposals,surfaceRebuilds,sourceUploads,maskUploads,cacheHits:hits,noiseTableBuilds,noiseByteMapBuilds,
        liveTextures:gpu?gpu.textures.length:0,liveSurfaceTextures:gpu?gpu.sizeTextures.size:0,programCount:gpu?gpu.programs.length:0,
        nearestCalibrationBytes:gpu?gpu.nearestBytes:0,contextLost:!!(gpu&&gpu.gl.isContextLost()),
        textureBytes:gpu?4*(gpu.width*gpu.height*(2+(gpu.incoming?1:0)+(gpu.outgoing?1:0)+(gpu.stageResult?1:0)+(gpu.stageResult2?1:0)+(gpu.tintWork?1:0))+gpu.lowWidth*gpu.lowHeight*2)+(gpu.nearestBytes||0)+(gpu.noiseTableBytes||0)+(gpu.noiseByteMap?65536:0)+(gpu.lumaProducts?6144:0)+(gpu.dispersionMix?65536:0)+(gpu.tintBytes?1024:0)+65536:0};
    }
    function renderEvaluatedSample(source,group,frame,surfaces,targetCtx){
      const entries=Object.entries(group||{}).filter(([id,c])=>id!=='controllers'&&c?.enabled);
      // Host admission decides the supported object chain. The same scene
      // planner then preflights every pass before allocation/upload.
      if(entries.some(([,c])=>c.mask?.type&&c.mask.type!=='none'))return fallback('unsupported-object-card-mask');
      const carrier={width:source.width,height:source.height,sceneEffects:{overlay:{},sample:group}};
      const evaluated={time:frame.time,preview:frame.preview,effectValuesFor:(_scope,_owner,_id,value)=>value,controllerValuesFor:(_scope,_owner,_id,value)=>value};
      return render(source,carrier,evaluated,surfaces,targetCtx,{});
    }
    return Object.freeze({ render, renderEvaluatedSample, composeTransition, dispose, invalidateSource(){cachedKey=null;}, stats });
  }
  api.modules.sceneGpu = Object.freeze({create,plan});
})(typeof window !== 'undefined' ? window : globalThis);
