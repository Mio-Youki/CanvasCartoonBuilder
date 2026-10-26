/* Isolated ASCII edge candidates. Never loaded by the production editor. */
(function(global){
  'use strict';
  const buffers=new WeakMap();
  const cellBuffers=new WeakMap();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const weights=sigma=>{const a=[];for(let k=-2;k<=2;k++)a.push(Math.exp(-k*k/(2*sigma*sigma)));return a;};
  const w1=weights(1),w2=weights(1.6);
  const sum1=w1.reduce((a,b)=>a+b,0),sum2=w2.reduce((a,b)=>a+b,0);
  const profile={};
  function cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directions,surfaces){
    let work=cellBuffers.get(surfaces);if(!work||work.columns!==columns||work.rows!==rows){work={columns,rows,colors:new Uint8Array(columns*rows*4),indices:new Uint8Array(columns*rows*4)};cellBuffers.set(surfaces,work);}
    const {colors,indices}=work;colors.fill(0);indices.fill(0);
    const width=columns*detail,exposure=Math.max(0,Number.isFinite(+config.exposure)?+config.exposure:1),attenuation=Math.max(.01,Number.isFinite(+config.attenuation)?+config.attenuation:1),inverse=!!config.invert;
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      let red=0,green=0,blue=0,weight=0;
      for(let y=0;y<detail;y++)for(let x=0;x<detail;x++){
        const p=((row*detail+y)*width+column*detail+x)*4,a=pixels[p+3]/255;red+=pixels[p]*a;green+=pixels[p+1]*a;blue+=pixels[p+2]*a;weight+=a;
      }
      const p=(row*columns+column)*4;
      if(!weight){if(!alphaPixels[p+3])continue;red=alphaPixels[p];green=alphaPixels[p+1];blue=alphaPixels[p+2];weight=1;}
      red/=weight;green/=weight;blue/=weight;
      let brightness=Math.pow(Math.max(0,Math.min(1,(.2126*red+.7152*green+.0722*blue)/255*exposure)),attenuation);if(inverse)brightness=1-brightness;
      const direction=directions&&directions[row*columns+column],glyph=direction!=null&&direction>=0&&glyphs.edges[direction]>=0?glyphs.edges[direction]:glyphs.lut[Math.round(brightness*255)];
      colors[p]=Math.round(red);colors[p+1]=Math.round(green);colors[p+2]=Math.round(blue);colors[p+3]=255;
      indices[p]=glyph%256;indices[p+1]=Math.floor(glyph/256);indices[p+2]=alphaPixels[p+3];indices[p+3]=255;
    }
    return work;
  }
  function cpu(pixels,width,height,columns,rows,config,validWidth,validHeight,surfaces){
    let work=buffers.get(surfaces);
    if(!work||work.width!==width||work.height!==height){work={width,height,luma:new Float32Array(width*height),h1:new Float32Array(width*height),h2:new Float32Array(width*height),dog:new Uint8Array(width*height),votes:new Uint16Array(columns*rows*4),result:new Int8Array(columns*rows)};buffers.set(surfaces,work);}
    const {luma,h1,h2,dog,votes,result}=work,lastX=Math.max(0,Math.min(width-1,Math.floor(validWidth)-1)),lastY=Math.max(0,Math.min(height-1,Math.floor(validHeight)-1));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(Math.min(y,lastY)*width+Math.min(x,lastX))*4;luma[y*width+x]=(.2126*pixels[p]+.7152*pixels[p+1]+.0722*pixels[p+2])/255*pixels[p+3]/255;}
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const base=y*width,a=luma[base+Math.max(0,x-2)],b=luma[base+Math.max(0,x-1)],c=luma[base+x],d=luma[base+Math.min(width-1,x+1)],e=luma[base+Math.min(width-1,x+2)];
      h1[base+x]=(a*w1[0]+b*w1[1]+c*w1[2]+d*w1[3]+e*w1[4])/sum1;h2[base+x]=(a*w2[0]+b*w2[1]+c*w2[2]+d*w2[3]+e*w2[4])/sum2;
    }
    const threshold=.001+(1-clamp(Number.isFinite(+config.edgeSensitivity)?+config.edgeSensitivity:.75,0,1))*.04;
    for(let y=0;y<height;y++){
      const a=Math.max(0,y-2)*width,b=Math.max(0,y-1)*width,c=y*width,d=Math.min(height-1,y+1)*width,e=Math.min(height-1,y+2)*width;
      for(let x=0;x<width;x++){
        // Preserve the original Float32 rounding after each blur direction.
        const narrow=Math.fround((h1[a+x]*w1[0]+h1[b+x]*w1[1]+h1[c+x]*w1[2]+h1[d+x]*w1[3]+h1[e+x]*w1[4])/sum1);
        const wide=Math.fround((h2[a+x]*w2[0]+h2[b+x]*w2[1]+h2[c+x]*w2[2]+h2[d+x]*w2[3]+h2[e+x]*w2[4])/sum2);
        dog[c+x]=narrow-wide>=threshold?1:0;
      }
    }
    votes.fill(0);result.fill(-1);
    const tangent=Math.SQRT2-1;
    for(let y=0;y<height;y++){
      const above=Math.max(0,y-1)*width,center=y*width,below=Math.min(height-1,y+1)*width,row=Math.floor(y/4)*columns;
      for(let x=0;x<width;x++){
        const left=Math.max(0,x-1),right=Math.min(width-1,x+1);
        const a=dog[above+left],b=dog[above+x],c=dog[above+right],d=dog[center+left],e=dog[center+right],f=dog[below+left],g=dog[below+x],h=dog[below+right];
        const gx=c+2*e+h-a-2*d-f,gy=f+2*g+h-a-2*b-c;if(!gx&&!gy)continue;
        const direction=Math.abs(gx)<Math.abs(gy)*tangent?0:Math.abs(gy)<Math.abs(gx)*tangent?1:gx*gy>0?2:3;
        votes[(row+Math.floor(x/4))*4+direction]++;
      }
    }
    const minimum=Math.max(1,Math.ceil(clamp(Number.isFinite(+config.edgeCoverage)?+config.edgeCoverage:.25,0,1)*16));
    for(let i=0;i<result.length;i++){let best=0;for(let d=1;d<4;d++)if(votes[i*4+d]>votes[i*4+best])best=d;if(votes[i*4+best]>=minimum)result[i]=best;}
    return result;
  }
  const vert='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const header='precision highp float;uniform sampler2D inputTex;uniform vec2 size,validEnd;uniform float threshold;';
  const sample='vec4 at(vec2 p){return texture2D(inputTex,(clamp(p,vec2(0.),size-1.)+.5)/size);}';
  const horizontal=header+sample+`
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 q=min(clamp(p+vec2(float(k),0.),vec2(0.),size-1.),validEnd);vec4 c=at(q);float l=dot(c.rgb,vec3(.2126,.7152,.0722))*c.a;
        vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=l*w;}
      gl_FragColor=vec4(sum/vec2(2.4837318858984925,3.5608218483405576),0.,1.);}`;
  const vertical=header+sample+`
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 c=at(p+vec2(0.,float(k))).rg;vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=c*w;}
      vec2 value=sum/vec2(2.4837318858984925,3.5608218483405576);gl_FragColor=vec4(value.x-value.y>=threshold?1.:0.,0.,0.,1.);}`;
  const gradient=header+sample+`
    void main(){vec2 p=floor(gl_FragCoord.xy);float a=at(p+vec2(-1.,-1.)).r,b=at(p+vec2(0.,-1.)).r,c=at(p+vec2(1.,-1.)).r;
      float d=at(p+vec2(-1.,0.)).r,e=at(p+vec2(1.,0.)).r,f=at(p+vec2(-1.,1.)).r,g=at(p+vec2(0.,1.)).r,h=at(p+vec2(1.,1.)).r;
      float gx=c+2.*e+h-a-2.*d-f,gy=f+2.*g+h-a-2.*b-c,code=0.;
      if(abs(gx)+abs(gy)>0.)code=abs(gx)<abs(gy)*.4142135623730951?1.:abs(gy)<abs(gx)*.4142135623730951?2.:gx*gy>0.?3.:4.;gl_FragColor=vec4(code/255.,0.,0.,1.);}`;
  const vote=header+sample+`uniform vec2 cellSize;uniform float coverage;
    void main(){vec2 cell=floor(gl_FragCoord.xy),begin=ceil(cell*cellSize-.5),end=min(size,ceil((cell+1.)*cellSize-.5));vec4 buckets=vec4(0.);
      for(int y=0;y<64;y++){if(begin.y+float(y)>=end.y)break;for(int x=0;x<64;x++){if(begin.x+float(x)>=end.x)break;
        float code=floor(at(begin+vec2(float(x),float(y))).r*255.+.5);if(code==1.)buckets.x+=1.;else if(code==2.)buckets.y+=1.;else if(code==3.)buckets.z+=1.;else if(code==4.)buckets.w+=1.;}}
      float best=buckets.x,code=1.;if(buckets.y>best){best=buckets.y;code=2.;}if(buckets.z>best){best=buckets.z;code=3.;}if(buckets.w>best){best=buckets.w;code=4.;}
      float minimum=max(1.,ceil(coverage*(end.x-begin.x)*(end.y-begin.y)));gl_FragColor=vec4((best>=minimum?code:0.)/255.,0.,0.,1.);}`;
  function createGpu(gpu,surfaces,width,height,columns,rows){
    const gl=gpu.gl;if(!gl.getExtension('OES_texture_float')||!gl.getExtension('WEBGL_color_buffer_float'))throw new Error('需要可渲染Float纹理');
    const programs=[horizontal,vertical,gradient,vote].map(fragment=>{const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vert),f=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return{p,locations:new Map()};});
    const textures=[gl.UNSIGNED_BYTE,gl.FLOAT,gl.UNSIGNED_BYTE,gl.UNSIGNED_BYTE,gl.UNSIGNED_BYTE].map((type,index)=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,index===4?columns:width,index===4?rows:height,0,gl.RGBA,type,null);return tex;});
    const fbo=gl.createFramebuffer(),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const dispose=()=>{programs.forEach(item=>gl.deleteProgram(item.p));textures.forEach(tex=>gl.deleteTexture(tex));gl.deleteFramebuffer(fbo);gl.deleteBuffer(buffer);};surfaces.onClear(dispose);
    return{width,height,columns,rows,textures,programs,fbo,buffer,dispose};
  }
  function gpuDirections(pixels,width,height,columns,rows,config,validWidth,validHeight,surfaces,source){
    const gpu=global.ToSampoolRuntimeVNext.modules.ascii.experiment.gpuRenderer(surfaces);if(!gpu)throw new Error('ASCII GPU不可用');
    const gl=gpu.gl,full=global.__asciiExperiment.mode==='gpu-full',w=full?source.width:width,h=full?source.height:height;
    let state=gpu.edgeState;if(!state||state.width!==w||state.height!==h||state.columns!==columns||state.rows!==rows){if(state)state.dispose();state=createGpu(gpu,surfaces,w,h,columns,rows);gpu.edgeState=state;}
    gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,state.textures[0]);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    if(full)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const cell=global.ToSampoolRuntimeVNext.modules.ascii.geometry(config,global.__asciiExperiment.grid||1,global.ToSampoolRuntimeVNext.modules.ascii.atlas(config));
    const uniform=(item,name,...values)=>{let location=item.locations.get(name);if(location===undefined){location=gl.getUniformLocation(item.p,name);item.locations.set(name,location);}if(values.length===2)gl.uniform2f(location,...values);else gl.uniform1f(location,...values);};
    gl.bindFramebuffer(gl.FRAMEBUFFER,state.fbo);
    for(let pass=0;pass<4;pass++){
      const item=state.programs[pass];gl.useProgram(item.p);gl.bindBuffer(gl.ARRAY_BUFFER,state.buffer);const loc=gl.getAttribLocation(item.p,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,state.textures[pass+1],0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('ASCII Float framebuffer不完整');
      gl.viewport(0,0,pass===3?columns:w,pass===3?rows:h);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,state.textures[pass]);gl.uniform1i(gl.getUniformLocation(item.p,'inputTex'),4);
      uniform(item,'size',w,h);uniform(item,'validEnd',full?w-1:Math.max(0,Math.floor(validWidth)-1),full?h-1:Math.max(0,Math.floor(validHeight)-1));
      uniform(item,'threshold',.001+(1-clamp(+config.edgeSensitivity||0,0,1))*.04);uniform(item,'coverage',config.edgeCoverage==null?.25:+config.edgeCoverage);
      uniform(item,'cellSize',full?cell.width:4,full?cell.height:4);gl.drawArrays(gl.TRIANGLES,0,3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(gl.getError()!==gl.NO_ERROR)throw new Error('ASCII GPU分析失败');return null;
  }
  function bind(gpu,config,glyphs){
    const gl=gpu.gl,p=gpu.program;if(!gpu.edgeState||!config.edges){gl.uniform1f(gl.getUniformLocation(p,'experimentalEdges'),0);return;}
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.edgeState.textures[4]);gl.uniform1i(gl.getUniformLocation(p,'experimentalVotes'),3);gl.uniform1f(gl.getUniformLocation(p,'experimentalEdges'),1);gl.uniform4f(gl.getUniformLocation(p,'experimentalGlyphs'),...glyphs.edges);
  }
  global.__asciiExperiment={mode:'baseline',profile,cpu,cells,gpuDirections,bind,grid:1};
})(window);
