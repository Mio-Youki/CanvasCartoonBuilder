/* ASCII mapping: Acerola-inspired luminance fill + directional edge voting.
 * Independent Canvas2D implementation; no game depth/normal buffers or font
 * binaries. Cell geometry stays floating point; only raster backing is integer.
 */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const DEFAULT_CHARS = ' .:-=+*#%@';
  const EDGE_CHARS = '—|/\\';
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const cache = new Map();
  const gpuCache = new WeakMap();
  const builtinFontFamilies = {builtin:null,'chill-16':null};
  let backend='auto',lastBackend=null,analysisBackend='auto',lastAnalysisBackend=null;
  const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment=`precision highp float;
    uniform sampler2D colors,indices,glyphs,edgeVotes;uniform float useEdgeVotes;uniform vec4 edgeGlyphs;
    uniform vec2 outputSize,cellSize,gridSize,glyphSize,drawSize,drawOffset;
    uniform float glyphCount,original;uniform vec4 foreground,background;
    void main(){vec2 p=vec2(gl_FragCoord.x,outputSize.y-gl_FragCoord.y),cell=floor(p/cellSize),uv=(cell+.5)/gridSize;
      vec4 id=texture2D(indices,uv);float index=floor(id.r*255.+.5)+floor(id.g*255.+.5)*256.;
      if(useEdgeVotes>.5){float code=floor(texture2D(edgeVotes,uv).r*255.+.5);
        float chosen=code<1.5?edgeGlyphs.x:code<2.5?edgeGlyphs.y:code<3.5?edgeGlyphs.z:edgeGlyphs.w;
        if(code>.5&&chosen>=0.)index=chosen;}
      vec2 local=(p-cell*cellSize-drawOffset)/drawSize;float mask=0.;
      if(local.x>=0.&&local.x<1.&&local.y>=0.&&local.y<1.){vec2 q=floor(local*glyphSize)+.5;
        mask=texture2D(glyphs,vec2((index*glyphSize.x+q.x)/(glyphSize.x*glyphCount),q.y/glyphSize.y)).a;}
      vec3 rgb=mix(foreground.rgb,texture2D(colors,uv).rgb,original);float fa=mask*foreground.a,ba=background.a*(1.-fa),a=fa+ba;
      gl_FragColor=vec4(a>0.?(rgb*fa+background.rgb*ba)/a:vec3(0.),a*id.b);
    }`;
  function gpuRenderer(surfaces) {
    if(gpuCache.has(surfaces))return gpuCache.get(surfaces);
    const target=canvas(1,1),gl=target.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});
    const unavailable=()=>{gpuCache.set(surfaces,null);surfaces.onClear?.(()=>gpuCache.delete(surfaces));return null;};
    if(!gl)return unavailable();
    const shaders=[],textures=[];let program=null,buffer=null;
    try{
      const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
      program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      for(let i=0;i<3;i++){const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);}
      const gpu={canvas:target,gl,program,textures,buffer,location,atlas:null,glyphTextures:new Map(),glyphTexture:textures[2]};gpuCache.set(surfaces,gpu);
      surfaces.onClear?.(()=>{api.modules.asciiGpuAnalysis.dispose(gpu);textures.forEach(texture=>gl.deleteTexture(texture));gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();gpuCache.delete(surfaces);});
      return gpu;
    }catch(error){
      textures.forEach(texture=>gl.deleteTexture(texture));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();return unavailable();
    }finally{shaders.forEach(shader=>gl.deleteShader(shader));}
  }
  function paintGpu(output,surfaces,grid,colors,indices,glyphs,geometry,edgeVotes) {
    const gpu=gpuRenderer(surfaces);if(!gpu||gpu.gl.isContextLost())return false;
    const {gl,program,textures}=gpu;
    if(gpu.canvas.width!==output.width)gpu.canvas.width=output.width;if(gpu.canvas.height!==output.height)gpu.canvas.height=output.height;
    if(glyphs.width*glyphs.characters.length>gl.getParameter(gl.MAX_TEXTURE_SIZE))return false;
    gl.viewport(0,0,output.width,output.height);gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
    gl.enableVertexAttribArray(gpu.location);gl.vertexAttribPointer(gpu.location,2,gl.FLOAT,false,0,0);
    const upload=(unit,width,height,bytes)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,unit===2?gpu.glyphTexture:textures[unit]);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);};
    upload(0,grid.columns,grid.rows,colors);upload(1,grid.columns,grid.rows,indices);
    gl.activeTexture(gl.TEXTURE2);
    let cached=gpu.glyphTextures.get(glyphs);
    if(cached){gpu.glyphTextures.delete(glyphs);gpu.glyphTextures.set(glyphs,cached);gpu.glyphTexture=cached.texture;}
    else{
      const bytes=glyphs.width*glyphs.height*glyphs.characters.length*4;
      const used=()=>Array.from(gpu.glyphTextures.values()).reduce((sum,item)=>sum+item.bytes,0);
      while(gpu.glyphTextures.size&&(gpu.glyphTextures.size>=4||used()+bytes>4*1024*1024)){
        const oldest=gpu.glyphTextures.keys().next().value,item=gpu.glyphTextures.get(oldest);gpu.glyphTextures.delete(oldest);
        if(item.texture!==textures[2]){gl.deleteTexture(item.texture);textures.splice(textures.indexOf(item.texture),1);}
      }
      if(!Array.from(gpu.glyphTextures.values()).some(item=>item.texture===textures[2]))gpu.glyphTexture=textures[2];
      else{gpu.glyphTexture=gl.createTexture();textures.push(gpu.glyphTexture);gl.bindTexture(gl.TEXTURE_2D,gpu.glyphTexture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);}
    }
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,gpu.glyphTexture);
    if(!cached){const width=glyphs.width*glyphs.characters.length,bytes=new Uint8Array(width*glyphs.height*4),area=glyphs.width*glyphs.height;
      glyphs.characters.forEach((char,index)=>{for(let y=0;y<glyphs.height;y++)for(let x=0;x<glyphs.width;x++){const p=(y*width+index*glyphs.width+x)*4;bytes[p]=bytes[p+1]=bytes[p+2]=255;bytes[p+3]=glyphs.bytes[index*area+y*glyphs.width+x];}});
      upload(2,width,glyphs.height,bytes);gpu.glyphTextures.set(glyphs,{texture:gpu.glyphTexture,bytes:bytes.length});
    }
    ['colors','indices','glyphs'].forEach((name,index)=>gl.uniform1i(gl.getUniformLocation(program,name),index));
    const uniform=(name,...values)=>{const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]);else if(values.length===2)gl.uniform2f(location,...values);else gl.uniform4f(location,...values);};
    uniform('outputSize',output.width,output.height);uniform('cellSize',grid.cell.width,grid.cell.height);uniform('gridSize',grid.columns,grid.rows);uniform('glyphSize',glyphs.width,glyphs.height);
    uniform('glyphCount',glyphs.characters.length);uniform('drawSize',geometry.dw,geometry.dh);uniform('drawOffset',geometry.ox,geometry.oy);uniform('original',geometry.original?1:0);
    const normalized=value=>[value[0]/255,value[1]/255,value[2]/255,value[3]];
    uniform('foreground',...normalized(geometry.foreground));uniform('background',...normalized(geometry.background));
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,edgeVotes||textures[1]);
    gl.uniform1i(gl.getUniformLocation(program,'edgeVotes'),3);
    uniform('useEdgeVotes',edgeVotes?1:0);uniform('edgeGlyphs',...glyphs.edges);
    gl.drawArrays(gl.TRIANGLES,0,3);if(gl.getError()!==gl.NO_ERROR)return false;
    const ctx=output.getContext('2d');ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(gpu.canvas,0,0);return true;
  }
  // Original, small 5x7 masks in an 8x8 cell, not third-party font binaries.
  const bitmap = {
    ' ':['00000'], '.':['00000','00000','00000','00000','00000','00100','00100'],
    ':':['00000','00100','00100','00000','00100','00100','00000'],
    '-':['00000','00000','00000','11111'], '=':['00000','00000','11111','00000','11111'],
    '—':['00000000','00000000','00000000','11111111'],
    '+':['00000','00100','00100','11111','00100','00100'],
    '*':['00000','10101','01110','11111','01110','10101'],
    '#':['01010','01010','11111','01010','11111','01010','01010'],
    '%':['11001','11010','00100','00100','01000','10110','00110'],
    '@':['01110','10001','10111','10101','10111','10000','01111'],
    '|':['00100','00100','00100','00100','00100','00100','00100'],
    '/':['00001','00001','00010','00100','01000','10000','10000'],
    '\\':['10000','10000','01000','00100','00010','00001','00001'],
  };
  function chars(text) {
    const sequence = api.modules.textReveal.graphemes(String(text == null ? DEFAULT_CHARS : text));
    return Array.from(new Set(sequence.filter(char => !/[\r\n\t]/.test(char)))).slice(0, 128);
  }
  function edgeChars(config){const result=api.modules.textReveal.graphemes(config.edgeCharacters||EDGE_CHARS);if(result.length!==4)throw new Error('方向字符需要依次填写横、竖、右上斜、右下斜四个字形');return result;}
  function canvas(width, height) {
    const value = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(width, height);
    value.width = width; value.height = height; return value;
  }
  function encode(bytes) {
    let text = ''; for (const byte of bytes) text += String.fromCharCode(byte);
    return global.btoa(text);
  }
  function decode(text) { return Uint8Array.from(global.atob(text), char => char.charCodeAt(0)); }
  function needsBuiltinFont(config) {
    return config.font==='chill-16' || (config.font || 'builtin') === 'builtin' &&
      [...chars(config.characters), ...edgeChars(config)].some(char => !Object.prototype.hasOwnProperty.call(bitmap, char));
  }
  function builtinAlpha(characters, id) {
    const size=id==='chill-16'?16:8,area=size*size;
    const alpha = new Uint8Array(characters.length * area);
    const extensions = [];
    characters.forEach((char, index) => {
      if (id==='chill-16'||!Object.prototype.hasOwnProperty.call(bitmap, char)) { extensions.push({char, index}); return; }
      bitmap[char].forEach((row, y) => {
        const offset = row.length === 8 ? 0 : 1;
        for (let x = 0; x < row.length; x++) if (row[x] === '1') {
          alpha[index*area + y*size + x + offset] = 255;
        }
      });
    });
    if (!extensions.length) return alpha;
    const family=builtinFontFamilies[id];
    if (!family) throw new Error('ASCII像素字体尚未载入；请在编辑器完成字形烘焙，或提供glyphAtlas');
    const scratch = canvas(size, size), ctx = scratch.getContext('2d');
    ctx.font = `${size}px "${family}"`; ctx.textAlign = id==='builtin'?'left':'center'; ctx.textBaseline = 'alphabetic';
    // Chromium's white-text contrast boost closes tiny counters at 8px.
    // Bake neutral black coverage; only Alpha is retained, never ink RGB.
    ctx.fillStyle = id==='builtin'?'#000000':'#ffffff';
    const metrics = ctx.measureText('国Ag');
    const ascent = finite(metrics.fontBoundingBoxAscent, size-2), descent = finite(metrics.fontBoundingBoxDescent, 2);
    const baseline = Math.round((size - ascent - descent)/2 + ascent);
    for (const {char, index} of extensions) {
      ctx.clearRect(0, 0, size, size);
      // Fit unusually long graphemes by their advance, never a tight ink box.
      const advance=ctx.measureText(char).width,scale = Math.min(1, size / Math.max(1, advance));
      ctx.save(); ctx.translate(id==='builtin'?Math.round((size-advance*scale)/2):size/2, size/2); ctx.scale(scale, scale); ctx.fillText(char, 0, baseline-size/2); ctx.restore();
      const pixels = ctx.getImageData(0, 0, size, size).data;
      // The 7px outlines have fractional contour edges. Snap coverage to the
      // native pixel grid rather than retaining browser antialias fringes.
      for (let i = 0; i < area; i++) alpha[index*area + i] = id==='builtin'?(pixels[i*4+3]>=128?255:0):pixels[i*4 + 3];
    }
    return alpha;
  }
  function prepare(config, family) {
    const characters = Array.from(new Set([...chars(config.characters), ...edgeChars(config)]));
    if (!characters.length) throw new Error('ASCII 至少需要一个可显示字符');
    const id=config.font||'builtin',builtin = id==='builtin'||id==='chill-16';
    let width = id==='chill-16'?16:8, height = width, alpha;
    if (builtin) {
      alpha = builtinAlpha(characters,id);
    } else {
      const measure = canvas(1, 1).getContext('2d');
      measure.font = `24px ${family || 'monospace'}`;
      width = Math.ceil(Math.max(1, ...characters.map(char => measure.measureText(char).width))) + 4;
      height = 32;
      const surface = canvas(width * characters.length, height), ctx = surface.getContext('2d');
      ctx.font = measure.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      characters.forEach((char, index) => ctx.fillText(char, width * (index + .5), height * .5));
      const pixels = ctx.getImageData(0, 0, surface.width, height).data;
      alpha = new Uint8Array(width * height * characters.length);
      for (let index = 0; index < characters.length; index++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
        alpha[(index * height + y) * width + x] = pixels[(y * surface.width + index * width + x) * 4 + 3];
    }
    return { version:1, font:config.font || 'builtin', characters, width, height, alpha:encode(alpha) };
  }
  function atlas(config) {
    const provided = config.glyphAtlas;
    const key = JSON.stringify([provided, config.font, config.characters, config.edgeCharacters]);
    if (cache.has(key)) return cache.get(key);
    const data = provided || prepare(config), bytes = decode(data.alpha);
    if (data.version !== 1 || !Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1 ||
      data.width > 128 || data.height > 128 || !Array.isArray(data.characters) || data.characters.length > 256 ||
      bytes.length !== data.width * data.height * data.characters.length) throw new Error('ASCII 字形图集无效');
    const fill = chars(config.characters), area = data.width * data.height;
    const entries = data.characters.map((char, index) => {
      let coverage = 0; for (let i = index * area; i < (index + 1) * area; i++) coverage += bytes[i];
      return { char, index, density:coverage / (255 * area) };
    });
    const ramp = entries.filter(entry => fill.includes(entry.char)).sort((a, b) => a.density - b.density);
    if (!ramp.length) throw new Error('ASCII 字形图集与字符集不匹配，请重新选择字体');
    const low = ramp[0].density, span = ramp[ramp.length - 1].density - low, lut = new Uint16Array(256);
    for (let level = 0; level < 256; level++) {
      const target = low + level / 255 * span;
      lut[level] = ramp.reduce((best, entry) => Math.abs(entry.density - target) < Math.abs(best.density - target) ? entry : best, ramp[0]).index;
    }
    const edges = edgeChars(config).map(char => entries.find(entry => entry.char === char)?.index ?? -1);
    const result = { ...data, bytes, ramp, lut, edges };
    cache.set(key, result); if (cache.size > 12) cache.delete(cache.keys().next().value);
    return result;
  }
  function geometry(config, grid, glyphs) {
    const width = Math.max(1, Math.round(finite(config.size, 8))) * Math.max(1, grid);
    const ratio = Math.max(.1, finite(config.glyphRatio, glyphs.width / glyphs.height));
    return { width, height:width / ratio };
  }
  function rgba(text, opacity) {
    let raw = String(text || '#ffffff').replace('#', '');
    if (raw.length === 3 || raw.length === 4) raw = [...raw].map(char => char + char).join('');
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(raw)) raw = 'ffffff';
    return [0, 2, 4].map(index => parseInt(raw.slice(index, index + 2), 16)).concat((raw.length === 8 ? parseInt(raw.slice(6), 16) / 255 : 1) * clamp(finite(opacity, 1), 0, 1));
  }
  function apply(source, config, surfaces, frame, grid) {
    const glyphs = atlas(config), cell = geometry(config, grid || 1, glyphs);
    const columns = Math.ceil(source.width / cell.width), rows = Math.ceil(source.height / cell.height);
    if (columns * rows > 1000000) throw new Error('ASCII 单元过密，请增大相对尺寸');
    const edge = config.edges === true, detail = edge ? 4 : 1, analysis = surfaces.acquire(columns * detail, rows * detail),alphaSurface=surfaces.acquire(columns,rows);
    const output = surfaces.acquire(source.width, source.height);
    // Shared by CPU and GPU: the glyph renderer stays background-independent.
    // Blend only the transparent character layer over the actual current input.
    const finish=()=>{
      if(!config.originalBackground)return output;
      const composite=surfaces.acquire(source.width,source.height),ctx=composite.getContext('2d');
      try{
        ctx.clearRect(0,0,composite.width,composite.height);ctx.drawImage(source,0,0);
        ctx.globalCompositeOperation=api.modules.blend.toCanvas(config.blend||'normal');
        ctx.drawImage(output,0,0);ctx.globalCompositeOperation='source-over';
        surfaces.release(output);return composite;
      }catch(error){ctx.globalCompositeOperation='source-over';surfaces.release(composite);throw error;}
    };
    try {
      const ctx = analysis.getContext('2d'); ctx.clearRect(0, 0, analysis.width, analysis.height); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(source, 0, 0, source.width / cell.width * detail, source.height / cell.height * detail);
      const pixels = ctx.getImageData(0, 0, analysis.width, analysis.height).data;
      const alphaCtx=alphaSurface.getContext('2d');alphaCtx.clearRect(0,0,columns,rows);alphaCtx.imageSmoothingEnabled=false;alphaCtx.drawImage(source,0,0,columns,rows);
      const alphaPixels=alphaCtx.getImageData(0,0,columns,rows).data;
      let edgeVotes=null;
      if(edge&&backend!=='cpu'&&analysisBackend!=='cpu')try{
        const gpu=gpuRenderer(surfaces);
        edgeVotes=api.modules.asciiGpuAnalysis.analyze(gpu,pixels,analysis.width,analysis.height,columns,rows,config,source.width/cell.width*detail,source.height/cell.height*detail);
      }catch(error){/* Optional acceleration: keep the CPU output path available. */}
      let directionsByCell = edge&&!edgeVotes ? api.modules.asciiAnalysis.directions(pixels, analysis.width, analysis.height, columns, rows, config,source.width/cell.width*detail,source.height/cell.height*detail,surfaces) : null;
      lastAnalysisBackend=edge?(edgeVotes?'gpu':'cpu'):'none';
      const out = output.getContext('2d');
      const foreground = rgba(config.color || '#ffffff', config.colorAlpha), background = rgba(config.background || '#000000', config.originalBackground?0:config.backgroundAlpha);
      const stretch = config.stretch === true, scale = Math.min(cell.width / glyphs.width, cell.height / glyphs.height);
      const dw = stretch ? cell.width : glyphs.width * scale, dh = stretch ? cell.height : glyphs.height * scale;
      const ox = (cell.width - dw) / 2, oy = (cell.height - dh) / 2, area = glyphs.width * glyphs.height;
      let {colors,indices}=api.modules.asciiAnalysis.cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directionsByCell,surfaces);
      if(backend!=='cpu')try{if(paintGpu(output,surfaces,{columns,rows,cell},colors,indices,glyphs,{dw,dh,ox,oy,foreground,background,original:config.colorMode==='original'},edgeVotes)){lastBackend='gpu';surfaces.notePixels?.(analysis.width,analysis.height,1);surfaces.notePixels?.(columns,rows,1);return finish();}if(backend==='gpu')throw new Error('ASCII WebGL 不可用');}catch(error){if(backend==='gpu')throw error;}
      // A context may be lost after analysis succeeded. Rebuild CPU directions
      // before fallback, rather than drawing luminance-only glyphs for that frame.
      if(edgeVotes){
        directionsByCell=api.modules.asciiAnalysis.directions(pixels,analysis.width,analysis.height,columns,rows,config,source.width/cell.width*detail,source.height/cell.height*detail,surfaces);
        ({colors,indices}=api.modules.asciiAnalysis.cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directionsByCell,surfaces));lastAnalysisBackend='cpu';
      }
      lastBackend='cpu';const image=out.createImageData(source.width,source.height),to=image.data;
      for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
        const index=(row*columns+column)*4,alpha=indices[index+2]/255;if(!alpha)continue;
        const glyph=indices[index]+indices[index+1]*256,rgb=config.colorMode==='original'?colors.subarray(index,index+3):foreground;
        // Pixel centers determine membership in floating-point cells. Do not
        // round each cell boundary independently (that creates seams/drift).
        const x0 = Math.max(0, Math.ceil(column * cell.width - .5)), x1 = Math.min(source.width, Math.ceil((column + 1) * cell.width - .5));
        const y0 = Math.max(0, Math.ceil(row * cell.height - .5)), y1 = Math.min(source.height, Math.ceil((row + 1) * cell.height - .5));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const u = (x + .5 - column * cell.width - ox) / dw, v = (y + .5 - row * cell.height - oy) / dh;
          const mask = u >= 0 && u < 1 && v >= 0 && v < 1 ? glyphs.bytes[glyph * area + Math.floor(v * glyphs.height) * glyphs.width + Math.floor(u * glyphs.width)] / 255 : 0;
          const fa = mask * foreground[3], ba = background[3] * (1 - fa), a = fa + ba, p = (y * source.width + x) * 4;
          if (a) { to[p] = (rgb[0] * fa + background[0] * ba) / a; to[p+1] = (rgb[1] * fa + background[1] * ba) / a; to[p+2] = (rgb[2] * fa + background[2] * ba) / a; }
          to[p+3] = a * alpha * 255;
        }
      }
      out.putImageData(image, 0, 0); surfaces.notePixels?.(analysis.width, analysis.height, 1);surfaces.notePixels?.(columns,rows,1); surfaces.notePixels?.(source.width, source.height, 1);
      return finish();
    } catch (error) { surfaces.release(output); throw error; }
    finally { surfaces.release(analysis);surfaces.release(alphaSurface); }
  }
  api.modules.ascii = Object.freeze({ apply, prepare, atlas, geometry, chars, defaults:{characters:DEFAULT_CHARS, edgeCharacters:EDGE_CHARS},
    needsBuiltinFont,setBuiltinFont(family,id='builtin'){builtinFontFamilies[id]=family||null;},
    setBackend(value){backend=['auto','cpu','gpu'].includes(value)?value:'auto';},getLastBackend(){return lastBackend;},
    setAnalysisBackend(value){analysisBackend=value==='cpu'?'cpu':'auto';},getLastAnalysisBackend(){return lastAnalysisBackend;},
    analysisStatus(surfaces){const gpu=gpuCache.get(surfaces),state=gpu?.analysis;return Object.freeze({active:!!state,reason:gpu?.analysisFailure||null,contextLost:!!gpu?.gl.isContextLost(),textureBytes:state?state.width*state.height*28+state.columns*state.rows*4:0});}
  });
})(typeof window !== 'undefined' ? window : globalThis);
