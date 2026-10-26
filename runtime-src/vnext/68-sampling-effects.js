/* ToSampool Runtime vNext source module: first CPU sampling primitives. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const active = (group, id) => group && group[id] && group[id].enabled ? group[id] : null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (x, y, seed, tick) => { let n = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul((seed | 0) + 1, 69069) ^ Math.imul((tick | 0) + 1, 362437)) >>> 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  const color = value => {
    const hex = String(value || '#000000').replace('#', '');
    const text = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex.padEnd(6, '0').slice(0, 6);
    return [parseInt(text.slice(0, 2), 16) || 0, parseInt(text.slice(2, 4), 16) || 0, parseInt(text.slice(4, 6), 16) || 0];
  };
  const PALETTES = Object.freeze({
    pico8: Object.freeze([[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170],[41,54,111],[43,83,120],[112,120,51],[131,143,196],[159,73,28],[83,54,32],[81,31,25],[141,135,123],[79,91,40],[87,79,74],[187,160,119],[142,154,114],[129,156,143],[105,115,98],[178,161,131],[227,204,155]]),
    nes: Object.freeze([[0,0,0],[124,124,124],[248,248,248],[252,60,48],[252,152,56],[252,252,88],[184,248,24],[88,216,84],[32,184,152],[0,136,196],[72,60,168],[168,64,208],[252,60,148],[252,152,192],[64,64,64],[188,188,188]]),
    vga: Object.freeze([[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192],[128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]]),
    gb: Object.freeze([[15,56,15],[48,98,48],[139,172,15],[155,188,15]]),
  });
  // Persist extracted palettes in the effect. RGB5 cells are only a fast-path:
  // ambiguous cells resolve the original RGB exactly instead of merging it.
  const colorMapCache = new Map(), COLOR_MAP_CACHE_LIMIT = 12, AUTO_PALETTE_SOURCE_LIMIT = 65536;
  const autoColorCount=value=>2**clamp(Math.round(Math.log2(Math.max(2,+value||16))),1,6);
  const rgb5 = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const rgb5Color = code => [((code >> 10) & 31) * 8 + 4, ((code >> 5) & 31) * 8 + 4, (code & 31) * 8 + 4];
  function sourceFingerprint(data) {
    const pixels = data.length >>> 2, stride = Math.max(1, Math.floor(pixels / 4096)); let hash = 2166136261;
    for (let pixel = 0; pixel < pixels; pixel += stride) { const i = pixel * 4; hash = Math.imul(hash ^ data[i], 16777619); hash = Math.imul(hash ^ data[i + 1], 16777619); hash = Math.imul(hash ^ data[i + 2], 16777619); hash = Math.imul(hash ^ data[i + 3], 16777619); }
    return (hash >>> 0).toString(36);
  }
  function putColorMapCache(key, value) { colorMapCache.delete(key); colorMapCache.set(key, value); if (colorMapCache.size > COLOR_MAP_CACHE_LIMIT) colorMapCache.delete(colorMapCache.keys().next().value); return value; }
  function boxStats(items) { let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0,weight=0; for (const entry of items) { const {r,g,b}=entry; if(r<minR)minR=r;if(r>maxR)maxR=r;if(g<minG)minG=g;if(g>maxG)maxG=g;if(b<minB)minB=b;if(b>maxB)maxB=b;weight+=entry.count; } return { items, minR, minG, minB, maxR, maxG, maxB, weight }; }
  function autoPalette(data, count) {
    // Bound sample count, not the first colours encountered. Cover the whole
    // image uniformly; exact RGB and frequency are retained within the sample.
    const histogram = new Map();
    const pixels=data.length>>>2,samples=Math.min(pixels,AUTO_PALETTE_SOURCE_LIMIT);
    for (let sample=0;sample<samples;sample++) {
      const i=Math.floor((sample+.5)*pixels/samples)*4;
      if (data[i+3] < 128) continue;
      const code=(data[i]<<16)|(data[i+1]<<8)|data[i+2], known=histogram.get(code);
      if (known) known.count += 1;
      else histogram.set(code,{r:data[i],g:data[i+1],b:data[i+2],count:1});
    }
    const entries=Array.from(histogram.values()).sort((a,b)=>a.r-b.r||a.g-b.g||a.b-b.b);
    if (!entries.length) return [[0,0,0]];
    const boxes=[boxStats(entries)];
    while(boxes.length<count){
      let pick=-1,score=-1;
      for(let index=0;index<boxes.length;index++){const box=boxes[index],range=Math.max(box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB),next=range*box.weight;if(box.items.length>1&&next>score){score=next;pick=index;}}
      if(pick<0)break;
      const box=boxes[pick],ranges=[box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB],channel=ranges.indexOf(Math.max(...ranges)),items=box.items.slice().sort((a,b)=>(channel===0?a.r-b.r:channel===1?a.g-b.g:a.b-b.b)||a.r-b.r||a.g-b.g||a.b-b.b),half=box.weight/2;
      let cumulative=0,split=1; for(;split<items.length;split++){cumulative+=items[split-1].count;if(cumulative>=half)break;}
      split=Math.min(items.length-1,split); // A dominant last colour must not create an empty box.
      boxes.splice(pick,1,boxStats(items.slice(0,split)),boxStats(items.slice(split)));
    }
    return boxes.map(box=>{let r=0,g=0,b=0,total=0;for(const entry of box.items){r+=entry.r*entry.count;g+=entry.g*entry.count;b+=entry.b*entry.count;total+=entry.count;}return [Math.round(r/total),Math.round(g/total),Math.round(b/total)];});
  }
  function paletteLut(palette){return {palette,lut:new Uint8Array(32768),status:new Uint8Array(32768),exact:new Map()};}
  function paletteIndex(mapped,r,g,b){
    const {palette,lut,status,exact}=mapped,code=rgb5(r,g,b);
    if(!status[code]){
      const [cr,cg,cb]=rgb5Color(code);let best=0,distance=Infinity;
      for(let i=0;i<palette.length;i++){const p=palette[i],d=(cr-p[0])**2+(cg-p[1])**2+(cb-p[2])**2;if(d<distance){distance=d;best=i;}}
      const winner=palette[best];let safe=true;
      for(let i=0;i<palette.length;i++){if(i===best)continue;const p=palette[i],margin=(cr-p[0])**2+(cg-p[1])**2+(cb-p[2])**2-distance,variation=8*(Math.abs(p[0]-winner[0])+Math.abs(p[1]-winner[1])+Math.abs(p[2]-winner[2]));if(margin<=variation){safe=false;break;}}
      lut[code]=best;status[code]=safe?1:2;
    }
    if(status[code]===1)return lut[code];
    const rgb=(r<<16)|(g<<8)|b,known=exact.get(rgb);if(known!==undefined)return known;
    let best=0,distance=Infinity;for(let i=0;i<palette.length;i++){const p=palette[i],d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;if(d<distance){distance=d;best=i;}}
    if(exact.size<4096)exact.set(rgb,best);return best;
  }
  function extractedPalette(config){
    const value=config.extracted,limit=autoColorCount(config.colors);
    if(!value||value.colors!==limit||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>limit)return null;
    if(value.entries.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isInteger(v)||v<0||v>255)))return null;
    return value.entries;
  }
  function mappedPalette(data, config) {
    const selected = config.palette === 'none' ? 'auto' : config.palette || 'auto', colors=autoColorCount(config.colors), named=Array.isArray(selected)?selected:PALETTES[selected];
    if (selected !== 'auto' && !named) throw new Error(`未知调色板：${selected}`);
    const fixed=selected==='auto'&&extractedPalette(config);
    const key = named ? `named:${Array.isArray(selected) ? JSON.stringify(selected) : selected}` : fixed?`fixed:${JSON.stringify(fixed)}`:`auto:${colors}:${sourceFingerprint(data)}`;
    const cached=colorMapCache.get(key); if(cached){colorMapCache.delete(key);colorMapCache.set(key,cached);return cached;}
    const palette=(named||fixed)?(named||fixed).map(entry=>entry.slice()):autoPalette(data,colors);
    return putColorMapCache(key,paletteLut(palette));
  }
  // Sampling grid is a real, visible nearest-neighbour resample pass.  It is
  // deliberately not merely a coordinate controller: this is the v4 form of
  // Legacy's pixelDiv contract and the common low-resolution work surface for
  // boil / halftone / uneven sampling.
  const gridSize = group => Math.max(1, Math.round(+((group && group.controllers && group.controllers['sampling-grid'] || {}).size || 1)));
  const gridAlphaMode = group => ((group && group.controllers && group.controllers['sampling-grid'] || {}).alphaMode || 'keep');
  const hasBaseGrid = group => gridSize(group) > 1 || gridAlphaMode(group) !== 'keep';
  const tickAt = (config, time) => {
    const motion = config.motion || {};
    if (!motion.enabled) return 0;
    const period = Math.max(.001, +motion.period || 1), steps = Math.max(1, Math.round(+motion.steps || 12));
    return Math.floor(time / period * steps);
  };
  function withPixels(source, surfaces, transform) {
    const input = source.getContext('2d'), output = surfaces.acquire(source.width, source.height), out = output.getContext('2d');
    let from, to;
    try { from = input.getImageData(0, 0, source.width, source.height); to = out.getImageData(0, 0, source.width, source.height); }
    catch (error) { surfaces.release(output); throw new Error(`采样读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    if(surfaces.notePixels)surfaces.notePixels(source.width,source.height,1);transform(from.data, to.data, source.width, source.height);
    out.putImageData(to, 0, 0); return output;
  }
  function remapEdgeAlpha(data, mode) {
    if (mode !== 'remove' && mode !== 'boost') return data;
    for (let i = 3; i < data.length; i += 4) {
      const value = data[i];
      data[i] = mode === 'remove' ? (value >= 128 ? 255 : 0) : (value > 0 ? 255 : 0);
    }
    return data;
  }
  function edgeAlpha(source, group, surfaces) {
    const mode = gridAlphaMode(group);
    if (mode === 'keep') return source;
    return withPixels(source, surfaces, (from, to) => { to.set(from); remapEdgeAlpha(to, mode); });
  }
  function colorMap(source, config, surfaces, time, frame) {
    if(config.mode==='gradient'){
      const paint=api.modules.paint.normalize(config.gradient)||{type:'linear',stops:[{offset:0,color:'#000000',alpha:1},{offset:1,color:'#ffffff',alpha:1}]},key='ramp:'+JSON.stringify(paint.stops),lut=colorMapCache.get(key)||putColorMapCache(key,api.modules.paint.ramp(paint));
      return withPixels(source,surfaces,(from,to)=>{
        for(let i=0;i<from.length;i+=4){
          const at=Math.round(from[i]*.2126+from[i+1]*.7152+from[i+2]*.0722)*4;
          to[i]=lut[at];to[i+1]=lut[at+1];to[i+2]=lut[at+2];to[i+3]=from[i+3]*lut[at+3]/255;
        }
      });
    }
    // Every discrete count is a real reduction; no special original-colour bypass.
    return withPixels(source, surfaces, (from, to) => {
      const request=frame&&frame.paletteCapture,target=frame&&frame.paletteTarget,capture=request&&target&&request.scope===target.scope&&request.ownerId===target.ownerId;
      const mapped=capture?paletteLut(autoPalette(from,autoColorCount(config.colors))):mappedPalette(from,config),palette=mapped.palette;
      if(capture)request.receive({colors:autoColorCount(config.colors),entries:palette.map(p=>p.slice())});
      for (let i = 0; i < from.length; i += 4) {
        const best=palette[paletteIndex(mapped,from[i],from[i+1],from[i+2])];
        to[i] = best[0]; to[i + 1] = best[1]; to[i + 2] = best[2];
        to[i + 3] = from[i + 3];
      }
    });
  }
  function threshold(source, config, surfaces, time) {
    const dark = color(config.dark), light = color(config.light), motion = config.motion || {},pulse = motion.enabled ? (+motion.amount || 0) * api.modules.motion.oscillate(motion,time,{stepped:true,frames:12}) : 0;
    const pivot = clamp((config.threshold==null?.5:+config.threshold) + pulse, 0, 1) * 255;
    return withPixels(source, surfaces, (from, to) => {
      for (let i = 0; i < from.length; i += 4) { const luma = from[i] * .2126 + from[i + 1] * .7152 + from[i + 2] * .0722, pick = luma >= pivot ? light : dark; to[i] = pick[0]; to[i + 1] = pick[1]; to[i + 2] = pick[2]; to[i + 3] = from[i + 3]; }
    });
  }
  function noiseDither(source, config, surfaces, time) {
    const amount=clamp(+config.amount||0,0,100);
    if(!amount)return source;
    const size=Math.max(1,Math.min(16,Math.round(+config.size||1))),seed=Math.round(+config.seed||0),rgb=config.colorMode==='rgb',motion=config.motion||{},period=Math.max(.001,+motion.period||1),steps=Math.max(1,Math.min(120,Math.round(+motion.steps||12))),phase=((time/period)%1+1)%1,tick=motion.enabled&&motion.type==='noise-refresh'?Math.min(steps-1,Math.floor(phase*steps)):0,amplitude=amount*2.55;
    return withPixels(source,surfaces,(from,to,width,height)=>{
      const cells=Math.ceil(width/size),channels=rgb?3:1,row=new Uint8Array(cells*channels);
      let previous=-1;
      for(let y=0;y<height;y++){
        const cellY=Math.floor(y/size);
        if(cellY!==previous){
          previous=cellY;
          let state=(Math.imul(seed+1,0x9e3779b1)^Math.imul(tick+1,0x85ebca6b)^Math.imul(cellY+1,0xc2b2ae35))>>>0;
          if(!state)state=1;
          for(let i=0;i<row.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;row[i]=state&255;}
        }
        for(let x=0;x<width;x++){
          const at=(y*width+x)*4,cell=Math.floor(x/size)*channels;
          if(from[at+3]===0){to[at]=from[at];to[at+1]=from[at+1];to[at+2]=from[at+2];to[at+3]=0;continue;}
          const red=(row[cell]/127.5-1)*amplitude,green=rgb?(row[cell+1]/127.5-1)*amplitude:red,blue=rgb?(row[cell+2]/127.5-1)*amplitude:red;
          to[at]=clamp(from[at]+red,0,255);to[at+1]=clamp(from[at+1]+green,0,255);to[at+2]=clamp(from[at+2]+blue,0,255);to[at+3]=from[at+3];
        }
      }
    });
  }
  /* RGB channel separation belongs to the sampled image, not to the object
     transform.  It reads a small neighbourhood only around detected edges,
     letting transparent capsules gain a coloured fringe without turning the
     full object into three displaced copies. */
  function edgeDispersion(source, config, surfaces) {
    const distance=Math.max(0,Math.round(+config.distance||0)),strength=clamp(config.strength==null?1:+config.strength,0,1);
    if(!distance||!strength)return source;
    const radians=(+config.angle||0)*Math.PI/180,dx=Math.round(Math.cos(radians)*distance),dy=Math.round(Math.sin(radians)*distance);
    if(!dx&&!dy)return source;
    const mode=config.source||'auto',reach=Math.max(1,distance+Math.max(1,Math.round(+config.width||1))-1),order=config.order||'rgb';
    return withPixels(source,surfaces,(from,to,width,height)=>{
      const pixel=(x,y)=>x<0||y<0||x>=width||y>=height?null:(y*width+x)*4;
      const luma=index=>from[index]*.2126+from[index+1]*.7152+from[index+2]*.0722;
      const edgeAt=(x,y,index)=>{
        const alpha=from[index+3],lum=luma(index);let alphaEdge=false,contrastEdge=false;
        for(const [ox,oy] of [[-reach,0],[reach,0],[0,-reach],[0,reach]]){const next=pixel(x+ox,y+oy);const nextAlpha=next==null?0:from[next+3];if(Math.abs(alpha-nextAlpha)>8)alphaEdge=true;if(next!=null&&Math.abs(lum-luma(next))>24)contrastEdge=true;}
        return mode==='contour'?alphaEdge:mode==='contrast'?contrastEdge:alphaEdge||contrastEdge;
      };
      to.set(from);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const at=(y*width+x)*4;if(!edgeAt(x,y,at))continue;
        const plus=pixel(x+dx,y+dy),minus=pixel(x-dx,y-dy),redAt=order==='bgr'?minus:plus,blueAt=order==='bgr'?plus:minus,baseAlpha=from[at+3],redAlpha=redAt==null?0:from[redAt+3],blueAlpha=blueAt==null?0:from[blueAt+3],red=redAlpha?from[redAt]:0,green=from[at+1],blue=blueAlpha?from[blueAt+2]:0,nextAlpha=Math.max(baseAlpha,redAlpha,blueAlpha);
        to[at]=Math.round(from[at]+(red-from[at])*strength);to[at+1]=green;to[at+2]=Math.round(from[at+2]+(blue-from[at+2])*strength);to[at+3]=Math.round(baseAlpha+(nextAlpha-baseAlpha)*strength);
      }
    });
  }
  /* Every owner reaches the sampling stage as a prepared high-resolution
     capsule: image, text, vector and builtin content therefore share one
     source-sampling implementation.  Legacy's single source-window crop is
     useful for a bitmap frame, but becomes a visible one-way zoom when used
     on a transparent object capsule.  v4 therefore makes several centred
     source samples before reduction, then picks a candidate per sample cell.
     The result is true pixel boil rather than an enlarged-block translation. */
  function boilFrame(config, controllers, time) {
    const type = config && (config.type || 'boil');
    if (type !== 'boil') return null;
    const grid = Math.max(1, Math.round(+((controllers && controllers['sampling-grid'] || {}).size || 1)));
    if (grid < 2) return null;
    const boil = config.boil || {}, motion = config.motion || {}, bias = Math.round(clamp(+(boil.bias == null ? 1 : boil.bias), 0, grid - 1));
    if (!bias) return null;
    const enabled = motion.enabled !== false, rate = Math.max(.05, +(motion.frequency == null ? 4 : motion.frequency)), phase = enabled ? Math.max(0, +time || 0) * rate : 0, tick = Math.floor(phase), fraction = phase - tick, drift = motion.type === 'sampling-drift';
    return { bias, coverage:clamp(+(boil.coverage == null ? .3 : boil.coverage),0,1), seed:+config.seed || 1, tick, fraction, drift, mode:drift ? 'drift' : 'step', edge:Object.assign({mode:'off',width:1},config.edge||{}) };
  }
  function boilOffset(config, controllers, time) {
    const frame=boilFrame(config,controllers,time);if(!frame)return null;
    // Public helper / diagnostics: one centred candidate, not the final
    // per-cell choice.  Integer coordinates avoid soft sub-pixel filtering.
    const axis=salt=>Math.round((hash(salt,0,frame.seed,frame.tick)*2-1)*frame.bias);
    return { x:axis(17), y:axis(53), bias:frame.bias, mode:frame.mode };
  }
  function boilProtected(base,width,height,x,y,frame){
    const guard=Math.max(1,Math.round(+frame.edge.width||1));
    if(x<guard||y<guard||x>=width-guard||y>=height-guard)return true;
    const mode=frame.edge.mode||'off';if(mode==='off')return false;
    const at=(xx,yy)=>base[(yy*width+xx)*4+3],alpha=at(x,y);
    if(mode==='interior')return alpha>=254;
    // contour: retain partially transparent cells and the one-cell Alpha
    // transition around them, leaving the opaque interior free to boil.
    if(alpha<254)return true;
    for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(at(xx,yy)!==alpha)return true;
    return false;
  }
  function boilChoice(frame,x,y){
    // Centre is deliberately dominant.  A full per-cell replacement makes
    // the frame read as a violent mosaic; the coverage gate makes this a
    // controlled, sparse pixel boil instead.
    const at=tick=>hash(x,y,frame.seed+41,tick)>=frame.coverage?0:1+Math.floor(hash(x,y,frame.seed,tick)*4)%4;
    const left=at(frame.tick);if(!frame.drift)return left;
    const right=at(frame.tick+1),threshold=hash(x,y,frame.seed+97,frame.tick);
    // A temporal dither changes cells gradually without blending colours or
    // creating a global slide direction.
    return threshold<frame.fraction?right:left;
  }
  function boilWork(source,width,height,frame,surfaces){
    const inset=frame.bias;if(source.width<=inset*2||source.height<=inset*2)return null;
    const directions=[[0,0],[-inset,0],[inset,0],[0,-inset],[0,inset]],samples=[];
    try{
      for(const [dx,dy] of directions){const canvas=surfaces.acquire(width,height),ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,inset+dx,inset+dy,source.width-inset*2,source.height-inset*2,0,0,width,height);samples.push(canvas);}
      const images=samples.map(canvas=>canvas.getContext('2d').getImageData(0,0,width,height)),output=surfaces.acquire(width,height),ctx=output.getContext('2d'),base=images[0].data,result=ctx.getImageData(0,0,width,height),to=result.data;
      if(surfaces.notePixels)surfaces.notePixels(width,height,images.length+1);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=(y*width+x)*4,from=images[boilProtected(base,width,height,x,y,frame)?0:boilChoice(frame,x,y)].data;to[offset]=from[offset];to[offset+1]=from[offset+1];to[offset+2]=from[offset+2];to[offset+3]=from[offset+3];}
      ctx.putImageData(result,0,0);return output;
    }catch(error){return null;}finally{for(const canvas of samples)surfaces.release(canvas);}
  }
  function breathFrame(config,controllers,time){
    const type=config&&(config.type||'boil');if(type!=='breath')return null;
    const grid=Math.max(1,Math.round(+((controllers&&controllers['sampling-grid']||{}).size||1)));if(grid<2)return null;
    // Pixel breath deliberately preserves Legacy's fractional source-window
    // phase.  Unlike boil's integer neighbour candidates, the fractional
    // resize causes individual low-resolution cells to cross a source-pixel
    // threshold at slightly different moments.
    const breath=config.breath||{},motion=config.motion||{},bias=clamp(+(breath.bias==null?.1:breath.bias),0,grid-1);if(!bias)return null;
    const enabled=motion.enabled!==false,rate=Math.max(.05,+(motion.frequency==null?4:motion.frequency)),phase=enabled?Math.max(0,+time||0)*rate:0,tick=Math.floor(phase),fraction=phase-tick,drift=motion.type==='sampling-drift';
    return {bias,seed:+config.seed||1,tick,fraction,drift,edge:Object.assign({mode:'off'},breath.edge||{})};
  }
  function breathOffset(frame,tick){
    const smooth=value=>value*value*(3-value*2),mix=frame.drift?smooth(frame.fraction):0;
    const axis=salt=>{const a=hash(salt,0,frame.seed,tick),b=hash(salt,0,frame.seed,tick+1);return(a+(b-a)*mix)*frame.bias;};
    return {x:axis(127),y:axis(251)};
  }
  function breathProtected(base,width,height,x,y,frame){
    if((frame.edge&&frame.edge.mode)!=='contour')return false;
    const at=(xx,yy)=>base[(yy*width+xx)*4+3],alpha=at(x,y);if(alpha<254)return true;
    for(let yy=Math.max(0,y-1);yy<=Math.min(height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x+1);xx++)if(at(xx,yy)!==alpha)return true;
    return false;
  }
  function breathWork(source,width,height,frame,surfaces){
    const amount=frame.bias;if(source.width<=amount||source.height<=amount)return null;
    const offset=breathOffset(frame,frame.tick),output=surfaces.acquire(width,height),ctx=output.getContext('2d');let baseline=null;
    try{
      ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
      // This is intentionally the old source-window formula: the window has
      // width - amount, while its fractional origin travels inside amount.
      ctx.drawImage(source,offset.x,offset.y,source.width-amount,source.height-amount,0,0,width,height);
      if((frame.edge&&frame.edge.mode)!=='contour')return output;
      baseline=surfaces.acquire(width,height);const baseCtx=baseline.getContext('2d');baseCtx.clearRect(0,0,width,height);baseCtx.imageSmoothingEnabled=false;baseCtx.drawImage(source,0,0,width,height);
      const base=baseCtx.getImageData(0,0,width,height),result=ctx.getImageData(0,0,width,height),from=base.data,to=result.data;
      if(surfaces.notePixels)surfaces.notePixels(width,height,2);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(breathProtected(from,width,height,x,y,frame)){const at=(y*width+x)*4;to[at]=from[at];to[at+1]=from[at+1];to[at+2]=from[at+2];to[at+3]=from[at+3];}
      ctx.putImageData(result,0,0);return output;
    }catch(error){surfaces.release(output);return null;}finally{if(baseline)surfaces.release(baseline);}
  }
  function offsetSampling(source, config, controllers, surfaces, time) {
    const type = config.type || config.mode || 'boil';
    // Boil and breath are consumed by apply() while the source is still high-resolution.
    // Keeping this no-op prevents a second low-resolution crop after sampling.
    if (type === 'boil' || type === 'breath') return source;
    const bands = config.bands || {}, motion = config.motion || {}, rate = Math.max(.05, +(motion.frequency == null ? 4 : motion.frequency)), phase = motion.enabled === false ? 0 : Math.max(0, +time || 0) * rate, tick = Math.floor(phase), fraction = phase - tick, drift = motion.type === 'sampling-drift', seed = +config.seed || 1;
    const orientation = bands.orientation || 'horizontal', count = Math.max(0, Math.round(+(bands.count == null ? 6 : bands.count))), thickness = Math.max(1, Math.round(+(bands.thickness == null ? bands.width || 3 : bands.thickness))), amount = Math.max(0, +(bands.offset == null ? config.amount || 0 : bands.offset)), channels = bands.channels || 'combined';
    if (!count || !amount) return source;
    return withPixels(source, surfaces, (from, to, width, height) => {
      to.set(from);
      const smooth = value => value * value * (3 - 2 * value), blend = drift ? smooth(fraction) : 0, valueAt = (index, salt) => { const a = hash(index, salt, seed, tick), b = hash(index, salt, seed, tick + 1); return a + (b - a) * blend; };
      const span = orientation === 'horizontal' ? height : width, copyBand = (start, size, shift, channel) => {
        for (let cross = 0; cross < size; cross++) for (let along = 0; along < (orientation === 'horizontal' ? width : height); along++) {
          const x = orientation === 'horizontal' ? along : start + cross, y = orientation === 'horizontal' ? start + cross : along;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const sx = clamp(Math.round(x + (orientation === 'horizontal' ? shift : 0)), 0, width - 1), sy = clamp(Math.round(y + (orientation === 'vertical' ? shift : 0)), 0, height - 1), at = (y * width + x) * 4, sourceAt = (sy * width + sx) * 4;
          if (channel == null) { to[at] = from[sourceAt]; to[at + 1] = from[sourceAt + 1]; to[at + 2] = from[sourceAt + 2]; }
          else to[at + channel] = from[sourceAt + channel];
        }
      };
      for (let index = 0; index < count; index++) {
        const start = Math.floor(valueAt(index, 11) * Math.max(1, span - thickness)), shift = Math.round((valueAt(index, 23) * 2 - 1) * amount);
        if (channels === 'rgb') for (let channel = 0; channel < 3; channel++) copyBand(start, thickness, shift + Math.round((channel - 1) * amount / 3), channel);
        else copyBand(start, thickness, shift, null);
      }
    });
  }
  const halftonePlans=new Map();
  // 网点映射不再维护第二套“间距”。size 表示共享采样格的倍数：
  // grid=2、size=4 时，一个印刷单元就是输出上的 8×8 像素。
  function halftonePlan(width,height,cell,angle,rowOffset){
    const key=[width,height,cell,angle,rowOffset].join('|');if(halftonePlans.has(key))return halftonePlans.get(key);
    const cx=width/2,cy=height/2,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>{const dx=x-cx,dy=y-cy;return[dx*cos+dy*sin,-dx*sin+dy*cos];}),xs=corners.map(point=>point[0]),ys=corners.map(point=>point[1]),minX=Math.floor(Math.min(...xs)/cell)*cell-cell,maxX=Math.ceil(Math.max(...xs)/cell)*cell+cell,minY=Math.floor(Math.min(...ys)/cell)*cell-cell,maxY=Math.ceil(Math.max(...ys)/cell)*cell+cell,points=[];
    // Keep lattice centers as floats. Rounding each rotated center created
    // alternating gaps at 45°, which nearest-neighbour enlargement exposed.
    for(let ly=minY;ly<=maxY;ly+=cell){
      const row=Math.round(ly/cell),shift=Math.abs(row%2)*rowOffset*cell;
      for(let lx=minX;lx<=maxX;lx+=cell){const localX=lx+shift,x=cx+localX*cos-ly*sin,y=cy+localX*sin+ly*cos;if(x>=-cell&&y>=-cell&&x<=width+cell&&y<=height+cell)points.push({x,y});}
    }
    const plan=Object.freeze({points:Object.freeze(points),cos,sin});halftonePlans.set(key,plan);if(halftonePlans.size>24)halftonePlans.delete(halftonePlans.keys().next().value);return plan;
  }
  function appendDot(path,x,y,radius,shape,rotation){
    if(shape==='circle'){path.moveTo(x+radius,y);path.arc(x,y,radius,0,Math.PI*2);return;}
    const count=shape==='triangle'?3:shape==='square'?4:shape==='hexagon'?6:5,base=(shape==='square'?Math.PI/4:-Math.PI/2)+(rotation||0),scale=shape==='square'?Math.SQRT2:1;
    for(let index=0;index<count;index++){const theta=base+index/count*Math.PI*2,px=x+Math.cos(theta)*radius*scale,py=y+Math.sin(theta)*radius*scale;if(index)path.lineTo(px,py);else path.moveTo(px,py);}path.closePath();
  }
  function paintHalftonePath(ctx,marks,color,append){
    const Path=global.Path2D,chunk=12000;ctx.fillStyle=color;
    if(typeof Path!=='function'){ctx.beginPath();for(const mark of marks)append(ctx,mark);ctx.fill();return;}
    for(let start=0;start<marks.length;start+=chunk){const path=new Path();for(let index=start;index<Math.min(marks.length,start+chunk);index++)append(path,marks[index]);ctx.fill(path);}
  }
  function halftoneColour(red,green,blue){
    // Halftone Factory's important distinction: a mark owns one sampled
    // colour, rather than revealing a multicolour patch of the source image.
    // 3 bits per RGB channel gives at most 512 Path2D batches, keeping a
    // photographic source responsive while still retaining recognisable hue.
    const r=(red>>5)*32+16,g=(green>>5)*32+16,b=(blue>>5)*32+16;return`rgb(${r} ${g} ${b})`;
  }
  function paintHalftoneColourBatches(ctx,marks,shape,rotation){
    const batches=new Map();for(const mark of marks){let batch=batches.get(mark.colour);if(!batch){batch=[];batches.set(mark.colour,batch);}batch.push(mark);}
    for(const [colour,batch] of batches)paintHalftonePath(ctx,batch,colour,(path,mark)=>appendDot(path,mark.x,mark.y,mark.radius,shape,rotation));
  }
  function cssColour(rgb){return`rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;}
  function halftoneGradient(dark,light,luma){
    const t=Math.round(clamp(luma,0,1)*255)/255;
    return cssColour([0,1,2].map(channel=>Math.round(dark[channel]*(1-t)+light[channel]*t)));
  }
  function samplingPadding(group){const halftone=active(group,'halftone'),dispersion=active(group,'edge-dispersion'),grid=gridSize(group),halftonePad=halftone?Math.ceil(Math.max(1,Math.round(+halftone.size||4))*grid*.52)+2:0,dispersionPad=dispersion?Math.max(0,Math.round(+dispersion.distance||0))*grid+Math.max(1,Math.round(+dispersion.width||1)):0;return Math.max(halftonePad,dispersionPad);}
  function halftone(source, config, group, surfaces, time) {
    // Halftone Factory's useful division is preserved here: first make a
    // compact brightness grid, then stamp cached geometry.  We therefore do
    // not scan a full source rectangle for every mark.
    const cell=Math.max(1,Math.round(+config.size||4)),angle=+config.angle||0,output=surfaces.acquire(source.width,source.height),ctx=output.getContext('2d'),analysis=surfaces.acquire(Math.max(1,Math.ceil(source.width/cell)),Math.max(1,Math.ceil(source.height/cell))),analysisCtx=analysis.getContext('2d');let image,coverage;
    try{
      analysisCtx.clearRect(0,0,analysis.width,analysis.height);analysisCtx.imageSmoothingEnabled=true;analysisCtx.imageSmoothingQuality='high';analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);image=analysisCtx.getImageData(0,0,analysis.width,analysis.height);
      // A second, nearest-neighbour alpha read decides whether the lattice
      // centre belongs to the object. Averaged alpha alone creates an extra
      // row of dots around a transparent capsule's bounding box.
      analysisCtx.clearRect(0,0,analysis.width,analysis.height);analysisCtx.imageSmoothingEnabled=false;analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);coverage=analysisCtx.getImageData(0,0,analysis.width,analysis.height).data;
    }catch(error){surfaces.release(analysis);surfaces.release(output);throw new Error(`网点映射读取失败：${error.message||'Canvas 可能被跨域素材污染'}`);}
    if(surfaces.notePixels)surfaces.notePixels(analysis.width,analysis.height,2);
    const data=image.data,motion=config.motion||{},drift=motion.enabled&&motion.type==='dot-drift'?api.modules.motion.oscillate(motion,time,{period:2,stepped:true,frames:12})*clamp(+motion.amount||0,0,1):0,rowOffset=clamp(config.rowOffset==null?(config.layout==='stagger'?.5:0):+config.rowOffset,0,1),plan=halftonePlan(source.width,source.height,cell,angle,rowOffset),offsetX=clamp(+config.offsetX||0,0,1)+drift,offsetY=clamp(+config.offsetY||0,0,1),dx=(plan.cos*offsetX-plan.sin*offsetY)*cell,dy=(plan.sin*offsetX+plan.cos*offsetY)*cell,shape=config.shape||'circle',threshold=clamp(config.threshold==null?.65:+config.threshold,0,1),contrast=clamp(config.contrast==null?.75:+config.contrast,.25,2),colorMode=config.colorMode||(config.duotone?'legacy-duotone':'original'),single=cssColour(color(config.singleColor||'#111827')),dark=color(config.duotoneDark||'#111827'),light=color(config.duotoneLight||'#f2e8cf'),marks=[];
    for(const point of plan.points){
      const x=point.x+dx,y=point.y+dy;
      // The lattice includes guard cells for rotated patterns. Never extend
      // edge colours by clamping an off-canvas point to the nearest pixel.
      if(x<0||y<0||x>=source.width||y>=source.height)continue;
      const ix=Math.floor(x/cell),iy=Math.floor(y/cell),at=(iy*analysis.width+ix)*4;
      if(coverage[at+3]<128)continue;
      const luma=(data[at]*.2126+data[at+1]*.7152+data[at+2]*.0722)/255;
      const strength=clamp((.5-luma)*contrast+threshold,0,1);
      const colour=colorMode==='single'?single:colorMode==='gradient'?halftoneGradient(dark,light,luma):colorMode==='legacy-duotone'?cssColour(luma>=threshold?light:dark):halftoneColour(data[at],data[at+1],data[at+2]);
      marks.push({x,y,radius:strength*cell*.52,colour});
    }
    // Alpha participates only in point admission/size.  Complete marks are
    // intentionally not clipped back to the original contour: this matches
    // print halftone edges and is why object capsules reserve sample padding.
    ctx.clearRect(0,0,source.width,source.height);if(config.originalBackground)ctx.drawImage(source,0,0);paintHalftoneColourBatches(ctx,marks.filter(mark=>mark.radius>.15),shape,angle*Math.PI/180);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;surfaces.release(analysis);return output;
  }
  function unevenSampling(source, config, controllers, surfaces, tide) {
    // The field is the effect, not an optional multiplier.  In particular,
    // an old scene with field.enabled:false must be a no-op instead of a
    // uniform maximum coarse pass.
    if (!tide || !tide.frame || !tide.frame.field || !tide.frame.field.enabled) return source;
    return withPixels(source, surfaces, (from, to, width, height) => {
      // Same field → variable cell rule as Legacy applyGrain.  It is run in
      // the low-resolution sampling work image, then enlarged once by apply.
      const amount = clamp(+tide.amount || 0, 0, 1), coarseness = Math.max(2, Math.round(+config.coarseness || 5)), span = Math.max(1, coarseness - 1);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const field = tide.frame.values[y * width + x], cell = 1 + Math.floor(clamp(field,0,1) * amount * span), sx = Math.min(width - 1, Math.floor(x / cell) * cell), sy = Math.min(height - 1, Math.floor(y / cell) * cell), fromIndex = (sy * width + sx) * 4, at = (y * width + x) * 4; to[at] = from[fromIndex]; to[at + 1] = from[fromIndex + 1]; to[at + 2] = from[fromIndex + 2]; to[at + 3] = from[fromIndex + 3]; }
    });
  }
  function applyFull(source, group, surfaces, frame) {
    let current = source, controllers = group && group.controllers || {}, tideConfig = active(group, 'uneven-sampling'), tideMotion=tideConfig&&tideConfig.motion||{},tideAnimated=!!(tideMotion.enabled&&tideMotion.type==='uneven-motion'),tidePulse=tideAnimated?(Math.sin(frame.time/Math.max(.001,+tideMotion.period||3)*Math.PI*2)+1)/2:.5,tideScale=tideAnimated?Math.max(0,1+(tidePulse-.5)*2*clamp(+tideMotion.tideAmount||0,0,1)):1,fieldConfig=tideConfig&&Object.assign({},tideConfig,{field:Object.assign({enabled:true},tideConfig.field||{}),motion:Object.assign({},tideMotion,{fieldFlow:tideAnimated&&(+tideMotion.flowSpeed||0)!==0})}),tide=tideConfig?{ frame: api.modules.field.build(source, fieldConfig, frame.time), amount:clamp((+tideConfig.amount||0)*tideScale,0,1) } : null;
    const handlers = { 'color-map': colorMap, 'noise-dither': noiseDither, threshold, 'offset-sampling': offsetSampling, halftone, 'uneven-sampling': unevenSampling, 'edge-dispersion': edgeDispersion };
    // Edge dispersion is intentionally last inside sampling: it splits the
    // final sampled picture instead of being erased by a later quantise/grid.
    for (const id of ['color-map', 'noise-dither', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling', 'edge-dispersion']) {
      const config = active(group, id); if (!config) continue;
      const handler = handlers[id]; if (!handler) throw new Error(`Runtime vNext 尚未实现采样效果：${id}`);
      const next = id === 'offset-sampling' ? handler(current, config, controllers, surfaces, frame.time) : id === 'threshold' ? handler(current, config, surfaces, frame.time) : id === 'halftone' ? handler(current, config, group, surfaces, frame.time) : id === 'uneven-sampling' ? handler(current, config, controllers, surfaces, tide) : handler(current, config, surfaces, frame.time,frame);
      if (next !== current) { if (current !== source) surfaces.release(current); current = next; }
    }
    return current;
  }
  function applyBase(source,group,surfaces,frame){
    // Preview quality is an extra transient divisor; the scene's sampling
    // grid remains a persistent, visible stage in Full and Draft previews.
    const baseGrid=gridSize(group),previewDivisor=Math.max(1,Math.round(frame&&frame.preview&&frame.preview.pixelDivMultiplier||1)),divisor=Math.max(1,baseGrid*previewDivisor);
    if(divisor===1){const edged=edgeAlpha(source,group,surfaces),sampled=applyFull(edged,group,surfaces,frame);if(sampled!==edged&&edged!==source)surfaces.release(edged);return sampled;}
    const width=Math.max(1,Math.ceil(source.width/divisor)),height=Math.max(1,Math.ceil(source.height/divisor)),work=surfaces.acquire(width,height),ctx=work.getContext('2d');
    const offset=active(group,'offset-sampling'),boil=boilFrame(offset,group&&group.controllers,frame&&frame.time),breath=breathFrame(offset,group&&group.controllers,frame&&frame.time);
    let prepared=null;
    if(boil)prepared=boilWork(source,width,height,boil,surfaces);
    else if(breath)prepared=breathWork(source,width,height,breath,surfaces);
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
    if(prepared){ctx.drawImage(prepared,0,0);surfaces.release(prepared);}
    else ctx.drawImage(source,0,0,width,height);
    const edged=edgeAlpha(work,group,surfaces),sampled=applyFull(edged,group,surfaces,frame),output=surfaces.acquire(source.width,source.height),out=output.getContext('2d');
    out.clearRect(0,0,output.width,output.height);out.imageSmoothingEnabled=false;out.drawImage(sampled,0,0,source.width,source.height);
    if(sampled!==edged&&edged!==work)surfaces.release(edged);if(sampled!==work)surfaces.release(sampled);surfaces.release(work);return output;
  }
  function apply(source,group,surfaces,frame){
    const sampled=applyBase(source,group,surfaces,frame),ascii=active(group,'ascii-mapping');
    if(!ascii)return sampled;
    // Output mappings consume the full-sized sampled capsule. Running this in
    // applyFull would apply the grid multiplier twice and pixelate glyphs again.
    try{return api.modules.ascii.apply(sampled,ascii,surfaces,frame,gridSize(group));}
    finally{if(sampled!==source)surfaces.release(sampled);}
  }
  api.modules.sampling = Object.freeze({ apply, hash, colorMap, noiseDither, autoPalette, paletteLut, paletteIndex, extractedPalette, boilOffset, edgeDispersion, remapEdgeAlpha, palettes: PALETTES, gridSize, hasBaseGrid, padding:samplingPadding });
})(typeof window !== 'undefined' ? window : globalThis);
